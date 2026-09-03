import { buildCarouselSlideHtml } from "./carouselRenderer";
import type { CarouselSlide } from "./types";

const slide: CarouselSlide = {
  index: 1,
  kind: "cover",
  title: "AI <script>alert(1)</script>",
  body: "ภาพที่หยุดนิ้ว แล้วค่อยเล่าเรื่อง",
  bullets: ["specific", "useful"],
  visual_cue: "phone scene",
};
const html = buildCarouselSlideHtml({
  piece: { format: "field_note", title: "Demo" },
  slide,
  deckLength: 8,
});
if (html.includes("<script>alert")) throw new Error("slide HTML did not escape title");
if (!html.includes("01 / 08")) throw new Error("slide count missing");
if (!html.includes("Noto Sans Thai")) throw new Error("Thai font stack missing");
if (!html.includes("ARUTLEE / COVER")) throw new Error("cover metadata missing");
