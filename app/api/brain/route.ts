import { NextRequest, NextResponse } from "next/server";
import { findActivityByIdempotencyKey, recordActivity } from "@/lib/activity";
import { BRAIN_CATEGORIES, BRAIN_STATUSES, parseBrainCreate } from "@/lib/brain";
import { appendWithGeneratedId, nowIso, readAll } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import { ensureHackathonSeedData } from "@/lib/seeds";
import type { BrainRecord } from "@/lib/types";
import { asIdempotencyKey, asObject, asOptionalEnum, errorResponse } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureHackathonSeedData();
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q")?.trim().toLocaleLowerCase() ?? "";
  if (category && !BRAIN_CATEGORIES.includes(category as (typeof BRAIN_CATEGORIES)[number])) {
    return NextResponse.json({ error: "invalid Brain category" }, { status: 400 });
  }
  if (status && !BRAIN_STATUSES.includes(status as (typeof BRAIN_STATUSES)[number])) {
    return NextResponse.json({ error: "invalid Brain status" }, { status: 400 });
  }
  const records = (await readAll<BrainRecord>(FILES.brain))
    .filter((record) => !category || record.category === category)
    .filter((record) => !status || record.status === status)
    .filter((record) => !q || `${record.text} ${record.tags.join(" ")}`.toLocaleLowerCase().includes(q))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  try {
    await ensureHackathonSeedData();
    const raw = asObject(await req.json());
    const actor = asOptionalEnum(raw.actor, "actor", ["palm", "codex"] as const) ?? "palm";
    const idempotencyKey = asIdempotencyKey(raw.idempotency_key);
    const prior = await findActivityByIdempotencyKey(idempotencyKey);
    if (prior) return NextResponse.json({ record: prior.after, activity: prior, idempotent: true });
    const input = parseBrainCreate(raw);
    const record = await appendWithGeneratedId<BrainRecord>(FILES.brain, "brain", (id) => ({
      id,
      created_at: nowIso(),
      updated_at: nowIso(),
      version: 1,
      ...input,
    }));
    const activity = await recordActivity({
      actor,
      entityType: "brain",
      entityId: record.id,
      action: "brain.add",
      summary: `Added ${record.category.replaceAll("_", " ")} memory`,
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
