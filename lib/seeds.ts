import fs from "node:fs/promises";
import path from "node:path";
import { mutateAll } from "./jsonl";
import { FILES, SEED_DIR } from "./paths";
import type { BrainRecord, CreatorRecord, InspirationRecord } from "./types";

async function readSeed<T>(name: string): Promise<T[]> {
  const text = await fs.readFile(path.join(SEED_DIR, name), "utf8");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

export function mergeMissingById<T extends { id: string }>(current: T[], seeds: T[]): T[] {
  const ids = new Set(current.map((record) => record.id));
  return [...current, ...seeds.filter((record) => !ids.has(record.id))];
}

async function ensureFile<T extends { id: string }>(file: string, seedName: string): Promise<number> {
  const seeds = await readSeed<T>(seedName);
  return mutateAll<T, number>(file, (records) => {
    const next = mergeMissingById(records, seeds);
    return { records: next, result: next.length - records.length, changed: next.length !== records.length };
  });
}

let installed: Promise<{ creators: number; inspirations: number; brain: number }> | null = null;

export function ensureHackathonSeedData(): Promise<{ creators: number; inspirations: number; brain: number }> {
  installed ??= Promise.all([
    ensureFile<CreatorRecord>(FILES.creators, "creators.jsonl"),
    ensureFile<InspirationRecord>(FILES.inspirations, "inspirations.jsonl"),
    ensureFile<BrainRecord>(FILES.brain, "brain.jsonl"),
  ]).then(([creators, inspirations, brain]) => ({ creators, inspirations, brain }));
  return installed;
}
