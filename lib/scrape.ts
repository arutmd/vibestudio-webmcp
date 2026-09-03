// Minimal HTML extraction. We avoid pulling in cheerio/jsdom to keep the
// dependency surface small. Good enough for blog posts, YouTube watch pages
// (we get the og:title + og:description), Twitter web cards, and most articles.
// The AI summarization step downstream tolerates noisy input.
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type ScrapeResult = {
  url: string;
  title: string;
  description: string;
  body: string;
  imageUrl: string | null;
  siteName: string | null;
  contentType: string;
  fetchedAt: string;
};

const MAX_BYTES = 2_000_000; // 2 MB cap; abort if larger
const TIMEOUT_MS = 12_000;
const YT_DLP_TIMEOUT_MS = 45_000;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCharCode(parseInt(n, 16)));
}

function metaContent(html: string, name: string): string | null {
  // Match <meta property="og:title" content="..."> in any attribute order.
  const re = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${name}["'][^>]*?content\\s*=\\s*["']([^"']*)["']|<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]*?(?:property|name)\\s*=\\s*["']${name}["']`,
    "i",
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1] ?? m[2] ?? "").trim() : null;
}

function extractTitle(html: string): string {
  return (
    metaContent(html, "og:title") ??
    metaContent(html, "twitter:title") ??
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ??
    ""
  ).slice(0, 300);
}

function extractDescription(html: string): string {
  return (
    metaContent(html, "og:description") ??
    metaContent(html, "twitter:description") ??
    metaContent(html, "description") ??
    ""
  ).slice(0, 600);
}

function extractImage(base: URL, html: string): string | null {
  const raw =
    metaContent(html, "og:image") ?? metaContent(html, "twitter:image") ?? null;
  if (!raw) return null;
  try {
    return new URL(raw, base).toString();
  } catch {
    return raw;
  }
}

function extractSiteName(html: string): string | null {
  return metaContent(html, "og:site_name") ?? null;
}

function stripTagsToText(html: string): string {
  const text = decodeEntities(html.replace(/<[^>]+>/g, " "));
  return text
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractBodyText(html: string): string {
  // Pull <article>, <main>, or fall back to <body>.
  const sectionMatch =
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ??
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ??
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const inner = sectionMatch?.[1] ?? html;
  // Strip script/style/nav/footer/aside.
  const stripped = inner
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ");
  // Replace block tags with newlines so paragraph breaks survive.
  const withBreaks = stripped.replace(/<\/(p|div|li|h[1-6]|br|tr|td|section|article)>/gi, "\n");
  // Strip remaining tags.
  const text = stripTagsToText(withBreaks);
  // Collapse whitespace.
  return text.slice(0, 80_000);
}

function youtubeVideoId(url: URL): string | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? null;
  if (!host.endsWith("youtube.com")) return null;
  if (url.pathname === "/watch") return url.searchParams.get("v");
  const parts = url.pathname.split("/").filter(Boolean);
  if (["shorts", "embed", "live"].includes(parts[0])) return parts[1] ?? null;
  return null;
}

function readBalancedJsonArray(source: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

function extractCaptionTracks(html: string): { baseUrl: string; languageCode?: string }[] {
  const key = '"captionTracks":';
  const start = html.indexOf(key);
  if (start < 0) return [];
  const raw = readBalancedJsonArray(html, start + key.length);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { baseUrl?: string; languageCode?: string }[];
    return parsed.filter((t): t is { baseUrl: string; languageCode?: string } => !!t.baseUrl);
  } catch {
    return [];
  }
}

function transcriptFromJson3(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      events?: { segs?: { utf8?: string }[] }[];
    };
    return (
      parsed.events
        ?.flatMap((e) => e.segs ?? [])
        .map((s) => s.utf8 ?? "")
        .join("")
        .replace(/\s+/g, " ")
        .trim() ?? ""
    );
  } catch {
    return "";
  }
}

function cleanTranscript(text: string): string {
  return text
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function transcriptFromXml(raw: string): string {
  return stripTagsToText(raw).replace(/\s+/g, " ").trim();
}

async function fetchYouTubeTimedText(watchHtml: string): Promise<string> {
  const tracks = extractCaptionTracks(watchHtml);
  const preferred =
    tracks.find((t) => t.languageCode?.startsWith("en")) ?? tracks[0] ?? null;
  if (!preferred) return "";
  for (const suffix of ["&fmt=json3", ""]) {
    try {
      const res = await fetch(`${preferred.baseUrl}${suffix}`, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept-Language": "en-US,en;q=0.9,th;q=0.8",
        },
      });
      if (!res.ok) continue;
      const raw = await res.text();
      const transcript = suffix ? transcriptFromJson3(raw) : transcriptFromXml(raw);
      if (transcript.length > 500) return transcript;
    } catch {
      // Try the next transcript path.
    }
  }
  return "";
}

function extractNextFlightText(html: string): string {
  const parts: string[] = [];
  for (const match of html.matchAll(/self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)/g)) {
    try {
      parts.push(JSON.parse(`"${match[1]}"`) as string);
    } catch {
      // Ignore malformed chunks.
    }
  }
  return stripTagsToText(parts.join("\n"));
}

async function fetchYouTubeTranscriptFallback(videoId: string): Promise<string> {
  const url = `https://summarizeyoutubevideo.com/video/${videoId}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,th;q=0.8",
    },
  });
  if (!res.ok) return "";
  const html = await res.text();
  const text = extractNextFlightText(html) || extractBodyText(html);
  const transcriptStart = text.search(/\b\d+:[A-Za-z0-9_-]+,\s/);
  const transcript =
    transcriptStart >= 0 ? text.slice(transcriptStart).replace(/\b\d+:[A-Za-z0-9_-]+,\s*/g, " ") : text;
  return transcript.replace(/\s+/g, " ").trim();
}

