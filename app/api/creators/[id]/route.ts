import { NextRequest, NextResponse } from "next/server";
import { findActivityByIdempotencyKey, recordActivity } from "@/lib/activity";
import { parseCreatorPatch } from "@/lib/inspiration";
import { findById, isValidId } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import { ensureHackathonSeedData } from "@/lib/seeds";
import type { CreatorRecord } from "@/lib/types";
import { asIdempotencyKey, asObject, errorResponse } from "@/lib/validation";
import { patchVersionedRecord } from "@/lib/versioned";

export const dynamic = "force-dynamic";

function valid(id: unknown): id is string {
  return isValidId(id) && String(id).startsWith("creator-");
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await ensureHackathonSeedData();
  if (!valid(id)) return NextResponse.json({ error: "invalid creator id" }, { status: 400 });
  const record = await findById<CreatorRecord>(FILES.creators, id);
  if (!record) return NextResponse.json({ error: "creator not found" }, { status: 404 });
  return NextResponse.json({ record });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await ensureHackathonSeedData();
    if (!valid(id)) return NextResponse.json({ error: "invalid creator id" }, { status: 400 });
    const raw = asObject(await req.json());
    const idempotencyKey = asIdempotencyKey(raw.idempotency_key);
    const prior = await findActivityByIdempotencyKey(idempotencyKey);
    if (prior) return NextResponse.json({ record: prior.after, activity: prior, idempotent: true });
    const { patch, expectedVersion } = parseCreatorPatch(raw);
    const { before, after } = await patchVersionedRecord<CreatorRecord>(
      FILES.creators,
      id,
      patch,
      expectedVersion,
    );
    const activity = await recordActivity({
      actor: "palm",
      entityType: "creator",
      entityId: after.id,
      action: `creator.${after.status}`,
      summary: `${after.display_name} is now ${after.status}`,
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
