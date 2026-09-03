import { NextRequest, NextResponse } from "next/server";
import { findById, isValidId } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type { PieceRecord, PlatformId } from "@/lib/types";
import { carouselAssetPaths } from "@/lib/visualOutput";

export const dynamic = "force-dynamic";

// One-click "copy pack". Returns the per-platform caption block ready to paste
// into the platform's native composer, plus the hero image path so Palm can
// drag-drop the file. This is the third publish path: 100% manual, but the
// content is pre-formatted exactly how Palm wants it.

export async function POST(req: NextRequest) {
  let body: { pieceId?: string; platforms?: PlatformId[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.pieceId || !isValidId(body.pieceId)) {
    return NextResponse.json({ error: "valid pieceId required" }, { status: 400 });
  }
  const { pieceId, platforms } = body;
  const piece = await findById<PieceRecord>(FILES.pieces, pieceId);
  if (!piece) return NextResponse.json({ error: "piece not found" }, { status: 404 });

  const targets = platforms ?? piece.platforms;
  const carousel = piece.visual_output === "carousel" ? carouselAssetPaths(piece) : [];
  const visualBlock = carousel.length
    ? `\n[carousel]\n${carousel.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n`
    : piece.hero_image_path
      ? `\n[hero: ${piece.hero_image_path}]\n`
      : "";
  const sections: { platform: PlatformId; caption: string }[] = [];
  for (const p of targets) {
    const caption =
      piece.platform_variants?.[p] ??
      piece.body ??
      [piece.hook, piece.title].filter(Boolean).join("\n\n");
    sections.push({ platform: p, caption });
  }

  const text = sections
    .map(
      (s) =>
        `=== ${s.platform.toUpperCase()} ===\n${s.caption}\n${
          visualBlock
        }`,
    )
    .join("\n\n");

  return NextResponse.json({
    pack: text,
    sections,
    hero: carousel.length ? null : piece.hero_image_path ?? null,
    carousel,
  });
}
