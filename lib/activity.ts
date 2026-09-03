import { appendWithGeneratedId, readAll } from "./jsonl";
import { FILES } from "./paths";
import type { ActivityEntityType, ActivityRecord } from "./types";

export async function findActivityByIdempotencyKey(
  key: string | null,
): Promise<ActivityRecord | null> {
  if (!key) return null;
  const all = await readAll<ActivityRecord>(FILES.activity);
  return all.find((activity) => activity.idempotency_key === key) ?? null;
}

export async function recordActivity(input: {
  actor: ActivityRecord["actor"];
  entityType: ActivityEntityType;
  entityId: string;
  action: string;
  summary: string;
  before?: unknown | null;
  after?: unknown | null;
  idempotencyKey?: string | null;
  reversible?: boolean;
}): Promise<ActivityRecord> {
  return appendWithGeneratedId<ActivityRecord>(FILES.activity, "activity", (id) => ({
    id,
    created_at: new Date().toISOString(),
    actor: input.actor,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action.slice(0, 80),
    summary: input.summary.slice(0, 300),
    before: input.before ?? null,
    after: input.after ?? null,
    idempotency_key: input.idempotencyKey ?? null,
    reversible: input.reversible ?? true,
    undone_at: null,
  }));
}

export function recordVersion(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const object = value as Record<string, unknown>;
  const version = object.version ?? object.current_version;
  return Number.isInteger(version) ? Number(version) : null;
}
