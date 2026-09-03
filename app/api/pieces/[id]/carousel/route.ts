import { NextRequest, NextResponse } from "next/server";
import { findActivityByIdempotencyKey, recordActivity } from "@/lib/activity";
import { parseSlideUpdate, pieceVersion } from "@/lib/challengePiece";
import { mutateAll, nowIso } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type { CarouselSlide, PieceRecord } from "@/lib/types";
import { ValidationError, errorResponse } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const input = parseSlideUpdate(await req.json());
    const prior = await findActivityByIdempotencyKey(input.idempotencyKey);
    if (prior) return NextResponse.json({ change: prior.after, activity: prior, idempotent: true });
    const changed = await mutateAll<PieceRecord, {
      piece: PieceRecord;
      before: Record<string, unknown>;
      after: Record<string, unknown>;
    }>(FILES.pieces, (records) => {
      const position = records.findIndex((piece) => piece.id === id);
      if (position < 0) throw new ValidationError("piece not found", 404);
      const current = records[position];
      if (current.skill_id !== "carousel-v1" || current.carousel?.length !== 7) {
        throw new ValidationError("piece is not a seven-slide carousel-v1 Draft", 409);
      }
      const currentVersion = pieceVersion(current);
      if (input.expectedVersion !== undefined && input.expectedVersion !== currentVersion) {
        throw new ValidationError(
          `version conflict: expected ${input.expectedVersion}, current ${currentVersion}`,
          409,
        );
      }
      const slidePosition = current.carousel.findIndex((slide) => slide.index === input.index);
      if (slidePosition < 0) throw new ValidationError("slide not found", 404);
      const oldSlide = current.carousel[slidePosition];
      const visualChanged =
        input.patch.visual_cue !== undefined && input.patch.visual_cue !== oldSlide.visual_cue;
      const newSlide: CarouselSlide = {
        ...oldSlide,
        ...input.patch,
        ...(visualChanged
          ? { background_path: undefined, asset_path: undefined, image_provider: "none" as const }
          : {}),
      };
      const carousel = current.carousel.slice();
      carousel[slidePosition] = newSlide;
      const nextVersion = currentVersion + 1;
      const piece: PieceRecord = {
        ...current,
        carousel,
        current_version: nextVersion,
        updated_at: nowIso(),
        status: current.status === "qa_passed" ? "draft" : current.status,
        operation: {
          name: "carousel_update",
          status: input.actor === "codex" ? "needs_review" : "saved",
          progress: { completed: 1, total: 1 },
          message: input.actor === "codex"
            ? `Codex revised slide ${input.index}. Review or undo the change.`
            : `Your edit to slide ${input.index} is saved. Codex can continue from this version.`,
          updated_at: nowIso(),
        },
      };
      const next = records.slice();
      next[position] = piece;
      return {
        records: next,
        result: {
          piece,
          before: { piece_id: current.id, slide_index: input.index, slide: oldSlide, piece_version: currentVersion },
          after: { piece_id: current.id, slide_index: input.index, slide: newSlide, piece_version: nextVersion },
        },
      };
    });
    const activity = await recordActivity({
      actor: input.actor,
      entityType: "slide",
      entityId: `${id}:slide:${input.index}`,
      action: "carousel.update",
      summary: `${input.actor === "codex" ? "Revised" : "Edited"} slide ${input.index}: ${input.reason}`,
      before: changed.before,
      after: changed.after,
      idempotencyKey: input.idempotencyKey,
    });
    return NextResponse.json({ record: changed.piece, change: changed.after, activity });
  } catch (err) {
    const failure = errorResponse(err);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
