import type { InboxRecord, PieceRecord } from "../types";
import { buildSourcePack, engineSlugForPiece } from "./sourcePack";

const piece: PieceRecord = {
  id: "field-note-20260604-001",
  created_at: "2026-06-04T10:00:00+07:00",
  status: "idea",
  format: "field_note",
  title: "Local Codex engine",
  hook: "The dashboard should make real artifacts.",
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
  raw: "Codex CLI should power a local content engine.",
  url: null,
  media_path: null,
  initial_format: "field_note",
  firewall_risk: "clear",
  status: "triaged",
  image_paths: ["ingredients/local-codex/photos/source.png"],
  ingredients: {
    image_candidates: [
      {
        url: "https://example.com/source.png",
        title: "Source screenshot",
        source: "example.com",
        sourceUrl: "https://example.com/article",
        localPath: "ingredients/local-codex/photos/source.png",
        width: 1200,
        height: 675,
      },
    ],
  },
};

const source = buildSourcePack(piece, [inbox], "2026-06-04T10:00:00+07:00");
if (source.slug !== "local-codex-engine-field-note-20260604-001") {
  throw new Error(`bad slug: ${source.slug}`);
}
if (!source.sourceText.includes(inbox.raw)) throw new Error("source text missing inbox raw");
if (source.references.length < 2) throw new Error("expected source and image references");
if (!source.references.some((ref) => ref.kind === "image" && ref.localPath?.includes("source.png"))) {
  throw new Error("source pack missing local image reference");
}
const imageRef = source.references.find(
  (ref) => ref.kind === "image" && ref.localPath?.includes("source.png"),
);
if (imageRef?.width !== 1200 || imageRef.height !== 675 || imageRef.source !== "example.com") {
  throw new Error("source pack should preserve image quality metadata");
}

const duplicateTitleA = engineSlugForPiece({ ...piece, id: "field-note-20260604-002" });
const duplicateTitleB = engineSlugForPiece({ ...piece, id: "field-note-20260604-003" });
if (duplicateTitleA === duplicateTitleB) throw new Error("duplicate titles should not collide");

const longSource = buildSourcePack(
  piece,
  [
    {
      ...inbox,
      raw: "short raw",
      ingredients: {
        source_text_kind: "transcript",
        source_text: "x".repeat(20_000),
        source_text_chars: 20_000,
      },
    },
  ],
  "2026-06-04T10:00:00+07:00",
);
if (longSource.sourceText.length < 15_000) {
  throw new Error(`source pack should preserve long transcript context, got ${longSource.sourceText.length}`);
}
