import fs from "node:fs/promises";
import path from "node:path";

// JSONL helpers. Two correctness properties this module guarantees:
//
//   1. Atomic rewrites. We write to `${file}.tmp` then `fs.rename` so a crash
//      mid-write cannot leave an empty or partial JSONL.
//   2. Per-file serialization. Concurrent read-modify-write cycles (two PATCH
//      requests, an append racing with a rewrite, or POSTs racing on `nextId`)
//      are queued through a Map<filePath, Promise> chain. The dashboard fires
//      these races in practice (onAudit + onSavePiece + onAIDraft).
//
// Append is also serialized through the same lock so that long bodies that
// exceed PIPE_BUF (4 KB on Linux, smaller on macOS) cannot interleave.

const lockChain = new Map<string, Promise<void>>();

async function withLock<T>(file: string, work: () => Promise<T>): Promise<T> {
  const prev = lockChain.get(file) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((r) => {
    release = r;
  });
  const queued = prev.then(() => next);
  lockChain.set(file, queued);
  try {
    await prev;
    return await work();
  } finally {
    release();
    if (lockChain.get(file) === queued) {
      lockChain.delete(file);
    }
  }
}

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function atomicWrite(file: string, content: string): Promise<void> {
  await ensureDir(file);
  // Use a unique tmp name so a crash mid-write of one process doesn't
  // collide with a concurrent process trying to write the same file.
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tmp, content, "utf8");
    await fs.rename(tmp, file);
  } catch (err) {
    // Best-effort cleanup of the tmp file; ignore failures because the
    // original error matters more.
    fs.unlink(tmp).catch(() => {});
    throw err;
  }
}

export async function readAll<T>(file: string): Promise<T[]> {
  try {
    const text = await fs.readFile(file, "utf8");
    if (!text.trim()) return [];
    const out: T[] = [];
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        out.push(JSON.parse(trimmed) as T);
      } catch {
        // Skip malformed lines silently. The data layer is human-editable;
        // partial writes can leave junk and the studio should keep working.
      }
    }
    return out;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function append<T>(file: string, record: T): Promise<void> {
  await withLock(file, async () => {
    await ensureDir(file);
    const line = JSON.stringify(record) + "\n";
    await fs.appendFile(file, line, "utf8");
  });
}

export async function rewrite<T>(file: string, records: T[]): Promise<void> {
  await withLock(file, async () => {
    const text =
      records.map((r) => JSON.stringify(r)).join("\n") +
      (records.length ? "\n" : "");
    await atomicWrite(file, text);
  });
}

// Atomically read, transform, and rewrite a complete JSONL collection under
// one lock. Use this for version checks, idempotent seeds, and any mutation
// whose correctness depends on the previously stored value.
export async function mutateAll<T, R>(
  file: string,
  mutation: (records: T[]) => { records: T[]; result: R; changed?: boolean },
): Promise<R> {
  return withLock(file, async () => {
    const current = await readAll<T>(file);
    const next = mutation(current);
    if (next.changed !== false) {
      const text =
        next.records.map((record) => JSON.stringify(record)).join("\n") +
        (next.records.length ? "\n" : "");
      await atomicWrite(file, text);
    }
    return next.result;
  });
}

export async function patchById<T extends { id: string }>(
  file: string,
  id: string,
  patch: Partial<T>,
): Promise<T | null> {
  return withLock(file, async () => {
    const all = await readAll<T>(file);
    let updated: T | null = null;
    const next = all.map((rec) => {
      if (rec.id === id) {
        // Important: the caller is responsible for sanitizing `patch` so it
        // cannot mutate `id` or other immutable fields. We do NOT spread the
        // patch over the record's id again here; we explicitly pin id back.
        updated = { ...rec, ...patch, id: rec.id };
        return updated;
      }
      return rec;
    });
    if (!updated) return null;
    const text =
      next.map((r) => JSON.stringify(r)).join("\n") + (next.length ? "\n" : "");
    await atomicWrite(file, text);
    return updated;
  });
}

export async function deleteById<T extends { id: string }>(
  file: string,
  id: string,
): Promise<T | null> {
  return withLock(file, async () => {
    const all = await readAll<T>(file);
    const deleted = all.find((rec) => rec.id === id) ?? null;
    if (!deleted) return null;
    const next = all.filter((rec) => rec.id !== id);
    const text =
      next.map((r) => JSON.stringify(r)).join("\n") + (next.length ? "\n" : "");
    await atomicWrite(file, text);
    return deleted;
  });
}

export async function findById<T extends { id: string }>(
  file: string,
  id: string,
): Promise<T | null> {
  const all = await readAll<T>(file);
  return all.find((r) => r.id === id) ?? null;
}

// Run an entire append cycle (read-many + compute-id + append) under the
// same file lock so two concurrent POSTs cannot collide on `nextId`.
export async function appendWithGeneratedId<T extends { id: string }>(
  file: string,
  prefix: string,
  build: (id: string) => T,
  date: Date = new Date(),
): Promise<T> {
  return withLock(file, async () => {
    const all = await readAll<T>(file);
    const id = nextIdInner(all, prefix, date);
    const record = build(id);
    await ensureDir(file);
    await fs.appendFile(file, JSON.stringify(record) + "\n", "utf8");
    return record;
  });
}

// Generate a date-prefixed ID like "field-note-20260427-001". Walks the
// existing list to pick the next sequence number for that prefix-date pair.
// Exported as a building block for callers that already hold the lock.
function nextIdInner(existing: { id: string }[], prefix: string, date: Date): string {
  const ymd = bangkokYmd(date);
  const head = `${prefix}-${ymd}-`;
  let max = 0;
  for (const rec of existing) {
    if (!rec.id.startsWith(head)) continue;
    const tail = rec.id.slice(head.length);
    const n = parseInt(tail, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  const next = (max + 1).toString().padStart(3, "0");
  return `${head}${next}`;
}

export function nextId(existing: { id: string }[], prefix: string, date: Date = new Date()): string {
  return nextIdInner(existing, prefix, date);
}

// Bangkok local YYYYMMDD. We keep dates in Bangkok local time so the data
// layer matches what Palm sees on his clock. Computing this via Intl avoids
// the timezone-arithmetic bugs that plagued the previous version.
function bangkokYmd(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

export function nowIso(): string {
  // Bangkok-local ISO timestamp (with offset). Computed via Intl so it is
  // consistent with `bangkokYmd` and lex-sorts correctly when other tools
  // also write +07:00 timestamps to the same JSONL.
  const d = new Date();
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}+07:00`;
}

// Small helper to validate ID strings before they hit the filesystem path or
// the data layer. Strict format: lowercased prefix segments + 8 digits + 3.
const ID_RE = /^[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*-\d{8}-\d{3}$/;
export function isValidId(id: unknown): id is string {
  return typeof id === "string" && id.length <= 80 && ID_RE.test(id);
}
