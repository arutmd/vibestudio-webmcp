import { strict as assert } from "node:assert";
import { computeNextAction } from "./nextAction";
import type { PieceRecord } from "./types";

function piece(overrides: Partial<PieceRecord>): PieceRecord {
  return {
    id: "t-1",
    created_at: "2026-06-10T10:00:00+07:00",
    status: "idea",
    format: "field_note",
    title: "t",
    hook: "",
    topic_ids: [],
    source_inbox_ids: [],
    lead_platform: "facebook",
    platforms: ["facebook"],
    ip_kit: "day1",
    firewall_check: "not_run",
    slop_check: "not_run",
    voice_check: "not_run",
    draft_path: null,
    published_urls: {},
    notes: "",
    ...overrides,
  } as PieceRecord;
}

// no sources and no body -> research
assert.deepEqual(computeNextAction(piece({})), { label: "Research", section: 1 });
// sources but no body -> draft
assert.deepEqual(
  computeNextAction(piece({ source_inbox_ids: ["inbox-1"] })),
  { label: "Draft", section: 2 },
);
// body but no image -> image
assert.deepEqual(
  computeNextAction(piece({ source_inbox_ids: ["inbox-1"], body: "text" })),
  { label: "Generate image", section: 3 },
);
// image but checks not all passing -> audit
assert.deepEqual(
  computeNextAction(piece({ source_inbox_ids: ["inbox-1"], body: "text", hero_image_path: "p.png" })),
  { label: "Audit", section: 4 },
);
// engine asset also counts as an image
assert.deepEqual(
  computeNextAction(piece({ source_inbox_ids: ["inbox-1"], body: "text", engine_asset_path: "a.png" })),
  { label: "Audit", section: 4 },
);
// carousel mode requires every slide to be rendered, even when a hero exists
assert.deepEqual(
  computeNextAction(
    piece({
      source_inbox_ids: ["inbox-1"],
      body: "text",
      visual_output: "carousel",
      hero_image_path: "p.png",
      carousel: [
        { index: 1, kind: "cover", title: "one", body: "", visual_cue: "scene", asset_path: "one.png" },
        { index: 2, kind: "outro", title: "two", body: "", visual_cue: "scene" },
      ],
    }),
  ),
  { label: "Generate image", section: 3 },
);
assert.deepEqual(
  computeNextAction(
    piece({
      source_inbox_ids: ["inbox-1"],
      body: "text",
      visual_output: "carousel",
      carousel: [
        { index: 1, kind: "cover", title: "one", body: "", visual_cue: "scene", asset_path: "one.png" },
        { index: 2, kind: "outro", title: "two", body: "", visual_cue: "scene", asset_path: "two.png" },
      ],
    }),
  ),
  { label: "Audit", section: 4 },
);
// all checks pass, not scheduled -> pack and schedule
assert.deepEqual(
  computeNextAction(
    piece({
      source_inbox_ids: ["inbox-1"], body: "text", hero_image_path: "p.png",
      firewall_check: "pass", slop_check: "pass", voice_check: "pass",
    }),
  ),
  { label: "Pack and schedule", section: 5 },
);
// scheduled -> ship
assert.deepEqual(
  computeNextAction(
    piece({
      source_inbox_ids: ["inbox-1"], body: "text", hero_image_path: "p.png",
      firewall_check: "pass", slop_check: "pass", voice_check: "pass",
      scheduled_for: "2026-06-12T09:00:00+07:00", status: "scheduled",
    }),
  ),
  { label: "Ship", section: 5 },
);
// published -> null (nothing to do)
assert.equal(computeNextAction(piece({ status: "published" })), null);

console.log("nextAction.test.ts ok");
