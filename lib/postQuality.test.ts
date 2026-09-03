import type { PieceRecord } from "./types";
import { summarizePostQuality } from "./postQuality";

const basePiece: PieceRecord = {
  id: "field-note-test",
  created_at: "2026-05-25T09:00:00+07:00",
  status: "draft",
  format: "field_note",
  title: "Voice AI is becoming an action layer",
  hook: "Voice AI is not only about sounding human.",
  topic_ids: [],
  source_inbox_ids: ["inbox-test"],
  lead_platform: "facebook",
  platforms: ["facebook", "linkedin"],
  ip_kit: "day1",
  firewall_check: "pass",
  slop_check: "pass",
  voice_check: "pass",
  draft_path: null,
  published_urls: {},
  notes: "",
  body: "A useful field note with enough text to judge.",
  platform_variants: {
    facebook: "Facebook-ready copy",
    linkedin: "LinkedIn-ready copy",
  },
  visual_prompt: "Create a text-free base image with lower 42% clean for overlay.",
  hero_image_path: "pieces/test/hero.png",
  cover_visual_mode: "product_ui",
  scheduled_for: "2026-05-25T09:00:00+07:00",
};

const ready = summarizePostQuality(basePiece);
if (!ready.canApprove) throw new Error("expected complete piece to be approvable");

const missingImage = summarizePostQuality({ ...basePiece, hero_image_path: undefined });
if (missingImage.canApprove) throw new Error("expected image-less piece to be locked");

const missingImageDiscipline = summarizePostQuality({
  ...basePiece,
  visual_prompt: undefined,
  cover_visual_mode: undefined,
});
if (missingImageDiscipline.canApprove) {
  throw new Error("expected image without generation discipline to be locked");
}

const carouselPiece: PieceRecord = {
  ...basePiece,
  visual_output: "carousel",
  hero_image_path: undefined,
  cover_visual_mode: undefined,
  visual_prompt: undefined,
  carousel: [
    {
      index: 1,
      kind: "cover",
      title: "Hook",
      body: "",
      visual_cue: "specific cover scene",
      asset_path: "pieces/test/carousel/slide-01.png",
    },
    {
      index: 2,
      kind: "outro",
      title: "Takeaway",
      body: "",
      visual_cue: "specific closing scene",
      asset_path: "pieces/test/carousel/slide-02.png",
    },
  ],
};
const carouselReady = summarizePostQuality(carouselPiece);
if (!carouselReady.canApprove) throw new Error("expected complete carousel to be approvable");

const carouselIncomplete = summarizePostQuality({
  ...carouselPiece,
  carousel: [
    { index: 1, kind: "cover", title: "Hook", body: "", visual_cue: "scene", asset_path: "one.png" },
    { index: 2, kind: "outro", title: "Takeaway", body: "", visual_cue: "scene" },
  ],
});
if (carouselIncomplete.canApprove) throw new Error("expected incomplete carousel to be locked");
