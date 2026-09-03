import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl, type ScrapeResult } from "@/lib/scrape";
import { runFirewall, firewallVerdict } from "@/lib/firewall";
import { callClaude, resolveEngine, safeJSON } from "@/lib/claude";
import { scrapePrompt, SYSTEM_BRIEF } from "@/lib/prompts";
import { runLightResearch } from "@/lib/research";
import { buildImageSearchQuery, findRelatedImages } from "@/lib/images";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { url?: string; instruction?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  let scraped: ScrapeResult;
  let scrapeError: string | undefined;
  try {
    scraped = await scrapeUrl(body.url);
  } catch (err) {
    scrapeError = (err as Error).message;
    const url = new URL(body.url);
    scraped = {
      url: url.toString(),
      title: url.pathname
        .split("/")
        .filter(Boolean)
        .pop()
        ?.replace(/[-_]+/g, " ")
        .slice(0, 300) || url.hostname,
      description: "",
      body: "",
      imageUrl: null,
      siteName: url.hostname,
      contentType: "",
      fetchedAt: new Date().toISOString(),
    };
  }

  // Rule-based firewall pre-scan on the scraped text.
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
    instruction: body.instruction,
  });
  const imageQuery = buildImageSearchQuery({
    title: scraped.title,
    description: scraped.description,
    instruction: body.instruction,
    researchQuery: researchPack.query,
  });
  const imagePack = await findRelatedImages({
    query: imageQuery,
    sourceImageUrl: scraped.imageUrl,
    sourceTitle: scraped.title,
    sourceUrl: scraped.url,
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
    (scraped.body.length > 60 || researchPack.sources.length > 0 || !!body.instruction)
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
              instruction: body.instruction,
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
    } catch (err) {
      aiFallback = true;
      summary = scraped.description || scraped.body.slice(0, 320);
    }
  } else {
    aiFallback = engine.engine === "none";
    summary = scraped.description || scraped.body.slice(0, 320);
  }

  return NextResponse.json({
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
  });
}
