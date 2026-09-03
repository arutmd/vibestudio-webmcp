import { NextRequest, NextResponse } from "next/server";
import { findActivityByIdempotencyKey, recordActivity } from "@/lib/activity";
import { parseBrainPatch } from "@/lib/brain";
import { findById, isValidId } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import { ensureHackathonSeedData } from "@/lib/seeds";
import type { BrainRecord } from "@/lib/types";
import { asIdempotencyKey, asObject, asOptionalEnum, errorResponse } from "@/lib/validation";
import { patchVersionedRecord } from "@/lib/versioned";

export const dynamic = "force-dynamic";

function valid(id: unknown): id is string {
  return isValidId(id) && String(id).startsWith("brain-");
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await ensureHackathonSeedData();
  if (!valid(id)) return NextResponse.json({ error: "invalid Brain id" }, { status: 400 });
  const record = await findById<BrainRecord>(FILES.brain, id);
  if (!record) return NextResponse.json({ error: "Brain item not found" }, { status: 404 });
  return NextResponse.json({ record });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await ensureHackathonSeedData();
    if (!valid(id)) return NextResponse.json({ error: "invalid Brain id" }, { status: 400 });
    const raw = asObject(await req.json());
    const actor = asOptionalEnum(raw.actor, "actor", ["palm", "codex"] as const) ?? "palm";
    const idempotencyKey = asIdempotencyKey(raw.idempotency_key);
    const prior = await findActivityByIdempotencyKey(idempotencyKey);
    if (prior) return NextResponse.json({ record: prior.after, activity: prior, idempotent: true });
    const { patch, expectedVersion } = parseBrainPatch(raw);
    const { before, after } = await patchVersionedRecord<BrainRecord>(
      FILES.brain,
      id,
      patch,
      expectedVersion,
    );
    const activity = await recordActivity({
      actor,
      entityType: "brain",
      entityId: after.id,
      action: "status" in patch ? `brain.${after.status}` : "brain.edit",
      summary: `Updated ${after.category.replaceAll("_", " ")} memory`,
      before,
      after,
      idempotencyKey,
    });
    return NextResponse.json({ record: after, activity });
  } catch (err) {
    const failure = errorResponse(err);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
