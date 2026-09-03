import { NextRequest, NextResponse } from "next/server";
import { findActivityByIdempotencyKey, recordActivity } from "@/lib/activity";
import { selectBrainContext } from "@/lib/contextSelector";
import { appendWithGeneratedId, nowIso, patchById, readAll } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import { ensureHackathonSeedData } from "@/lib/seeds";
import { deriveSessionTitle, isVibeSession, sessionReceipt, starterSessionSlides } from "@/lib/session";
import type { BrainRecord, ContextReceipt, PieceRecord } from "@/lib/types";
import {
  ValidationError,
  asEnum,
  asIdempotencyKey,
  asObject,
  asOptionalEnum,
  asOptionalText,
  asText,
  errorResponse,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

const ORIGINS = ["ui", "webmcp", "inspiration"] as const;

export async function GET() {
  const records = (await readAll<PieceRecord>(FILES.pieces))
    .filter(isVibeSession)
    .sort((a, b) => (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at));
  return NextResponse.json({ sessions: records.map(sessionReceipt) });
}

export async function POST(req: NextRequest) {
  try {
    await ensureHackathonSeedData();
    const raw = asObject(await req.json());
    const origin = asOptionalEnum(raw.origin, "origin", ORIGINS) ?? "ui";
    const brief = origin === "ui"
      ? asText(raw.brief ?? "", "brief", 1_200, { required: false, allowEmpty: true })
      : asText(raw.brief, "brief", 1_200);
    const title = asOptionalText(raw.title, "title", 300) || deriveSessionTitle(brief);
    const output = raw.output === undefined
      ? "carousel"
      : asEnum(raw.output, "output", ["carousel"] as const);
    const connect = raw.connect === undefined ? origin === "webmcp" : raw.connect;
    if (typeof connect !== "boolean") throw new ValidationError("connect must be true or false");
    const agentLabel = asOptionalText(raw.agent_label, "agent_label", 60) || "Codex";
    const idempotencyKey = asIdempotencyKey(raw.idempotency_key);
    const prior = await findActivityByIdempotencyKey(idempotencyKey);
    if (prior?.after && typeof prior.after === "object" && "id" in prior.after) {
      const record = prior.after as PieceRecord;
      return NextResponse.json({ record, receipt: sessionReceipt(record), activity: prior, idempotent: true });
    }

    const brain = await readAll<BrainRecord>(FILES.brain);
    const selected = selectBrainContext({
      records: brain,
      inspiration: null,
      purpose: "session_create",
      pieceId: null,
    });
    const context = await appendWithGeneratedId<ContextReceipt>(
      FILES.contextReceipts,
      "context",
      (id) => ({
        id,
        created_at: nowIso(),
        purpose: "session_create",
        inspiration_id: null,
        piece_id: null,
        skill_id: "carousel-v1",
        skill_version: "1.0.0",
        brain_ids: selected.selected.map((record) => record.id),
        example_piece_ids: selected.examples
          .map((record) => record.source_id)
          .filter((id): id is string => Boolean(id)),
        summary: selected.summary,
      }),
    );
    const timestamp = nowIso();
    const record = await appendWithGeneratedId<PieceRecord>(FILES.pieces, "field-note", (id) => ({
      id,
      created_at: timestamp,
      updated_at: timestamp,
      status: "draft",
      format: "field_note",
      title,
      hook: brief,
      body: brief,
      topic_ids: [],
      source_inbox_ids: [],
      lead_platform: "instagram",
      platforms: ["instagram", "facebook", "tiktok"],
      ip_kit: "day1",
      firewall_check: "not_run",
      slop_check: "not_run",
      voice_check: "not_run",
      draft_path: null,
      published_urls: {},
      notes: brief
        ? "Created as a shared VibeStudio Session."
        : "Blank shared Session waiting for the creator's first Codex direction.",
      visual_output: output,
      skill_id: "carousel-v1",
      skill_version: "1.0.0",
      context_receipt_id: context.id,
      transformation_note: brief
        ? "Started from a direct creator brief. No external source is being copied."
        : "No direction yet. The creator will begin this Session through Codex.",
      current_version: 1,
      carousel: starterSessionSlides(brief, title),
      session_output: output,
      session_brief: brief,
      session_origin: origin,
      session_connection_id: crypto.randomUUID(),
      session_connection_status: connect ? "connected" : "waiting",
      session_agent_label: connect ? agentLabel : undefined,
      session_connected_at: connect ? timestamp : undefined,
      operation: {
        name: "session_start",
        status: "saved",
        progress: { completed: brief ? 1 : 0, total: 7 },
        message: connect
          ? `${agentLabel} connected to the shared Session.`
          : brief
            ? "Session created and waiting for an agent."
            : "Session ready for the first Codex direction.",
        updated_at: timestamp,
      },
    }));
    await patchById<ContextReceipt>(FILES.contextReceipts, context.id, { piece_id: record.id });
    const activity = await recordActivity({
      actor: origin === "webmcp" ? "codex" : "palm",
      entityType: "piece",
      entityId: record.id,
      action: "session.start",
      summary: connect
        ? `Started and connected Session: ${record.title}`
        : `Started Session: ${record.title}`,
      before: null,
      after: record,
      idempotencyKey,
      reversible: false,
    });
    return NextResponse.json({ record, receipt: sessionReceipt(record), activity }, { status: 201 });
  } catch (err) {
    const failure = errorResponse(err);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
