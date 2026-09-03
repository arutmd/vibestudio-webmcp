import { NextRequest, NextResponse } from "next/server";
import { findActivityByIdempotencyKey, recordActivity } from "@/lib/activity";
import { pieceVersion } from "@/lib/challengePiece";
import { appendWithGeneratedId, mutateAll, nowIso, readAll } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type { BrainRecord, PieceRecord } from "@/lib/types";
import {
  ValidationError,
  asEnum,
  asIdempotencyKey,
  asObject,
  asOptionalEnum,
  asVersion,
  errorResponse,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const raw = asObject(await req.json());
    const requested = asEnum(raw.status, "status", ["draft", "ready"] as const);
    const actor = asOptionalEnum(raw.actor, "actor", ["palm", "codex"] as const) ?? "codex";
    const expectedVersion = asVersion(raw.expected_version);
    const idempotencyKey = asIdempotencyKey(raw.idempotency_key);
    const prior = await findActivityByIdempotencyKey(idempotencyKey);
    if (prior) return NextResponse.json({ record: prior.after, activity: prior, idempotent: true });
    const result = await mutateAll<PieceRecord, { before: PieceRecord; after: PieceRecord }>(
      FILES.pieces,
      (records) => {
        const position = records.findIndex((piece) => piece.id === id);
        if (position < 0) throw new ValidationError("piece not found", 404);
        const before = records[position];
        if (before.skill_id !== "carousel-v1" || before.carousel?.length !== 7) {
          throw new ValidationError("piece is not a complete carousel-v1 story", 409);
        }
        const version = pieceVersion(before);
        if (expectedVersion !== undefined && expectedVersion !== version) {
          throw new ValidationError(`version conflict: expected ${expectedVersion}, current ${version}`, 409);
        }
        const status = requested === "ready" ? "qa_passed" : "draft";
        const after: PieceRecord = {
          ...before,
          status,
          current_version: version + 1,
          updated_at: nowIso(),
          operation: {
            name: "piece_status",
            status: actor === "codex" ? "needs_review" : "saved",
            progress: { completed: 1, total: 1 },
            message: actor === "codex"
              ? requested === "ready" ? "Codex marked this Ready. Your review is required." : "Codex returned this to Draft for another pass."
              : requested === "ready" ? "You marked this Ready. Codex can continue from here." : "You returned this to Draft.",
            updated_at: nowIso(),
          },
        };
        const next = records.slice();
        next[position] = after;
        return { records: next, result: { before, after } };
      },
    );
    const activity = await recordActivity({
      actor,
      entityType: "piece",
      entityId: result.after.id,
      action: requested === "ready" ? "piece.ready" : "piece.draft",
      summary: requested === "ready" ? "Marked carousel Ready" : "Returned carousel to Draft",
      before: result.before,
      after: result.after,
      idempotencyKey,
    });

    let learning: BrainRecord | null = null;
    if (requested === "ready" && result.after.transformation_note) {
      const existing = (await readAll<BrainRecord>(FILES.brain)).find(
        (record) => record.source_type === "accepted_revision" && record.source_id === result.after.id,
      );
      if (!existing) {
        const text = `Proposed learning from ${result.after.title}: ${result.after.transformation_note}`.slice(0, 700);
        learning = await appendWithGeneratedId<BrainRecord>(FILES.brain, "brain", (id) => ({
          id,
          created_at: nowIso(),
          updated_at: nowIso(),
          version: 1,
          category: "learning",
          text,
          tags: ["carousel-v1", "accepted-revision"],
          status: "proposed",
          authored_by: "arutlee",
          source_type: "accepted_revision",
          source_id: result.after.id,
        }));
      } else {
        learning = existing;
      }
    }
    return NextResponse.json({ record: result.after, activity, learning });
  } catch (err) {
    const failure = errorResponse(err);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
