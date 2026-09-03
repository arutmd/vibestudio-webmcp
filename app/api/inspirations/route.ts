import { NextRequest, NextResponse } from "next/server";
import { findActivityByIdempotencyKey, recordActivity } from "@/lib/activity";
import {
  INSPIRATION_REACTIONS,
  INSPIRATION_STATUSES,
  parseInspirationCreate,
} from "@/lib/inspiration";
import { appendWithGeneratedId, nowIso, readAll } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import { ensureHackathonSeedData } from "@/lib/seeds";
import type { CreatorRecord, InspirationRecord } from "@/lib/types";
import {
  ValidationError,
  asIdempotencyKey,
  asObject,
  errorResponse,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureHackathonSeedData();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const reaction = url.searchParams.get("reaction");
  const creatorId = url.searchParams.get("creator_id");
  if (status && !INSPIRATION_STATUSES.includes(status as (typeof INSPIRATION_STATUSES)[number])) {
    return NextResponse.json({ error: "invalid inspiration status" }, { status: 400 });
  }
  if (reaction && !INSPIRATION_REACTIONS.includes(reaction as (typeof INSPIRATION_REACTIONS)[number])) {
    return NextResponse.json({ error: "invalid inspiration reaction" }, { status: 400 });
  }
  const [inspirations, creators] = await Promise.all([
    readAll<InspirationRecord>(FILES.inspirations),
    readAll<CreatorRecord>(FILES.creators),
  ]);
  const creatorMap = new Map(creators.map((creator) => [creator.id, creator]));
  const records = inspirations
    .filter((record) => !status || record.status === status)
    .filter((record) => !reaction || record.reaction === reaction)
    .filter((record) => !creatorId || record.creator_id === creatorId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((record) => ({ ...record, creator: record.creator_id ? creatorMap.get(record.creator_id) ?? null : null }));
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  try {
    await ensureHackathonSeedData();
    const raw = asObject(await req.json());
    const idempotencyKey = asIdempotencyKey(raw.idempotency_key);
    const prior = await findActivityByIdempotencyKey(idempotencyKey);
    if (prior) return NextResponse.json({ record: prior.after, activity: prior, idempotent: true });
    const input = parseInspirationCreate(raw);
    if (input.creator_id) {
      const creators = await readAll<CreatorRecord>(FILES.creators);
      if (!creators.some((creator) => creator.id === input.creator_id && creator.status !== "archived")) {
        throw new ValidationError("creator_id does not reference a tracked creator", 404);
      }
    }
    const existing = await readAll<InspirationRecord>(FILES.inspirations);
    const duplicate = existing.find(
      (record) =>
        record.status !== "archived" &&
        record.title.toLocaleLowerCase() === input.title.toLocaleLowerCase() &&
        record.source_url === input.source_url,
    );
    if (duplicate) throw new ValidationError(`inspiration already saved as ${duplicate.id}`, 409);
    const record = await appendWithGeneratedId<InspirationRecord>(
      FILES.inspirations,
      "inspiration",
      (id) => ({
        id,
        created_at: nowIso(),
        updated_at: nowIso(),
        version: 1,
        ...input,
      }),
    );
    const activity = await recordActivity({
      actor: "palm",
      entityType: "inspiration",
      entityId: record.id,
      action: "inspiration.add",
      summary: `Saved inspiration: ${record.title}`,
      before: null,
      after: record,
      idempotencyKey,
      reversible: false,
    });
    return NextResponse.json({ record, activity }, { status: 201 });
  } catch (err) {
    const failure = errorResponse(err);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
