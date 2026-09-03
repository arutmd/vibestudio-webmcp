import { NextRequest, NextResponse } from "next/server";
import { findActivityByIdempotencyKey, recordActivity } from "@/lib/activity";
import { parseCreatorCreate } from "@/lib/inspiration";
import { appendWithGeneratedId, nowIso, readAll } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import { ensureHackathonSeedData } from "@/lib/seeds";
import type { CreatorRecord } from "@/lib/types";
import { ValidationError, asIdempotencyKey, asObject, errorResponse } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureHackathonSeedData();
  const records = await readAll<CreatorRecord>(FILES.creators);
  return NextResponse.json({ records: records.sort((a, b) => a.display_name.localeCompare(b.display_name)) });
}

export async function POST(req: NextRequest) {
  try {
    await ensureHackathonSeedData();
    const raw = asObject(await req.json());
    const idempotencyKey = asIdempotencyKey(raw.idempotency_key);
    const prior = await findActivityByIdempotencyKey(idempotencyKey);
    if (prior) return NextResponse.json({ record: prior.after, activity: prior, idempotent: true });
    const input = parseCreatorCreate(raw);
    const existing = await readAll<CreatorRecord>(FILES.creators);
    const duplicate = existing.find(
      (record) =>
        record.platform === input.platform &&
        record.handle.toLocaleLowerCase() === input.handle.toLocaleLowerCase() &&
        record.status !== "archived",
    );
    if (duplicate) throw new ValidationError(`creator already tracked as ${duplicate.id}`, 409);
    const record = await appendWithGeneratedId<CreatorRecord>(FILES.creators, "creator", (id) => ({
      id,
      created_at: nowIso(),
      updated_at: nowIso(),
      version: 1,
      ...input,
    }));
    const activity = await recordActivity({
      actor: "palm",
      entityType: "creator",
      entityId: record.id,
      action: "creator.add",
      summary: `Added ${record.display_name} to tracked creators`,
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
