import type { CaptureImageCandidate } from "./types";

export type ImageSearchPack = {
  query: string;
  images: CaptureImageCandidate[];
  error?: string;
};

const DEFAULT_MAX_IMAGES = 5;
const ABSOLUTE_MAX_IMAGES = 12;

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
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
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) =>
      String.fromCharCode(parseInt(n, 16)),
    );
}

function hostOf(rawUrl?: string | null): string {
  if (!rawUrl) return "";
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isUsableImageUrl(rawUrl?: string | null): rawUrl is string {
  if (!rawUrl) return false;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url.pathname) || url.hostname.length > 0;
  } catch {
    return false;
  }
}

function addUnique(
  images: CaptureImageCandidate[],
  candidate: CaptureImageCandidate,
  limit = DEFAULT_MAX_IMAGES,
) {
  if (images.length >= limit) return;
  if (!isUsableImageUrl(candidate.url)) return;
  const key = candidate.url.replace(/^https?:\/\//, "").replace(/[?#].*$/, "");
  if (images.some((img) => img.url.replace(/^https?:\/\//, "").replace(/[?#].*$/, "") === key)) {
    return;
  }
  images.push(candidate);
}

function extractVqd(html: string): string | null {
  const match =
    html.match(/vqd=["']?([\d-]+)["']?/) ??
    html.match(/"vqd":"([^"]+)"/) ??
    html.match(/vqd=([\d-]+)&/);
  return match?.[1] ?? null;
}

async function searchDuckDuckGoImages(query: string): Promise<CaptureImageCandidate[]> {
  const landing = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ArutleeStudio/1.0; +https://arutlee.local)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "th-TH,th;q=0.9,en;q=0.8",
      },
    },
  );
  if (!landing.ok) throw new Error(`Image search failed: HTTP ${landing.status}`);
  const html = await landing.text();
  const vqd = extractVqd(html);
  if (!vqd) throw new Error("Image search token not found");

  const api = new URL("https://duckduckgo.com/i.js");
  api.searchParams.set("l", "us-en");
  api.searchParams.set("o", "json");
  api.searchParams.set("q", query);
  api.searchParams.set("vqd", vqd);
  api.searchParams.set("f", ",,,,,");
  api.searchParams.set("p", "1");

  const res = await fetch(api.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json,text/javascript,*/*;q=0.8",
      Referer: `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
    },
  });
  if (!res.ok) throw new Error(`Image result fetch failed: HTTP ${res.status}`);
  const data = (await res.json()) as {
    results?: {
      image?: string;
      thumbnail?: string;
      title?: string;
      url?: string;
      source?: string;
      width?: number;
      height?: number;
    }[];
  };

  const images: CaptureImageCandidate[] = [];
  for (const item of data.results ?? []) {
    addUnique(images, {
      url: item.image ?? "",
      thumbnailUrl: item.thumbnail ?? null,
      title: item.title ? decodeEntities(item.title) : undefined,
      sourceUrl: item.url,
      source: hostOf(item.url) || item.source,
      width: item.width,
      height: item.height,
    }, ABSOLUTE_MAX_IMAGES);
    if (images.length >= ABSOLUTE_MAX_IMAGES) break;
  }
  return images;
}

export function buildImageSearchQuery(input: {
  title: string;
  description?: string;
  instruction?: string;
  researchQuery?: string;
}): string {
  const base =
    input.researchQuery ||
    [input.title, input.description, input.instruction]
      .filter(Boolean)
      .join(" ")
      .replace(/https?:\/\/[^\s<>"')\]]+/gi, " ");
  return normalizeSpaces(base).slice(0, 140);
}

export async function findRelatedImages(input: {
  query: string;
  sourceImageUrl?: string | null;
  sourceTitle?: string;
  sourceUrl?: string;
  maxImages?: number;
  researchImages?: {
    imageUrl?: string | null;
    title?: string;
    sourceUrl?: string;
    siteName?: string | null;
  }[];
}): Promise<ImageSearchPack> {
  const images: CaptureImageCandidate[] = [];
  const limit = Math.max(1, Math.min(ABSOLUTE_MAX_IMAGES, input.maxImages ?? DEFAULT_MAX_IMAGES));
  addUnique(images, {
    url: input.sourceImageUrl ?? "",
    thumbnailUrl: input.sourceImageUrl ?? null,
    title: input.sourceTitle ? `${input.sourceTitle} source image` : "Source image",
    sourceUrl: input.sourceUrl,
    source: hostOf(input.sourceUrl),
  }, limit);
  for (const source of input.researchImages ?? []) {
    addUnique(images, {
      url: source.imageUrl ?? "",
      thumbnailUrl: source.imageUrl ?? null,
      title: source.title ? `${source.title} research image` : "Research image",
      sourceUrl: source.sourceUrl,
      source: source.siteName || hostOf(source.sourceUrl),
    }, limit);
  }

  if (!input.query) return { query: input.query, images };

  try {
    const searched = await searchDuckDuckGoImages(input.query);
    for (const image of searched) addUnique(images, image, limit);
    if (images.length < limit) {
      const broaderQuery = input.query.split(/\s+/).slice(0, 8).join(" ");
      if (broaderQuery && broaderQuery !== input.query) {
        const broader = await searchDuckDuckGoImages(broaderQuery);
        for (const image of broader) addUnique(images, image, limit);
      }
    }
    return { query: input.query, images: images.slice(0, limit) };
  } catch (err) {
    return {
      query: input.query,
      images: images.slice(0, limit),
      error: (err as Error).message,
    };
  }
}
