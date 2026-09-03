import { NextRequest, NextResponse } from "next/server";
import { renderCarouselDeck } from "@/lib/carouselRenderer";
import { findById, isValidId, nowIso, patchById } from "@/lib/jsonl";
import { FILES, PROJECT_ROOT } from "@/lib/paths";
import type { PieceRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { pieceId?: unknown } | null;
  if (!isValidId(body?.pieceId)) {
    return NextResponse.json({ error: "valid pieceId required" }, { status: 400 });
  }
  const piece = await findById<PieceRecord>(FILES.pieces, body.pieceId);
  if (!piece) return NextResponse.json({ error: "piece not found" }, { status: 404 });

  try {
    const rendered = await renderCarouselDeck({ piece, projectRoot: PROJECT_ROOT });
    const updated = await patchById<PieceRecord>(FILES.pieces, piece.id, {
      updated_at: nowIso(),
      visual_output: "carousel",
      carousel: rendered.slides,
    });
    return NextResponse.json({
      record: updated ?? { ...piece, visual_output: "carousel", carousel: rendered.slides },
      outputDir: rendered.outputDir,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
