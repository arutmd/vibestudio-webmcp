import { NextRequest, NextResponse } from "next/server";
import { findActivityByIdempotencyKey, recordActivity } from "@/lib/activity";
import { pieceVersion } from "@/lib/challengePiece";
import { mutateAll, nowIso } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type { PieceRecord } from "@/lib/types";
import {
  ValidationError,
  asIdempotencyKey,
  asObject,
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
        if (before.skill_id !== "carousel-v1") {
          throw new ValidationError("only carousel-v1 pieces support collaboration review", 409);
        }
        const version = pieceVersion(before);
        if (expectedVersion !== undefined && expectedVersion !== version) {
          throw new ValidationError(`version conflict: expected ${expectedVersion}, current ${version}`, 409);
        }
        if (before.operation?.status !== "needs_review") {
          throw new ValidationError("there is no pending Codex change to review", 409);
        }
        const after: PieceRecord = {
          ...before,
          current_version: version + 1,
          updated_at: nowIso(),
          operation: {
            name: "collaboration_review",
            status: "saved",
            progress: { completed: 1, total: 1 },
            message: "Reviewed by you. Codex is ready for the next request.",
            updated_at: nowIso(),
          },
        };
        const next = records.slice();
        next[position] = after;
        return { records: next, result: { before, after } };
      },
    );
    const activity = await recordActivity({
      actor: "palm",
      entityType: "piece",
      entityId: result.after.id,
      action: "collaboration.reviewed",
      summary: "Reviewed Codex's latest work",
      before: result.before,
      after: result.after,
      idempotencyKey,
      reversible: false,
    });
    return NextResponse.json({ record: result.after, activity });
  } catch (err) {
    const failure = errorResponse(err);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
