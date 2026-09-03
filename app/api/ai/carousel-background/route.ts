import { NextRequest, NextResponse } from "next/server";
import { buildCarouselVisualPrompt } from "@/lib/carousel";
import { generateCarouselBackgroundWithCodex } from "@/lib/codexImage";
import { findById, isValidId, nowIso, patchById } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type { PieceRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { pieceId?: unknown; slideIndex?: unknown; prompt?: unknown }
    | null;
  if (!isValidId(body?.pieceId)) {
    return NextResponse.json({ error: "valid pieceId required" }, { status: 400 });
  }
  const slideIndex = Number(body?.slideIndex);
  if (!Number.isInteger(slideIndex) || slideIndex < 1 || slideIndex > 12) {
    return NextResponse.json({ error: "slideIndex must be between 1 and 12" }, { status: 400 });
  }
  const piece = await findById<PieceRecord>(FILES.pieces, body.pieceId);
  if (!piece) return NextResponse.json({ error: "piece not found" }, { status: 404 });
  const slides = (piece.carousel ?? []).slice().sort((a, b) => a.index - b.index);
  const position = slides.findIndex((slide) => slide.index === slideIndex);
  if (position < 0) return NextResponse.json({ error: "slide not found" }, { status: 404 });
  const slide = slides[position];
  const requestedPrompt = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 2600) : "";
  const prompt =
    requestedPrompt ||
    slide.visual_prompt ||
    buildCarouselVisualPrompt({
      deckTitle: piece.title,
      deckHook: piece.hook,
      slide,
      deckLength: slides.length,
    });

  try {
    const generated = await generateCarouselBackgroundWithCodex({
      pieceId: piece.id,
      prompt,
      headline: slide.title,
      slideIndex,
      deckLength: slides.length,
    });
    if (!generated.path) {
      return NextResponse.json(
        {
          error: generated.timedOut
            ? "Image generation timed out before it produced a file."
            : "Image generation did not produce a usable file.",
          timedOut: generated.timedOut,
          stderr: generated.stderr.slice(-1200),
        },
        { status: 502 },
      );
    }
    slides[position] = {
      ...slide,
      visual_prompt: prompt,
      background_path: generated.path,
      asset_path: undefined,
      image_provider: "codex-image",
    };
    const updated = await patchById<PieceRecord>(FILES.pieces, piece.id, {
      updated_at: nowIso(),
      visual_output: "carousel",
      carousel: slides,
    });
    return NextResponse.json({ record: updated ?? { ...piece, carousel: slides }, slide: slides[position] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
