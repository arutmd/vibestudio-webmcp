import { mutateAll, nowIso } from "./jsonl";
import { ValidationError } from "./validation";

export async function patchVersionedRecord<T extends { id: string; version: number; updated_at?: string }>(
  file: string,
  id: string,
  patch: Partial<T>,
  expectedVersion?: number,
): Promise<{ before: T; after: T }> {
  return mutateAll<T, { before: T; after: T }>(file, (records) => {
    const position = records.findIndex((record) => record.id === id);
    if (position < 0) throw new ValidationError("record not found", 404);
    const before = records[position];
    if (expectedVersion !== undefined && before.version !== expectedVersion) {
      throw new ValidationError(
        `version conflict: expected ${expectedVersion}, current ${before.version}`,
        409,
      );
    }
    const after = {
      ...before,
      ...patch,
      id: before.id,
      version: before.version + 1,
      updated_at: nowIso(),
    } as T;
    const next = records.slice();
    next[position] = after;
    return { records: next, result: { before, after } };
  });
}
