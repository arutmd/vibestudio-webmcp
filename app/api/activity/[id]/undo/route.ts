import { NextRequest, NextResponse } from "next/server";
import { recordActivity, recordVersion } from "@/lib/activity";
import { upsertInspirationReactionBrain } from "@/lib/brain";
import { pieceVersion } from "@/lib/challengePiece";
import { findById, mutateAll, nowIso, readAll } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type {
  ActivityRecord,
  BrainRecord,
  CreatorRecord,
  InspirationRecord,
  PieceRecord,
} from "@/lib/types";
import { ValidationError, errorResponse } from "@/lib/validation";
import { patchVersionedRecord } from "@/lib/versioned";

export const dynamic = "force-dynamic";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("activity does not contain a recoverable prior value", 409);
  }
  return value as Record<string, unknown>;
}

async function undoSlide(activity: ActivityRecord): Promise<PieceRecord> {
  const before = object(activity.before);
  const after = object(activity.after);
  const pieceId = String(before.piece_id ?? "");
  const slideIndex = Number(before.slide_index);
  const previousSlide = before.slide;
  const expectedVersion = Number(after.piece_version);
  return mutateAll<PieceRecord, PieceRecord>(FILES.pieces, (records) => {
    const position = records.findIndex((piece) => piece.id === pieceId);
    if (position < 0) throw new ValidationError("piece no longer exists", 404);
    const current = records[position];
    if (pieceVersion(current) !== expectedVersion) {
      throw new ValidationError(
        `undo conflict: the piece is now version ${pieceVersion(current)}; your newer work was preserved`,
        409,
      );
    }
    const carousel = (current.carousel ?? []).map((slide) =>
      slide.index === slideIndex ? (previousSlide as typeof slide) : slide,
    );
    const restored: PieceRecord = {
      ...current,
      carousel,
      current_version: expectedVersion + 1,
      updated_at: nowIso(),
      operation: {
        name: "piece_undo",
        status: "saved",
        progress: { completed: 1, total: 1 },
        message: `Restored slide ${slideIndex}.`,
        updated_at: nowIso(),
      },
    };
    const next = records.slice();
    next[position] = restored;
    return { records: next, result: restored };
  });
}

async function undoPiece(activity: ActivityRecord): Promise<PieceRecord> {
  const previous = object(activity.before) as PieceRecord;
  const expected = recordVersion(activity.after);
  if (!previous.id || expected === null) {
    throw new ValidationError("this piece action cannot be undone safely", 409);
  }
  return mutateAll<PieceRecord, PieceRecord>(FILES.pieces, (records) => {
    const position = records.findIndex((piece) => piece.id === previous.id);
    if (position < 0) throw new ValidationError("piece no longer exists", 404);
    const current = records[position];
    if (pieceVersion(current) !== expected) {
      throw new ValidationError(
        `undo conflict: the piece is now version ${pieceVersion(current)}; your newer work was preserved`,
        409,
      );
    }
    const restored: PieceRecord = {
      ...previous,
      id: current.id,
      created_at: current.created_at,
      format: current.format,
      current_version: expected + 1,
      updated_at: nowIso(),
      operation: {
        name: "piece_undo",
        status: "saved",
        progress: { completed: 1, total: 1 },
        message: "Restored the prior piece state.",
        updated_at: nowIso(),
      },
    };
    const next = records.slice();
    next[position] = restored;
    return { records: next, result: restored };
  });
}

async function undoVersioned(activity: ActivityRecord): Promise<unknown> {
  const before = object(activity.before);
  const expectedVersion = recordVersion(activity.after);
  if (expectedVersion === null) throw new ValidationError("activity version is missing", 409);
  if (activity.entity_type === "brain") {
    const result = await patchVersionedRecord<BrainRecord>(FILES.brain, activity.entity_id, {
      category: before.category as BrainRecord["category"],
      text: String(before.text),
      tags: before.tags as string[],
      status: before.status as BrainRecord["status"],
    }, expectedVersion);
    return result.after;
  }
  if (activity.entity_type === "inspiration") {
    const result = await patchVersionedRecord<InspirationRecord>(FILES.inspirations, activity.entity_id, {
      reaction: before.reaction as InspirationRecord["reaction"],
      reaction_note: String(before.reaction_note ?? ""),
      status: before.status as InspirationRecord["status"],
      saved_reason: String(before.saved_reason ?? ""),
    }, expectedVersion);
    await upsertInspirationReactionBrain(result.after);
    return result.after;
  }
  if (activity.entity_type === "creator") {
    const result = await patchVersionedRecord<CreatorRecord>(FILES.creators, activity.entity_id, {
      display_name: String(before.display_name),
      profile_url: before.profile_url === null ? null : String(before.profile_url),
      status: before.status as CreatorRecord["status"],
      note: String(before.note ?? ""),
    }, expectedVersion);
    return result.after;
  }
  throw new ValidationError("unsupported undo entity", 409);
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const activity = (await readAll<ActivityRecord>(FILES.activity)).find(
      (record) => record.id === id,
    );
    if (!activity) throw new ValidationError("activity not found", 404);
    if (!activity.reversible) throw new ValidationError("this action is not reversible", 409);
    if (activity.undone_at) throw new ValidationError("this action has already been undone", 409);

    const restored =
      activity.entity_type === "slide"
        ? await undoSlide(activity)
        : activity.entity_type === "piece"
          ? await undoPiece(activity)
          : await undoVersioned(activity);

    await mutateAll<ActivityRecord, void>(FILES.activity, (records) => {
      const position = records.findIndex((record) => record.id === activity.id);
      if (position < 0) throw new ValidationError("activity no longer exists", 404);
      if (records[position].undone_at) throw new ValidationError("this action has already been undone", 409);
      const next = records.slice();
      next[position] = { ...records[position], undone_at: nowIso() };
      return { records: next, result: undefined };
    });
    const undoActivity = await recordActivity({
      actor: "palm",
      entityType: activity.entity_type,
      entityId: activity.entity_id,
      action: "undo",
      summary: `Undid: ${activity.summary}`,
      before: activity.after,
      after: restored,
      reversible: false,
    });
    return NextResponse.json({ record: restored, activity: undoActivity, undone_activity_id: activity.id });
  } catch (err) {
    const failure = errorResponse(err);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
