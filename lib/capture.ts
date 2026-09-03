import type {
  CaptureImageCandidate,
  CaptureIngredients,
  InboxRecord,
} from "./types";
import { recommendPlatforms } from "./platformFit";
import type { ResearchSource } from "./research";

export type ScrapeCaptureResult = {
  scraped: {
    url: string;
    title: string;
    description: string;
    body: string;
    imageUrl?: string | null;
    siteName?: string | null;
    contentType?: string;
  };
  scrape_error?: string;
  summary?: string;
  key_claims?: string[];
  firewall_risk: "clear" | "near_miss" | "blocked";
  suggested_format?: string;
  topic_id_guess?: string | null;
  hook_candidates?: string[];
  research?: ResearchSource[];
  research_query?: string;
  research_summary?: string;
  research_fallback?: boolean;
  research_error?: string;
  image_query?: string;
  image_candidates?: CaptureImageCandidate[];
  image_error?: string;
  fallback?: boolean;
};

const URL_RE = /https?:\/\/[^\s<>"')\]]+/i;

function isTranscriptContentType(contentType?: string): boolean {
  return !!contentType && /\btranscript\b/i.test(contentType);
}

export function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_RE);
  if (!match) return null;
  return match[0].replace(/[.,;:!?]+$/g, "");
}

export function guessSourceFromUrl(url: string): InboxRecord["source"] {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("youtube") || host.includes("youtu.be")) return "youtube";
    if (host.includes("linkedin")) return "linkedin";
    if (host.includes("facebook") || host.includes("fb.")) return "facebook";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("tiktok")) return "tiktok";
    return "web";
  } catch {
    return "web";
  }
}

export function buildSmartCaptureRaw(
  originalText: string,
  data: ScrapeCaptureResult,
): string {
  const sourceText = data.scraped.body?.trim() ?? "";
  const parts = [
    `Palm capture / instruction:\n${originalText.trim()}`,
    sourceText
      ? `Source ${isTranscriptContentType(data.scraped.contentType) ? "transcript" : "text"}:\n${sourceText.slice(0, 80_000)}`
      : "",
    data.summary ? `Scraped source summary:\n${data.summary.trim()}` : "",
    data.scrape_error ? `Original source fetch note:\n${data.scrape_error}` : "",
    data.key_claims?.length
      ? `Key claims to verify:\n${data.key_claims.map((c) => `- ${c}`).join("\n")}`
      : "",
    data.hook_candidates?.length
      ? `Possible hooks:\n${data.hook_candidates.map((h) => `- ${h}`).join("\n")}`
      : "",
    data.research_summary ? `Light web research:\n${data.research_summary.trim()}` : "",
    data.research?.length
      ? `Research sources:\n${data.research
          .map((s, i) => `${i + 1}. ${s.title || s.url}\n   ${s.url}`)
          .join("\n")}`
      : "",
    data.image_candidates?.length
      ? `Related image ingredients:\n${data.image_candidates
          .slice(0, 5)
          .map((img, i) => {
            const source = img.sourceUrl ? `\n   source: ${img.sourceUrl}` : "";
            const thumb = img.thumbnailUrl ? `\n   thumbnail: ${img.thumbnailUrl}` : "";
            return `${i + 1}. ${img.title || img.source || "Image candidate"}\n   image: ${img.url}${thumb}${source}`;
          })
          .join("\n")}`
      : "",
    data.image_error ? `Image search note:\n${data.image_error}` : "",
  ].filter(Boolean);

  return parts.join("\n\n");
}

export function buildCaptureIngredients(
  data: ScrapeCaptureResult,
): CaptureIngredients {
  const sourceText = data.scraped.body?.trim() ?? "";
  return {
    source_title: data.scraped.title,
    source_site: data.scraped.siteName ?? null,
    source_text: sourceText.slice(0, 100_000),
    source_text_chars: sourceText.length,
    source_text_kind: isTranscriptContentType(data.scraped.contentType)
      ? "transcript"
      : sourceText
      ? "article"
      : "unknown",
    summary: data.summary,
    research_query: data.research_query,
    image_query: data.image_query,
    research_summary: data.research_summary,
    research_sources: data.research?.map((s) => ({
      url: s.url,
      title: s.title,
      description: s.description,
      siteName: s.siteName,
      imageUrl: s.imageUrl,
      fetchedAt: s.fetchedAt,
    })),
    image_candidates: data.image_candidates?.slice(0, 5),
    platform_recommendations: recommendPlatforms({
      title: data.scraped.title,
      summary: data.summary || data.research_summary,
      sourceText: sourceText,
      sourceKind: isTranscriptContentType(data.scraped.contentType)
        ? "transcript"
        : sourceText
        ? "article"
        : "unknown",
      imageCandidates: data.image_candidates,
    }),
    key_claims: data.key_claims,
    hook_candidates: data.hook_candidates,
  };
}

export function buildSmartCaptureNotes(data: ScrapeCaptureResult): string {
  const bits = [
    "auto-detected URL",
    data.suggested_format ? `suggested ${data.suggested_format}` : "",
    data.topic_id_guess ? `topic ${data.topic_id_guess}` : "",
    data.research?.length ? `researched ${data.research.length} sources` : "",
    data.image_candidates?.length ? `${data.image_candidates.length} image candidates` : "",
    data.research_fallback ? "research partial" : "",
    data.fallback ? "AI summary fallback" : "",
    data.scraped.title ? `source: ${data.scraped.title}` : "",
  ].filter(Boolean);

  return bits.join(" · ");
}
