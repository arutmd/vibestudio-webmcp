import { NextRequest, NextResponse } from "next/server";
import { findActivityByIdempotencyKey, recordActivity } from "@/lib/activity";
import { upsertInspirationReactionBrain } from "@/lib/brain";
import { parseInspirationPatch } from "@/lib/inspiration";
import { findById, isValidId, readAll } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import { ensureHackathonSeedData } from "@/lib/seeds";
import type { CreatorRecord, InspirationRecord } from "@/lib/types";
import { asIdempotencyKey, asObject, errorResponse } from "@/lib/validation";
import { patchVersionedRecord } from "@/lib/versioned";

export const dynamic = "force-dynamic";

function valid(id: unknown): id is string {
  return isValidId(id) && String(id).startsWith("inspiration-");
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await ensureHackathonSeedData();
  if (!valid(id)) return NextResponse.json({ error: "invalid inspiration id" }, { status: 400 });
  const record = await findById<InspirationRecord>(FILES.inspirations, id);
  if (!record) return NextResponse.json({ error: "inspiration not found" }, { status: 404 });
  const creators = await readAll<CreatorRecord>(FILES.creators);
  const creator = creators.find((item) => item.id === record.creator_id) ?? null;
  return NextResponse.json({ record: { ...record, creator } });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await ensureHackathonSeedData();
    if (!valid(id)) return NextResponse.json({ error: "invalid inspiration id" }, { status: 400 });
    const raw = asObject(await req.json());
    const idempotencyKey = asIdempotencyKey(raw.idempotency_key);
    const prior = await findActivityByIdempotencyKey(idempotencyKey);
    if (prior) return NextResponse.json({ record: prior.after, activity: prior, idempotent: true });
    const { patch, expectedVersion } = parseInspirationPatch(raw);
    const { before, after } = await patchVersionedRecord<InspirationRecord>(
      FILES.inspirations,
      id,
      patch,
      expectedVersion,
    );
    const brain =
      "reaction" in patch || "reaction_note" in patch
        ? await upsertInspirationReactionBrain(after)
        : null;
    const action = "status" in patch ? `inspiration.${after.status}` : "inspiration.react";
    const summary =
      action === "inspiration.react"
        ? `${after.reaction === "none" ? "Cleared reaction" : after.reaction === "like" ? "Liked" : "Not for me"}: ${after.title}`
        : `${after.title} is now ${after.status}`;
    const activity = await recordActivity({
      actor: "palm",
      entityType: "inspiration",
      entityId: after.id,
      action,
      summary,
      before,
      after,
      idempotencyKey,
    });
    return NextResponse.json({ record: after, activity, brain: brain?.after ?? null });
  } catch (err) {
    const failure = errorResponse(err);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
