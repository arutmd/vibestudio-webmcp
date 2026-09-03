import { NextRequest, NextResponse } from "next/server";
import { findActivityByIdempotencyKey, recordActivity } from "@/lib/activity";
import { pieceVersion } from "@/lib/challengePiece";
import { generateCarouselBackgroundWithCodex } from "@/lib/codexImage";
import { renderCarouselDeck } from "@/lib/carouselRenderer";
import { findById, mutateAll, nowIso } from "@/lib/jsonl";
import { FILES, PROJECT_ROOT } from "@/lib/paths";
import type { PieceRecord } from "@/lib/types";
import {
  ValidationError,
  asIdempotencyKey,
  asObject,
  asVersion,
  errorResponse,
} from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const GENERATED_SLIDES = [1, 3, 5] as const;

async function setOperation(
  pieceId: string,
  operation: NonNullable<PieceRecord["operation"]>,
): Promise<PieceRecord> {
  return mutateAll<PieceRecord, PieceRecord>(FILES.pieces, (records) => {
    const position = records.findIndex((piece) => piece.id === pieceId);
    if (position < 0) throw new ValidationError("piece not found", 404);
    const nextPiece = { ...records[position], operation, updated_at: nowIso() };
    const next = records.slice();
    next[position] = nextPiece;
    return { records: next, result: nextPiece };
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  let initial: PieceRecord | null = null;
  try {
    const raw = asObject(await req.json());
    const idempotencyKey = asIdempotencyKey(raw.idempotency_key);
    const expectedVersion = asVersion(raw.expected_version);
    const prior = await findActivityByIdempotencyKey(idempotencyKey);
    if (prior) return NextResponse.json({ record: prior.after, activity: prior, idempotent: true });

    initial = await findById<PieceRecord>(FILES.pieces, id);
    if (!initial) throw new ValidationError("piece not found", 404);
    if (initial.skill_id !== "carousel-v1" || initial.carousel?.length !== 7) {
      throw new ValidationError("carousel_finish requires a seven-slide carousel-v1 piece", 409);
    }
    if (expectedVersion !== undefined && expectedVersion !== pieceVersion(initial)) {
      throw new ValidationError(
        `version conflict: expected ${expectedVersion}, current ${pieceVersion(initial)}`,
        409,
      );
    }
    const missing = GENERATED_SLIDES.filter(
      (index) => !initial?.carousel?.find((slide) => slide.index === index)?.background_path,
    );
    await setOperation(id, {
      name: "carousel_finish",
      status: "working",
      progress: { completed: 0, total: missing.length + 1 },
      message: missing.length ? `Preparing ${missing.length} text-free visual layers.` : "Rendering final slides.",
      updated_at: nowIso(),
    });

    let completed = 0;
    for (const index of missing) {
      if (req.signal.aborted) throw new ValidationError("carousel_finish was cancelled", 499);
      const current = await findById<PieceRecord>(FILES.pieces, id);
      const slide = current?.carousel?.find((candidate) => candidate.index === index);
      if (!current || !slide) throw new ValidationError(`slide ${index} is unavailable`, 409);
      const generated = await generateCarouselBackgroundWithCodex({
        pieceId: current.id,
        prompt: slide.visual_prompt ?? slide.visual_cue,
        headline: slide.title,
        slideIndex: index,
        deckLength: 7,
      });
      if (!generated.path) {
        throw new Error(`Visual generation failed for slide ${index}; completed layers were preserved.`);
      }
      await mutateAll<PieceRecord, PieceRecord>(FILES.pieces, (records) => {
        const position = records.findIndex((piece) => piece.id === id);
        if (position < 0) throw new ValidationError("piece not found", 404);
        const before = records[position];
        const carousel = (before.carousel ?? []).map((candidate) =>
          candidate.index === index
            ? { ...candidate, background_path: generated.path ?? undefined, image_provider: "codex-image" as const }
            : candidate,
        );
        const nextPiece: PieceRecord = {
          ...before,
          carousel,
          current_version: pieceVersion(before) + 1,
          updated_at: nowIso(),
          operation: {
            name: "carousel_finish",
            status: "working",
            progress: { completed: completed + 1, total: missing.length + 1 },
            message: `Visual layer ${completed + 1} of ${missing.length} is ready.`,
            updated_at: nowIso(),
          },
        };
        const next = records.slice();
        next[position] = nextPiece;
        return { records: next, result: nextPiece };
      });
      completed += 1;
    }

    const beforeRender = await findById<PieceRecord>(FILES.pieces, id);
    if (!beforeRender) throw new ValidationError("piece not found", 404);
    const rendered = await renderCarouselDeck({ piece: beforeRender, projectRoot: PROJECT_ROOT });
    const finished = await mutateAll<PieceRecord, PieceRecord>(FILES.pieces, (records) => {
      const position = records.findIndex((piece) => piece.id === id);
      if (position < 0) throw new ValidationError("piece not found", 404);
      const before = records[position];
      const assetByIndex = new Map(rendered.slides.map((slide) => [slide.index, slide.asset_path]));
      const carousel = (before.carousel ?? []).map((slide) => ({
        ...slide,
        asset_path: assetByIndex.get(slide.index) ?? slide.asset_path,
      }));
      const nextPiece: PieceRecord = {
        ...before,
        carousel,
        current_version: pieceVersion(before) + 1,
        last_render_dir: rendered.outputDir,
        updated_at: nowIso(),
        operation: {
          name: "carousel_finish",
          status: "needs_review",
          progress: { completed: missing.length + 1, total: missing.length + 1 },
          message: "Seven final 1080 × 1350 slides are ready for review.",
          updated_at: nowIso(),
        },
      };
      const next = records.slice();
      next[position] = nextPiece;
      return { records: next, result: nextPiece };
    });
    const activity = await recordActivity({
      actor: "codex",
      entityType: "piece",
      entityId: finished.id,
      action: "carousel.finish",
      summary: "Generated missing visual layers and rendered seven final slides",
      before: initial,
      after: finished,
      idempotencyKey,
      reversible: false,
    });
    return NextResponse.json({ record: finished, activity, render_dir: rendered.outputDir });
  } catch (err) {
    if (initial) {
      await setOperation(id, {
        name: "carousel_finish",
        status: "error",
        message: err instanceof Error ? err.message.slice(0, 300) : "Carousel finishing failed.",
        updated_at: nowIso(),
      }).catch(() => {});
    }
    const failure = errorResponse(err);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
