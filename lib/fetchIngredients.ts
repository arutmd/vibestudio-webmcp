import type { ScrapeCaptureResult } from "./capture";
import { callClaude, resolveEngine, safeJSON } from "./claude";
import { firewallVerdict, runFirewall } from "./firewall";
import { buildImageSearchQuery, findRelatedImages } from "./images";
import { scrapePrompt, SYSTEM_BRIEF } from "./prompts";
import { runLightResearch, type ResearchSource } from "./research";
import { scrapeUrl, type ScrapeResult } from "./scrape";

function manualTitle(text: string): string {
  const firstLine = text
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean);
  return (firstLine || "Manual source").slice(0, 120);
}

function manualScrape(text: string): ScrapeResult {
  const title = manualTitle(text);
  return {
    url: "manual://source",
    title,
    description: "User-provided source text.",
    body: text,
    imageUrl: null,
    siteName: "Manual capture",
    contentType: "text/plain",
    fetchedAt: new Date().toISOString(),
  };
}

const MIN_PRIMARY_SOURCE_CHARS = 1_500;
const TRUSTED_PRIMARY_HOSTS = [
  "anthropic.com",
  "openai.com",
  "developers.openai.com",
  "platform.openai.com",
  "theverge.com",
  "techcrunch.com",
  "businessinsider.com",
  "axios.com",
  "reuters.com",
  "apnews.com",
];

function hostOf(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function sourceHostScore(source: ResearchSource): number {
  const host = hostOf(source.url);
  if (!host) return 0;
  const trustedIndex = TRUSTED_PRIMARY_HOSTS.findIndex(
    (trusted) => host === trusted || host.endsWith(`.${trusted}`),
  );
  return trustedIndex >= 0 ? 100 - trustedIndex : 0;
}

export function selectPrimaryResearchSource(
  sources: ResearchSource[],
): ResearchSource | null {
  const ranked = sources
    .filter((source) => source.body.trim().length >= MIN_PRIMARY_SOURCE_CHARS)
    .map((source, index) => ({
      source,
      score: sourceHostScore(source) + Math.min(source.body.length / 250, 20) - index,
    }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.source ?? null;
}

async function promoteResearchSourceToScrape(
  source: ResearchSource,
): Promise<ScrapeResult> {
  try {
    const scraped = await scrapeUrl(source.url);
    if (scraped.body.trim().length >= source.body.trim().length) return scraped;
  } catch {
    // Use the research scrape below.
  }
  return {
    url: source.url,
    title: source.title,
    description: source.description,
    body: source.body,
    imageUrl: source.imageUrl ?? null,
    siteName: source.siteName,
    contentType: "text/research-primary",
    fetchedAt: source.fetchedAt,
  };
}

export async function fetchIngredientCapture(input: {
  url?: string;
  text: string;
}): Promise<ScrapeCaptureResult & { firewall_reasons?: string[]; image_query?: string }> {
  let scraped: ScrapeResult;
  let scrapeError: string | undefined;
  if (input.url) {
    try {
      scraped = await scrapeUrl(input.url);
    } catch (err) {
      scrapeError = (err as Error).message;
      const url = new URL(input.url);
      scraped = {
        url: url.toString(),
        title:
          url.pathname
            .split("/")
            .filter(Boolean)
            .pop()
            ?.replace(/[-_]+/g, " ")
            .slice(0, 300) || url.hostname,
        description: "",
        body: input.text,
        imageUrl: null,
        siteName: url.hostname,
        contentType: "text/plain",
        fetchedAt: new Date().toISOString(),
      };
    }
  } else {
    scraped = manualScrape(input.text);
  }

  const fw = runFirewall(`${scraped.title}\n${scraped.description}\n${scraped.body}`);
  const fwVerdict = firewallVerdict(fw);
  const fwRisk: "clear" | "near_miss" | "blocked" =
    fwVerdict === "fail" ? "blocked" : fwVerdict === "near_miss" ? "near_miss" : "clear";

  let summary = "";
  let researchSummary = "";
  let suggestedFormat = "field_note";
  let hookCandidates: string[] = [];
  let topicGuess: string | null = null;
  let keyClaims: string[] = [];
  let aiFallback = false;

  const researchPack = await runLightResearch({
    url: scraped.url,
    title: scraped.title,
    description: scraped.description,
    instruction: input.text,
  });
  if (!input.url && scraped.body.trim().length < MIN_PRIMARY_SOURCE_CHARS) {
    const primarySource = selectPrimaryResearchSource(researchPack.sources);
    if (primarySource) {
      scraped = await promoteResearchSourceToScrape(primarySource);
    }
  }
  const imageQuery = buildImageSearchQuery({
    title: scraped.title,
    description: scraped.description,
    instruction: input.text,
    researchQuery: researchPack.query,
  });
  const imagePack = await findRelatedImages({
    query: imageQuery,
    sourceImageUrl: scraped.imageUrl,
    sourceTitle: scraped.title,
    sourceUrl: input.url,
    researchImages: researchPack.sources.map((source) => ({
      imageUrl: source.imageUrl,
      title: source.title,
      sourceUrl: source.url,
      siteName: source.siteName,
    })),
  });

  const engine = await resolveEngine();
  if (
    engine.engine !== "none" &&
    (scraped.body.length > 60 || researchPack.sources.length > 0 || input.text)
  ) {
    try {
      const text = await callClaude({
        system: SYSTEM_BRIEF,
        cacheSystem: true,
        messages: [
          {
            role: "user",
            content: scrapePrompt({
              url: scraped.url,
              title: scraped.title,
              text: scraped.body,
              instruction: input.text,
              research: researchPack.sources,
            }),
          },
        ],
        maxTokens: 1200,
      });
      const parsed = safeJSON<{
        summary: string;
        research_summary?: string;
        key_claims?: string[];
        suggested_format?: string;
        firewall_risk?: string;
        topic_id_guess?: string | null;
        hook_candidates?: string[];
      }>(text, { summary: "" });
      summary = parsed.summary || scraped.description;
      researchSummary = parsed.research_summary || "";
      suggestedFormat = parsed.suggested_format || "field_note";
      hookCandidates = parsed.hook_candidates ?? [];
      topicGuess = parsed.topic_id_guess ?? null;
      keyClaims = parsed.key_claims ?? [];
    } catch {
      aiFallback = true;
      summary = scraped.description || scraped.body.slice(0, 320);
    }
  } else {
    aiFallback = engine.engine === "none";
    summary = scraped.description || scraped.body.slice(0, 320);
  }

  return {
    scraped,
    scrape_error: scrapeError,
    summary,
    research_summary: researchSummary,
    research_query: researchPack.query,
    research: researchPack.sources,
    research_fallback: researchPack.fallback,
    research_error: researchPack.error,
    image_query: imagePack.query,
    image_candidates: imagePack.images,
    image_error: imagePack.error,
    key_claims: keyClaims,
    suggested_format: suggestedFormat,
    firewall_risk: fwRisk,
    firewall_reasons: fw.map((h) => `[${h.severity}] ${h.reason}`),
    topic_id_guess: topicGuess,
    hook_candidates: hookCandidates,
    fallback: aiFallback,
  };
}
