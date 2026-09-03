import { scrapeUrl, type ScrapeResult } from "./scrape";

export type ResearchSource = {
  url: string;
  title: string;
  description: string;
  body: string;
  imageUrl?: string | null;
  siteName: string | null;
  fetchedAt: string;
};

export type ResearchPack = {
  query: string;
  sources: ResearchSource[];
  fallback: boolean;
  error?: string;
};

const MAX_RESULTS = 6;
const MAX_SOURCES = 5;
const BLOCKED_HOST_PARTS = [
  "wowhow.cloud",
  "pinterest.",
  "reddit.com",
  "quora.com",
  "medium.com",
  "substack.com",
  "tech-insider.org",
  "lushbinary.com",
  "ai.rs",
];

function stripUrls(text: string): string {
  return text.replace(/https?:\/\/[^\s<>"')\]]+/gi, " ");
}

function stripProductionInstructions(text: string): string {
  return text
    .replace(/\b(make|turn|convert|write|produce|create|draft|summarize)\b[^.?!\n]{0,80}\b(post|caption|thread|carousel|script|linkedin|facebook|instagram|tiktok|threads)\b/gi, " ")
    .replace(/\b(linkedin|facebook|instagram|tiktok|threads|youtube|thai|english|ภาษาไทย|อังกฤษ)\b/gi, " ")
    .replace(/\b(post|caption|carousel|thread|script|copy|content)\b/gi, " ");
}

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function wordsFromUrl(rawUrl?: string): string {
  if (!rawUrl) return "";
  try {
    const url = new URL(rawUrl);
    return normalizeSpaces(
      `${url.hostname.replace(/^www\./, "").replace(/\./g, " ")} ${url.pathname
        .replace(/[-_/]+/g, " ")
        .replace(/\.[a-z0-9]+$/i, " ")}`,
    );
  } catch {
    return "";
  }
}

function hostOf(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function sourceReliabilityScore(source: ResearchSource, query: string): number {
  const host = hostOf(source.url);
  if (BLOCKED_HOST_PARTS.some((part) => host.includes(part))) return -100;
  let score = 0;
  if (/\.(gov|edu)$/i.test(host)) score += 8;
  if (
    [
      "openai.com",
      "developers.openai.com",
      "platform.openai.com",
      "anthropic.com",
      "sierra.ai",
      "youtube.com",
      "theverge.com",
      "techcrunch.com",
      "wired.com",
      "nytimes.com",
      "nbcnews.com",
      "businessinsider.com",
      "axios.com",
      "reuters.com",
      "apnews.com",
    ].some((trusted) => host === trusted || host.endsWith(`.${trusted}`))
  ) {
    score += 6;
  }
  if (source.body.length > 900) score += 2;
  if (source.description.length > 80) score += 1;
  const haystack = `${source.title} ${source.description}`.toLowerCase();
  for (const token of query.toLowerCase().split(/\W+/).filter((t) => t.length > 4)) {
    if (haystack.includes(token)) score += 0.5;
  }
  return score;
}

export function buildResearchQuery(input: {
  url?: string;
  instruction?: string;
  title: string;
  description?: string;
}): string {
  const instruction = normalizeSpaces(
    stripProductionInstructions(stripUrls(input.instruction ?? "")),
  );
  const title = normalizeSpaces(input.title);
  const description = normalizeSpaces(input.description ?? "");
  const urlWords = wordsFromUrl(input.url);
  const subjectFirst = [title, description, urlWords].filter(Boolean).join(" ");
  const base = subjectFirst || instruction;
  return base.slice(0, 180);
}

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

function extractDuckDuckGoUrl(rawHref: string): string | null {
  const decoded = decodeEntities(rawHref);
  try {
    const maybeRedirect = new URL(decoded, "https://duckduckgo.com");
    const uddg = maybeRedirect.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    if (maybeRedirect.protocol === "http:" || maybeRedirect.protocol === "https:") {
      return maybeRedirect.toString();
    }
  } catch {
    return null;
  }
  return null;
}

async function searchDuckDuckGo(query: string): Promise<string[]> {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ArutleeStudio/1.0; +https://arutlee.local)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "th-TH,th;q=0.9,en;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`);
  const html = await res.text();
  const urls: string[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && urls.length < MAX_RESULTS) {
    const found = extractDuckDuckGoUrl(match[1]);
    if (!found || seen.has(found)) continue;
    seen.add(found);
    urls.push(found);
  }
  return urls;
}

function asResearchSource(scraped: ScrapeResult): ResearchSource {
  return {
    url: scraped.url,
    title: scraped.title,
    description: scraped.description,
    body: scraped.body.slice(0, 3000),
    imageUrl: scraped.imageUrl,
    siteName: scraped.siteName,
    fetchedAt: scraped.fetchedAt,
  };
}

export async function runLightResearch(input: {
  url: string;
  title: string;
  description?: string;
  instruction?: string;
}): Promise<ResearchPack> {
  const query = buildResearchQuery(input);
  if (!query) return { query, sources: [], fallback: true, error: "empty query" };

  try {
    const originalHost = hostOf(input.url);
    const candidates = await searchDuckDuckGo(query);
    const seenHosts = new Set<string>(originalHost ? [originalHost] : []);
    const uniqueCandidates: string[] = [];
    for (const candidate of candidates) {
      if (uniqueCandidates.length >= MAX_RESULTS) break;
      const candidateHost = hostOf(candidate);
      if (!candidateHost || seenHosts.has(candidateHost)) continue;
      seenHosts.add(candidateHost);
      uniqueCandidates.push(candidate);
    }

    const settled = await Promise.allSettled(
      uniqueCandidates.map(async (candidate) => {
        const scraped = await scrapeUrl(candidate);
        const usefulText = `${scraped.title} ${scraped.description} ${scraped.body}`.trim();
        if (usefulText.length < 120) return null;
        return asResearchSource(scraped);
      }),
    );

    const sources: ResearchSource[] = [];
    for (const result of settled) {
      if (result.status !== "fulfilled" || !result.value) continue;
      sources.push(result.value);
    }
    const scored = sources
      .map((source) => ({ source, score: sourceReliabilityScore(source, query) }))
      .filter((item) => item.score > -50);
    const hasTrustedSources = scored.some((item) => item.score >= 6);
    const ranked = scored
      .filter((item) => !hasTrustedSources || item.score >= 6)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SOURCES)
      .map((item) => item.source);

    return {
      query,
      sources: ranked,
      fallback: ranked.length === 0,
      error: ranked.length === 0 ? "no readable research sources found" : undefined,
    };
  } catch (err) {
    return {
      query,
      sources: [],
      fallback: true,
      error: (err as Error).message,
    };
  }
}
