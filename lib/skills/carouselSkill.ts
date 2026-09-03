import { normalizeCarouselSlides } from "../carousel";
import type { CarouselSlide, CreativeSkill } from "../types";
import { ValidationError } from "../validation";

export const CAROUSEL_SKILL: CreativeSkill = {
  id: "carousel-v1",
  version: "1.0.0",
  title: "Original seven-slide carousel",
  purpose: "Turn one source principle and creator context into an original, reviewable visual story.",
  input_contract: [
    "One selected inspiration and the creator's explicit reaction",
    "One bounded VibeStudio Template context receipt",
    "One transformation note describing what changes from the source",
    "Seven structured slides written by the external agent",
  ],
  output_contract: {
    slide_count: 7,
    dimensions: "1080x1350",
    fields: ["index", "kind", "title", "body", "visual_cue", "visual_prompt"],
  },
  quality_rules: [
    "Cover, five interior beats, and a memorable takeaway",
    "One idea per slide with concise copy",
    "Transform the source principle without copying wording, composition, logo, or identity",
    "Use at most three newly generated text-free visual layers by default",
    "Apply final typography and layout deterministically in the VibeStudio renderer",
    "Pass voice, slop, firewall, and source-lineage checks before Ready",
  ],
};

export function validateChallengeCarousel(
  value: unknown,
  input: { deckTitle: string; deckHook?: string },
): CarouselSlide[] {
  if (!Array.isArray(value) || value.length !== CAROUSEL_SKILL.output_contract.slide_count) {
    throw new ValidationError("carousel-v1 requires exactly seven slides");
  }
  const raw = value as CarouselSlide[];
  for (const [position, slide] of raw.entries()) {
    if (!slide || typeof slide !== "object") {
      throw new ValidationError(`slide ${position + 1} must be an object`);
    }
    if (typeof slide.title !== "string" || !slide.title.trim() || slide.title.length > 180) {
      throw new ValidationError(`slide ${position + 1} title is required and must be 180 characters or fewer`);
    }
    if (typeof slide.body !== "string" || slide.body.length > 700) {
      throw new ValidationError(`slide ${position + 1} body must be 700 characters or fewer`);
    }
    if (typeof slide.visual_cue !== "string" || slide.visual_cue.length > 500) {
      throw new ValidationError(`slide ${position + 1} visual_cue must be 500 characters or fewer`);
    }
  }
  const slides = normalizeCarouselSlides(raw, input);
  if (slides.length !== 7) throw new ValidationError("carousel normalization must preserve seven slides");
  slides[0] = { ...slides[0], kind: "cover" };
  slides[6] = { ...slides[6], kind: "outro" };
  return slides;
}
