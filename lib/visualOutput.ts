import type { PieceRecord } from "./types";

export function carouselAssetPaths(piece: PieceRecord): string[] {
  return (piece.carousel ?? [])
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((slide) => slide.asset_path?.trim() ?? "")
    .filter(Boolean);
}

export function carouselIsReady(piece: PieceRecord): boolean {
  const slides = piece.carousel ?? [];
  return slides.length >= 2 && slides.every((slide) => Boolean(slide.asset_path?.trim()));
}

export function activeVisualPath(piece: PieceRecord): string | null {
  if (piece.visual_output === "carousel") {
    return carouselAssetPaths(piece)[0] ?? null;
  }
  return piece.engine_asset_path ?? piece.hero_image_path ?? piece.cover_background_path ?? null;
}

export function activeVisualIsReady(piece: PieceRecord): boolean {
  return piece.visual_output === "carousel"
    ? carouselIsReady(piece)
    : Boolean(activeVisualPath(piece));
}
