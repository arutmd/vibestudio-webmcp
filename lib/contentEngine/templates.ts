import type {
  EngineSourcePack,
  EngineTextProposal,
  EngineVisualSpec,
  EngineVisualTemplate,
  EngineVisualTemplateId,
} from "./types";

export const VISUAL_TEMPLATES: Record<EngineVisualTemplateId, EngineVisualTemplate> = {
  operator_note: {
    id: "operator_note",
    label: "Operator note",
    background: "#f7f5ef",
    panel: "#111111",
    accent: "#1b8f6a",
    text: "#f8f7f2",
    muted: "#bcb7aa",
  },
  interface_callout: {
    id: "interface_callout",
    label: "Interface callout",
    background: "#eef3f1",
    panel: "#18332d",
    accent: "#e46f3d",
    text: "#fbfbf7",
    muted: "#c2d2cb",
  },
  source_card: {
    id: "source_card",
    label: "Source card",
    background: "#f5f0e8",
    panel: "#2c241f",
    accent: "#3d78a6",
    text: "#fffaf1",
    muted: "#d6cbbd",
  },
};

export function pickTemplate(source: EngineSourcePack): EngineVisualTemplate {
  const text = `${source.title} ${source.hook} ${source.sourceText}`.toLowerCase();
  if (text.includes("ui") || text.includes("dashboard") || text.includes("interface")) {
    return VISUAL_TEMPLATES.interface_callout;
  }
  if (source.references.length > 0) return VISUAL_TEMPLATES.source_card;
  return VISUAL_TEMPLATES.operator_note;
}

export function buildVisualSpec(
  source: EngineSourcePack,
  proposal: EngineTextProposal,
): EngineVisualSpec {
  const palette = pickTemplate(source);
  const firstFact = source.facts[0] ?? proposal.hook;
  return {
    templateId: palette.id,
    width: 1080,
    height: 1350,
    title: proposal.title || source.title,
    subtitle: firstFact,
    badge: source.format.replace(/_/g, " "),
    footer: source.platforms.join(" / "),
    prompt: proposal.visualPrompt,
    palette,
  };
}
