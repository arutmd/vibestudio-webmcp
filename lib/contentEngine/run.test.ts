import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { InboxRecord, PieceRecord } from "../types";
import { runOneGo } from "./run";

const piece: PieceRecord = {
  id: "field-note-20260604-001",
  created_at: "2026-06-04T10:00:00+07:00",
  status: "idea",
  format: "field_note",
  title: "Local Codex content engine",
  hook: "The dashboard can run one selected idea locally.",
  topic_ids: [],
  source_inbox_ids: ["inbox-20260604-001"],
  lead_platform: "linkedin",
  platforms: ["linkedin", "facebook"],
  ip_kit: "day1",
  firewall_check: "not_run",
  slop_check: "not_run",
  voice_check: "not_run",
  draft_path: null,
  published_urls: {},
  notes: "",
};

const inbox: InboxRecord = {
  id: "inbox-20260604-001",
  captured_at: "2026-06-04T10:00:00+07:00",
  source: "manual",
  raw: "A local dashboard should use Codex CLI and save source-backed artifacts.",
  url: null,
  media_path: null,
  initial_format: "field_note",
  firewall_risk: "clear",
  status: "triaged",
};

function fakePng(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(2048, 1);
  Buffer.from("89504e470d0a1a0a", "hex").copy(buffer, 0);
  Buffer.from("IHDR").copy(buffer, 12);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

async function main() {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "arutlee-engine-"));
  const result = await runOneGo({
    piece,
    inboxRecords: [inbox],
    projectRoot,
    proposalId: "20260604-100000",
    now: new Date("2026-06-04T10:00:00+07:00"),
    buildText: async (source) => ({
      title: source.title,
      hook: source.hook,
      body: "A generated master body with enough detail to be edited before publishing. It keeps the claim small and grounded. The useful part is that the dashboard now saves the source, draft, image, QA, and platform copy as files instead of leaving the work trapped in a transient prompt.",
      platformVariants: {
        linkedin: "LinkedIn generated copy",
        facebook: "Facebook generated copy",
      },
      visualPrompt: "A topic-specific editorial hero image for a local Codex content engine.",
      provider: "codex",
    }),
    generateImage: async (_source, spec, paths) => {
      await fs.writeFile(paths.assetPng, fakePng(spec.width, spec.height));
      return {
        provider: "codex-image",
        path: paths.relative.assetPng,
        prompt: spec.prompt,
      };
    },
  });

  if (result.stage !== "ready") throw new Error("engine did not finish ready");
  if (result.image.provider !== "codex-image") throw new Error("image provider not recorded");
  if (result.paths.relative.assetPng !== "pieces/local-codex-content-engine-field-note-20260604-001/proposals/20260604-100000/asset.png") {
    throw new Error(`bad relative asset: ${result.paths.relative.assetPng}`);
  }
  if (result.qa.verdict !== "pass") throw new Error(`expected QA pass, got ${result.qa.verdict}`);

  const text = await fs.readFile(result.paths.textMd, "utf8");
  if (!text.includes("LinkedIn generated copy")) throw new Error("text artifact missing variant");

  const review = JSON.parse(await fs.readFile(result.paths.reviewStateJson, "utf8")) as {
    proposalId: string;
  };
  if (review.proposalId !== "20260604-100000") throw new Error("review state not written");

  await fs.rm(projectRoot, { recursive: true, force: true });
}

main().catch((err) => {
  throw err;
});
