import type { CarouselSlide } from "./types";

export function normalizeCarouselSlides(
  slides: CarouselSlide[],
  input: { deckTitle: string; deckHook?: string },
): CarouselSlide[] {
  const ordered = slides
    .filter((slide) => slide && typeof slide.title === "string")
    .slice(0, 12)
    .map((slide, position) => {
      const normalized: CarouselSlide = {
        ...slide,
        index: position + 1,
        kind:
          position === 0
            ? "cover"
            : position === slides.length - 1
              ? "outro"
              : slide.kind,
        title: slide.title.trim().slice(0, 180),
        body: (slide.body ?? "").trim().slice(0, 700),
        bullets: slide.bullets?.map((item) => item.trim()).filter(Boolean).slice(0, 5),
        visual_cue: (slide.visual_cue ?? "").trim().slice(0, 500),
      };
      return {
        ...normalized,
        visual_prompt:
          slide.visual_prompt?.trim() ||
          buildCarouselVisualPrompt({
            deckTitle: input.deckTitle,
            deckHook: input.deckHook,
            slide: normalized,
            deckLength: Math.min(slides.length, 12),
          }),
        image_provider: slide.image_provider ?? "none",
      };
    });
  return ordered;
}

export function buildCarouselVisualPrompt(input: {
  deckTitle: string;
  deckHook?: string;
  slide: CarouselSlide;
  deckLength: number;
}): string {
  const { deckTitle, deckHook, slide, deckLength } = input;
  const role = slide.kind === "cover" ? "scroll-stopping cover" : slide.kind === "outro" ? "memorable closing image" : "editorial evidence image";
  return [
    `Create a text-free ${role} for slide ${slide.index} of ${deckLength} in one coherent Arutlee carousel about: ${deckTitle}.`,
    deckHook ? `Deck promise: ${deckHook}.` : "",
    `This slide communicates: ${slide.title}.`,
    slide.body ? `Meaning to support visually: ${slide.body.slice(0, 320)}.` : "",
    slide.visual_cue ? `Visual direction: ${slide.visual_cue}.` : "",
    "Keep the same visual world across the deck: premium Thai AI and product editorial, medical-chart precision meets product teardown, off-white lab paper, ink black, and a restrained red accent.",
    "Make the subject specific to this slide, with one unmistakable focal idea and strong depth. Avoid generic AI brains, robots, glowing orbs, random dashboards, stock photography, and decorative shapes without meaning.",
    slide.kind === "cover"
      ? "Composition: vertical 4:5. Put the main visual in the upper 58 percent and keep the lower 42 percent calm for a large Thai headline overlay."
      : "Composition: vertical 4:5. Reserve a clean lower half for Thai title and body overlays. Keep the upper visual readable when cropped inside a carousel slide.",
    "No Thai text, no English text, no letters, no logo, no watermark, no labels, no captions, and no fake interface copy inside the generated image.",
  ]
    .filter(Boolean)
    .join(" ");
}
