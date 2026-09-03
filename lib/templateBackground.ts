export const templateBackgroundVariabilities = ["locked", "balanced", "exploratory"] as const;
export const templateBackgroundCompositions = ["quiet-top", "text-left", "centered"] as const;

export type TemplateBackgroundVariability = (typeof templateBackgroundVariabilities)[number];
export type TemplateBackgroundComposition = (typeof templateBackgroundCompositions)[number];

const variabilityDirections: Record<TemplateBackgroundVariability, string> = {
  locked: "Stay very close to the same palette, lighting, material, and composition on every generation.",
  balanced: "Keep the visual system recognizable while allowing the subject and supporting forms to adapt to each story.",
  exploratory: "Preserve the core art direction, but allow bolder changes in subject, framing, and metaphor between generations.",
};

const compositionDirections: Record<TemplateBackgroundComposition, string> = {
  "quiet-top": "Keep the upper half calm and place the main visual weight in the lower-right area.",
  "text-left": "Reserve the left half as a quiet text-safe area and place the focal subject on the right.",
  centered: "Use a centered focal composition with enough negative space around the subject for flexible overlays.",
};

export function buildTemplateBackgroundPrompt(input: {
  direction: string;
  variability: TemplateBackgroundVariability;
  composition: TemplateBackgroundComposition;
  referenceName?: string;
}): string {
  const reference = input.referenceName?.trim()
    ? `Use the supplied reference (${input.referenceName.trim()}) as visual guidance only. Do not reproduce it literally.`
    : "Create an original visual from the art direction below.";

  return [
    input.direction.trim(),
    variabilityDirections[input.variability],
    compositionDirections[input.composition],
    reference,
    "This is a sample for testing a reusable template system. Generate only the text-free background layer; do not render any sample headline, logo, label, frame, or watermark.",
  ]
    .filter(Boolean)
    .join("\n");
}
