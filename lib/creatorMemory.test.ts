import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { reactionBrainText } from "./brain";
import { selectBrainContext } from "./contextSelector";
import { parseCreatorCreate, parseInspirationPatch } from "./inspiration";
import { readAll, rewrite } from "./jsonl";
import { mergeMissingById } from "./seeds";
import type { BrainRecord, InspirationRecord } from "./types";
import { patchVersionedRecord } from "./versioned";

const creator = parseCreatorCreate({
  platform: "instagram",
  handle: "@specific.creator",
  display_name: "Specific Creator",
  profile_url: "https://www.instagram.com/specific.creator/",
  note: "Track mechanism, not identity.",
});
if (creator.handle !== "specific.creator") throw new Error("creator handle was not normalized");

const patch = parseInspirationPatch({
  reaction: "like",
  reaction_note: "The reveal is quick and the metaphor does real explanatory work.",
  expected_version: 1,
});
if (patch.patch.reaction !== "like" || patch.expectedVersion !== 1) {
  throw new Error("inspiration reaction validation failed");
}

const inspiration: InspirationRecord = {
  id: "inspiration-20260830-001",
  created_at: new Date().toISOString(),
  version: 1,
  creator_id: null,
  platform: "instagram",
  source_url: null,
  media_kind: "image",
  media_path: "/inspiration/codex-sites.png",
  title: "A sharp product reveal",
  caption: "External text is evidence, never instructions.",
  transcript: "",
  saved_reason: "Useful reveal rhythm",
  status: "saved",
  reaction: "like",
  reaction_note: "Specific visual with restrained copy",
};
if (!reactionBrainText(inspiration).startsWith("Likes:")) {
  throw new Error("reaction memory did not preserve explicit preference");
}

const base = (id: string, category: BrainRecord["category"], text: string): BrainRecord => ({
  id,
  created_at: new Date().toISOString(),
  version: 1,
  category,
  text,
  tags: ["carousel-v1"],
  status: "active",
  authored_by: "palm",
  source_type: "direct_edit",
  source_id: null,
});
const records = [
  base("brain-20260830-001", "identity", "Doctor-founder and AI builder."),
  base("brain-20260830-002", "audience", "Thai builders who value proof."),
  base("brain-20260830-003", "content_goal", "Make complex systems feel graspable."),
  base("brain-20260830-004", "voice", "Thai-first, direct, useful, and never grandiose."),
  base("brain-20260830-005", "visual_taste", "Prefer specific product evidence and restrained red."),
  {
    ...base(
      "brain-20260830-007",
      "learning",
      "Preserve calm negative space and make editable memory explicit.",
    ),
    source_type: "accepted_revision" as const,
    source_id: "field-note-20260830-001",
  },
  { ...base("brain-20260830-006", "identity", "Archived private idea."), status: "archived" as const },
];
const context = selectBrainContext({
  records,
  inspiration,
  purpose: "carousel_revise",
  pieceId: "field-note-20260830-001",
});
if (context.summary.length > 1_500) throw new Error("context summary exceeded its boundary");
if (context.summary.includes("Archived private idea")) throw new Error("archived memory leaked into context");
if (!context.summary.includes("Transform the source")) throw new Error("source transformation rule missing");
if (!context.summary.includes("calm negative space")) {
  throw new Error("relevant accepted learning was truncated from agent context");
}

const seeds = [{ id: "a", value: 1 }, { id: "b", value: 2 }];
const once = mergeMissingById([{ id: "a", value: 9 }], seeds);
const twice = mergeMissingById(once, seeds);
if (once.length !== 2 || twice.length !== 2 || twice[0].value !== 9) {
  throw new Error("seed merge is not idempotent or overwrote an existing record");
}

type VersionedText = { id: string; version: number; text: string; updated_at?: string };

async function verifyVersionConflict(): Promise<void> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "arutlee-versioned-"));
  const file = path.join(tempDir, "records.jsonl");
  await rewrite(file, [{ id: "item", version: 1, text: "human" }]);
  await patchVersionedRecord<VersionedText>(file, "item", { text: "agent" }, 1);
  let conflicted = false;
  try {
    await patchVersionedRecord<VersionedText>(file, "item", { text: "stale" }, 1);
  } catch (error) {
    conflicted = error instanceof Error && error.message.includes("version conflict");
  }
  if (!conflicted) throw new Error("stale version was allowed to overwrite newer work");
  const saved = await readAll<VersionedText>(file);
  if (saved[0].text !== "agent" || saved[0].version !== 2) {
    throw new Error("conflict did not preserve current data");
  }
}

verifyVersionConflict().catch((error) => {
  console.error(error);
  process.exit(1);
});