async function fetchYouTubeTranscriptWithYtDlp(url: URL): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "arutlee-ytdlp-"));
  try {
    const outputBase = path.join(tempDir, "transcript.%(ext)s");
    const result = await runCommand(
      "yt-dlp",
      [
        "--skip-download",
        "--write-subs",
        "--write-auto-subs",
        "--sub-lang",
        "en,en-US,en-orig",
        "--sub-format",
        "json3",
        "-o",
        outputBase,
        url.toString(),
      ],
      YT_DLP_TIMEOUT_MS,
    );
    if (result.code !== 0) return "";

    const files = await fs.readdir(tempDir);
    const json3File = files.find((file) => file.endsWith(".json3"));
    if (!json3File) return "";
    const raw = await fs.readFile(path.join(tempDir, json3File), "utf8");
    return cleanTranscript(transcriptFromJson3(raw));
  } catch {
    return "";
  } finally {
    fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

function runCommand(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
    }, timeoutMs);

    proc.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-4000);
    });
    proc.on("error", () => {
      clearTimeout(timer);
      resolve({ code: -1, stderr });
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stderr });
    });
  });
}

async function fetchYouTubeOembed(url: URL): Promise<{
  title: string;
  author: string;
  thumbnail: string | null;
}> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url.toString())}&format=json`,
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`oEmbed HTTP ${res.status}`);
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    return {
      title: data.title ?? "",
      author: data.author_name ?? "YouTube",
      thumbnail: data.thumbnail_url ?? null,
    };
  } catch {
    return { title: "", author: "YouTube", thumbnail: null };
  }
}

async function scrapeYouTubeUrl(url: URL, videoId: string): Promise<ScrapeResult> {
  const meta = await fetchYouTubeOembed(url);
  const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,th;q=0.8",
    },
  });
  const watchHtml = watchRes.ok ? await watchRes.text() : "";
  const directTranscript = watchHtml ? await fetchYouTubeTimedText(watchHtml) : "";
  const ytDlpTranscript =
    directTranscript.length > 500 ? "" : await fetchYouTubeTranscriptWithYtDlp(url);
  const fallbackTranscript =
    directTranscript.length > 500 || ytDlpTranscript.length > 500
      ? ""
      : await fetchYouTubeTranscriptFallback(videoId);
  const transcript =
    directTranscript.length > 500
      ? directTranscript
      : ytDlpTranscript.length > 500
      ? ytDlpTranscript
      : fallbackTranscript.length > 500
      ? fallbackTranscript
      : "";
  const title = meta.title || (watchHtml ? extractTitle(watchHtml) : "") || videoId;
  const description =
    (watchHtml ? extractDescription(watchHtml) : "") ||
    `YouTube video by ${meta.author}. ${
      transcript ? "Transcript extracted for Arutlee capture." : "Transcript unavailable."
    }`;

  return {
    url: url.toString(),
    title,
    description,
    body: transcript
      ? `YouTube transcript for "${title}" by ${meta.author}:\n\n${transcript}`.slice(0, 100_000)
      : `${title}\n\n${description}`,
    imageUrl: meta.thumbnail || (watchHtml ? extractImage(url, watchHtml) : null),
    siteName: "YouTube",
    contentType: transcript ? "text/youtube-transcript" : "text/youtube-summary",
    fetchedAt: new Date().toISOString(),
  };
}

// SSRF guard. Reject anything that resolves to a private/loopback range or
// uses a non-http(s) scheme. We do a hostname-shape check; this isn't a full
// DNS-rebinding defense but it stops the obvious cases.
function checkSafeUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "Invalid URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: `Only http(s) URLs are allowed, got ${url.protocol}` };
  }
  const host = url.hostname.toLowerCase();
  const banned = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "169.254.169.254", // AWS metadata
    "metadata.google.internal",
  ];
  if (banned.includes(host)) return { ok: false, error: `Refusing to fetch ${host}` };
  // RFC 1918 private ranges + link-local.
  if (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^fe80:/i.test(host) ||
    /^fc00:/i.test(host)
  ) {
    return { ok: false, error: `Refusing to fetch private-range host ${host}` };
  }
  return { ok: true, url };
}

export async function scrapeUrl(rawUrl: string): Promise<ScrapeResult> {
  const guard = checkSafeUrl(rawUrl);
  if (!guard.ok) throw new Error(guard.error);
  const url = guard.url;
  const videoId = youtubeVideoId(url);
  if (videoId) return scrapeYouTubeUrl(url, videoId);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ArutleeStudio/1.0; +https://github.com/anthropics/claude-code)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "th-TH,th;q=0.9,en;q=0.8",
      },
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url.host}`);
  const contentType = res.headers.get("content-type") ?? "";
  // Read with size cap.
  const reader = res.body?.getReader();
  if (!reader) {
    return {
      url: url.toString(),
      title: "",
      description: "",
      body: "",
      imageUrl: null,
      siteName: null,
      contentType,
      fetchedAt: new Date().toISOString(),
    };
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
      break;
    }
    chunks.push(value);
  }
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  const html = buf.toString("utf8");

  return {
    url: url.toString(),
    title: extractTitle(html),
    description: extractDescription(html),
    body: extractBodyText(html),
    imageUrl: extractImage(url, html),
    siteName: extractSiteName(html),
    contentType,
    fetchedAt: new Date().toISOString(),
  };
}
