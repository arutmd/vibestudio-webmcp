import { NextRequest, NextResponse } from "next/server";
import { callClaude, resolveEngine, safeJSON } from "@/lib/claude";
import { normalizeCarouselSlides } from "@/lib/carousel";
import { carouselPrompt, SYSTEM_BRIEF } from "@/lib/prompts";
import type { CarouselSlide, PieceFormat } from "@/lib/types";

export const dynamic = "force-dynamic";

function fallbackSlides(
  title: string,
  format: PieceFormat,
  body: string,
  target: number = 8,
): CarouselSlide[] {
  const sentences = body
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Pick a baseline section list per format. Trim/extend it to match the
  // requested target (cover counts as one slide), capping at 12.
  const isCasefile = format === "casefile" || format === "casefile_opd" || format === "casefile_ipd";
  const baseLabels = isCasefile
    ? ["CHIEF COMPLAINT", "HISTORY", "DIFFERENTIAL", "INTERVENTION", "OUTCOME", "CAVEAT", "TAKEAWAY"]
    : ["OBSERVATION", "FRAME", "PROOF", "CAVEAT", "TAKEAWAY"];

  const want = Math.max(2, Math.min(12, target));
  // Extend baseLabels with generic "DETAIL N" rows if more slides are wanted.
  const extension: string[] = [];
  while (baseLabels.length + extension.length < want - 1) {
    extension.push(`DETAIL ${extension.length + 1}`);
  }
  const labels = [...baseLabels, ...extension].slice(0, want - 1);

  const coverFmt = isCasefile ? "Casefile" : "Field Note";
  const cover: CarouselSlide = {
    index: 1,
    kind: "cover",
    title: title || coverFmt,
    body: sentences[0] ?? "",
    visual_cue: `Vital-strip / ${coverFmt.toUpperCase()} / DATE. Hero serif title.`,
  };
  const interior: CarouselSlide[] = labels.map((label, i) => ({
    index: i + 2,
    kind: i === labels.length - 1 ? ("outro" as const) : ("section" as const),
    title: label,
    body: sentences[i + 1] ?? "",
    visual_cue: `Monospace label "${label}". Single concrete artifact.`,
  }));
  return normalizeCarouselSlides([cover, ...interior], { deckTitle: title });
}

export async function POST(req: NextRequest) {
  let body: { body?: string; format?: PieceFormat; title?: string; slides?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.body || typeof body.body !== "string") {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }
  const format: PieceFormat = body.format ?? "field_note";
  const title = (body.title ?? "").slice(0, 200);

  if ((await resolveEngine()).engine === "none") {
    return NextResponse.json({
      slides: fallbackSlides(title, format, body.body, body.slides),
      fallback: true,
    });
  }

  try {
    const text = await callClaude({
      system: SYSTEM_BRIEF,
      cacheSystem: true,
      messages: [
        {
          role: "user",
          content: carouselPrompt({
            body: body.body,
            format,
            title,
            slides: body.slides,
          }),
        },
      ],
      maxTokens: 2500,
    });
    const parsed = safeJSON<{ slides: CarouselSlide[] }>(text, { slides: [] });
    if (!parsed.slides?.length) {
      return NextResponse.json({
        slides: fallbackSlides(title, format, body.body, body.slides),
        fallback: true,
        warning: "AI returned no slides; using fallback.",
      });
    }
    // Re-index defensively in case the AI miscounted.
    const normalized = normalizeCarouselSlides(parsed.slides, {
      deckTitle: title || "Arutlee carousel",
      deckHook: body.body.slice(0, 220),
    });
    return NextResponse.json({ slides: normalized });
  } catch (err) {
    return NextResponse.json(
      {
        slides: fallbackSlides(title, format, body.body, body.slides),
        fallback: true,
        warning: `AI call failed: ${(err as Error).message}`,
      },
      { status: 200 },
    );
  }
}
