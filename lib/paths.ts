import path from "node:path";

type StudioPathEnv = Readonly<Record<string, string | undefined>>;

// The studio reads/writes JSONL inside the parent project's data/ folder, so
// every brain (Claude Code, OpenClaude, the Studio UI) is looking at the same
// source of truth. The public judge build deliberately switches to an isolated,
// disposable workspace so Palm's private creator data is never part of it.
export function isDemoMode(env: StudioPathEnv = process.env): boolean {
  return env.VIBESTUDIO_DEMO_MODE === "1";
}

export function resolveProjectRoot(
  cwd: string = process.cwd(),
  env: StudioPathEnv = process.env,
): string {
  const configured = env.ARUTLEE_PROJECT_ROOT?.trim();
  if (configured) return path.resolve(configured);
  if (isDemoMode(env)) return path.join(cwd, ".vibestudio-demo");
  return path.resolve(cwd, "..");
}

export function resolveSeedDir(
  cwd: string = process.cwd(),
  env: StudioPathEnv = process.env,
): string {
  return path.join(cwd, isDemoMode(env) ? "demo-seeds" : "data-seeds");
}

export const DEMO_MODE = isDemoMode();
const root = resolveProjectRoot();

export const PROJECT_ROOT = root;
export const DATA_DIR = path.join(PROJECT_ROOT, "data");
export const PIECES_DIR = path.join(PROJECT_ROOT, "pieces");
export const INGREDIENTS_DIR = path.join(PROJECT_ROOT, "ingredients");
export const PIPELINE_DIR = path.join(PROJECT_ROOT, "pipeline");

export const FILES = {
  inbox: path.join(DATA_DIR, "inbox.jsonl"),
  pieces: path.join(DATA_DIR, "pieces.jsonl"),
  metrics: path.join(DATA_DIR, "metrics.jsonl"),
  decisions: path.join(DATA_DIR, "decisions.jsonl"),
  experiments: path.join(DATA_DIR, "experiments.jsonl"),
  creators: path.join(DATA_DIR, "creators.jsonl"),
  inspirations: path.join(DATA_DIR, "inspirations.jsonl"),
  brain: path.join(DATA_DIR, "brain.jsonl"),
  contextReceipts: path.join(DATA_DIR, "context-receipts.jsonl"),
  activity: path.join(DATA_DIR, "activity.jsonl"),
  topicsDoc: path.join(PROJECT_ROOT, "03-content-pillars-and-series.md"),
  voiceDoc: path.join(PROJECT_ROOT, "03-content-pillars-and-series.md"),
  slopDoc: path.join(PROJECT_ROOT, "17-no-slop-test.md"),
  firewallDoc: path.join(PROJECT_ROOT, "01-executive-summary.md"),
  casefileTemplate: path.join(PROJECT_ROOT, "13-casefile-template.md"),
  fieldNoteTemplate: path.join(PROJECT_ROOT, "14-field-notes-template.md"),
  visualBrief: path.join(PROJECT_ROOT, "15-visual-ip-brief.md"),
} as const;

export const SEED_DIR = resolveSeedDir();
