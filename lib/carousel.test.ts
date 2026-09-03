import { buildCarouselVisualPrompt, normalizeCarouselSlides } from "./carousel";
import { activeVisualIsReady, activeVisualPath, carouselIsReady } from "./visualOutput";
import type { CarouselSlide, PieceRecord } from "./types";

const raw: CarouselSlide[] = [
  { index: 9, kind: "section", title: "  Hook  ", body: "First", visual_cue: "Phone" },
  { index: 2, kind: "section", title: "Proof", body: "Second", visual_cue: "Receipt" },
];
const slides = normalizeCarouselSlides(raw, { deckTitle: "Demo", deckHook: "Why it matters" });
if (slides[0].index !== 1 || slides[0].kind !== "cover") throw new Error("cover not normalized");
if (slides[1].index !== 2 || slides[1].kind !== "outro") throw new Error("outro not normalized");
if (!slides[0].visual_prompt?.includes("No Thai text")) throw new Error("text-free prompt missing");

const prompt = buildCarouselVisualPrompt({
  deckTitle: "AI workflow",
  slide: slides[0],
  deckLength: 2,
});
if (!prompt.includes("slide 1 of 2") || !prompt.includes("coherent Arutlee carousel")) {
  throw new Error("deck consistency prompt missing");
}

const base = {
  id: "field-note-20260830-001",
  created_at: "2026-08-30T00:00:00+07:00",
  status: "draft",
  format: "field_note",
  title: "Demo",
  hook: "Hook",
  topic_ids: [],
  source_inbox_ids: ["inbox-1"],
  lead_platform: "instagram",
  platforms: ["instagram"],
  ip_kit: "day1",
  firewall_check: "pass",
  slop_check: "pass",
  voice_check: "pass",
  draft_path: null,
  published_urls: {},
  notes: "",
} satisfies PieceRecord;

const carouselPiece: PieceRecord = {
  ...base,
  visual_output: "carousel",
  hero_image_path: "pieces/demo/hero.png",
  carousel: slides.map((slide) => ({ ...slide, asset_path: `pieces/demo/slide-${slide.index}.png` })),
};
if (!carouselIsReady(carouselPiece)) throw new Error("complete carousel should be ready");
if (!activeVisualIsReady(carouselPiece)) throw new Error("active carousel should be ready");
if (activeVisualPath(carouselPiece) !== "pieces/demo/slide-1.png") throw new Error("wrong active visual");

const incomplete: PieceRecord = {
  ...carouselPiece,
  carousel: carouselPiece.carousel?.map((slide, i) => (i ? { ...slide, asset_path: undefined } : slide)),
};
if (carouselIsReady(incomplete)) throw new Error("incomplete carousel should not be ready");
