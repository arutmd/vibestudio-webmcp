import { NextRequest, NextResponse } from "next/server";
import { findActivityByIdempotencyKey, recordActivity } from "@/lib/activity";
import { findById, isValidId, nowIso, patchById } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import { sessionReceipt } from "@/lib/session";
import type { PieceRecord } from "@/lib/types";
import { ValidationError, asIdempotencyKey, asObject, asOptionalText, errorResponse } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    if (!isValidId(id)) throw new ValidationError("invalid session id");
    const raw = asObject(await req.json());
    const requestedConnectionId = asOptionalText(raw.connection_id, "connection_id", 80);
    const agentLabel = asOptionalText(raw.agent_label, "agent_label", 60) || "Codex";
    const idempotencyKey = asIdempotencyKey(raw.idempotency_key);
    const prior = await findActivityByIdempotencyKey(idempotencyKey);
    if (prior?.after && typeof prior.after === "object" && "id" in prior.after) {
      const record = prior.after as PieceRecord;
      return NextResponse.json({ record, receipt: sessionReceipt(record), activity: prior, idempotent: true });
    }
    const current = await findById<PieceRecord>(FILES.pieces, id);
    if (!current || current.skill_id !== "carousel-v1") {
      throw new ValidationError("session not found", 404);
    }
    if (
      requestedConnectionId &&
      current.session_connection_id &&
      requestedConnectionId !== current.session_connection_id
    ) {
      throw new ValidationError("connection receipt does not match this Session", 409);
    }
    const timestamp = nowIso();
    const updated = await patchById<PieceRecord>(FILES.pieces, current.id, {
      updated_at: timestamp,
      session_output: current.session_output ?? "carousel",
      session_brief: current.session_brief ?? current.hook,
      session_origin: current.session_origin ?? "inspiration",
      session_connection_id: current.session_connection_id ?? requestedConnectionId ?? crypto.randomUUID(),
      session_connection_status: "connected",
      session_agent_label: agentLabel,
      session_connected_at: current.session_connected_at ?? timestamp,
      operation: {
        name: "session_connect",
        status: "saved",
        message: `${agentLabel} connected to the shared Session.`,
        updated_at: timestamp,
      },
    });
    if (!updated) throw new ValidationError("session not found", 404);
    const activity = await recordActivity({
      actor: "codex",
      entityType: "piece",
      entityId: updated.id,
      action: "session.connect",
      summary: `${agentLabel} connected to this Session`,
      before: current,
      after: updated,
      idempotencyKey,
      reversible: false,
    });
    return NextResponse.json({ record: updated, receipt: sessionReceipt(updated), activity });
  } catch (err) {
    const failure = errorResponse(err);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
