export type CoverVisualModeId =
  | "product_ui"
  | "workflow_diagram"
  | "phone_scene"
  | "human_tool"
  | "abstract_launch";

export type CoverVisualMode = {
  id: CoverVisualModeId;
  label: string;
  shortLabel: string;
  direction: string;
  avoid: string;
};

export const COVER_VISUAL_MODES: CoverVisualMode[] = [
  {
    id: "product_ui",
    label: "Product UI",
    shortLabel: "UI",
    direction:
      "a premium product interface or dashboard crop, with plausible recreated UI fragments, glassy depth, crisp panels, and one clear product interface focal point",
    avoid:
      "exact copied logos, unreadable fake app text, generic blue dashboards, floating app windows with no story",
  },
  {
    id: "workflow_diagram",
    label: "Workflow",
    shortLabel: "Flow",
    direction:
      "a cinematic agent workflow scene: connected cards, files, prompts, arrows, and tool states arranged as a believable operating system for work",
    avoid:
      "messy neural-network webs, tiny labels, emoji icons, abstract nodes that could describe any AI post",
  },
  {
    id: "phone_scene",
    label: "Phone Scene",
    shortLabel: "Phone",
    direction:
      "a close editorial phone or laptop scene with a clean recreated interface, hand-scale realism, subtle reflections, and a topic-specific app moment",
    avoid:
      "stock hand holding phone, fake notifications, readable private data, brand logos unless supplied as source material",
  },
  {
    id: "human_tool",
    label: "Human + Tool",
    shortLabel: "Human",
    direction:
      "a human using an AI tool in a calm workspace, seen from behind or hands-only, with the screen or desk setup carrying the story",
    avoid:
      "posed influencer portraits, identifiable faces, generic laptop stock photography, smiling-at-camera scenes",
  },
  {
    id: "abstract_launch",
    label: "Abstract Launch",
    shortLabel: "Abstract",
    direction:
      "a topic-specific abstract launch image with luminous material surfaces, controlled gradients, spatial depth, and one symbolic artifact derived from the post",
    avoid:
      "generic AI brain art, random glowing orbs, starfields, crypto-style gradients, decorative shapes without meaning",
  },
];

export function getCoverVisualMode(mode: string | null | undefined): CoverVisualMode {
  return COVER_VISUAL_MODES.find((item) => item.id === mode) ?? COVER_VISUAL_MODES[0];
}

export function inferCoverVisualMode(input: {
  title?: string | null;
  hook?: string | null;
  body?: string | null;
}): CoverVisualModeId {
  const text = `${input.title ?? ""} ${input.hook ?? ""} ${input.body ?? ""}`.toLowerCase();
  if (/phone|mobile|app|iphone|android|notification|chatgpt app|line/.test(text)) {
    return "phone_scene";
  }
  if (/workflow|agent|automation|pipeline|dashboard|calendar|system|process|flow/.test(text)) {
    return "workflow_diagram";
  }
  if (/human|creator|doctor|student|founder|operator|use|using|hands|desk/.test(text)) {
    return "human_tool";
  }
  if (/launch|model|release|future|frontier|openai|google|anthropic/.test(text)) {
    return "abstract_launch";
  }
  return "product_ui";
}

export function buildCoverImagePrompt(input: {
  mode?: string | null;
  title?: string | null;
  hook?: string | null;
  body?: string | null;
  referenceNotes?: string[];
}): string {
  const mode = getCoverVisualMode(input.mode ?? inferCoverVisualMode(input));
  const topic = [input.title, input.hook]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" - ");
  const body = input.body?.trim().slice(0, 700);
  const references = input.referenceNotes?.filter(Boolean).slice(0, 4) ?? [];

  return [
    `Create a text-free base image for an Arutlee editorial cover about: ${topic || "an AI workflow insight"}.`,
    `Visual mode: ${mode.label}. Direction: ${mode.direction}.`,
    body ? `Post context: ${body}` : "",
    references.length
      ? `Reference cues to use only as factual inspiration, not as copied layouts: ${references.join(" | ")}.`
      : "",
    "Composition: vertical 4:5 master image for a final 1080x1350 social cover. Put the main subject in the upper 58% of the frame. Keep the lower 42% visually calm, darker or simpler, and compatible with a black gradient plus large Thai headline overlay.",
    "Overlay safety: keep the top-left corner calm for a small category badge and the top-right corner calm for a circular profile avatar. Leave enough negative space around all edges for cropping.",
    "Style: premium AI/product editorial image, topic-specific, polished but not stock-like, crisp focal subject, subtle depth, restrained color discipline with warm highlights and clean contrast.",
    "No Thai text, no English text, no headline, no UI labels, no watermark, no logo, no news badge, no generated QR code, no emojis.",
    `Avoid: ${mode.avoid}.`,
    "The final text, avatar, badge, and brand layer will be rendered later by VibeStudio, so the generated image must stay clean and reusable.",
  ]
    .filter(Boolean)
    .join(" ");
}
