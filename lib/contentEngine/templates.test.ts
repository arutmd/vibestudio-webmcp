import type { EngineSourcePack, EngineTextProposal } from "./types";
import { buildVisualSpec, pickTemplate } from "./templates";

const source: EngineSourcePack = {
  pieceId: "field-note-20260604-001",
  slug: "voice-ai-dashboard",
  title: "Voice AI dashboard",
  hook: "Voice is becoming an action layer.",
  format: "field_note",
  platforms: ["linkedin", "facebook"],
  sourceText: "A dashboard interface changed the workflow.",
  notes: "",
  references: [],
  sourceIds: [],
  facts: ["Voice AI is moving from chat into workflow control."],
  createdAt: "2026-06-04T10:00:00+07:00",
};

if (pickTemplate(source).id !== "interface_callout") {
  throw new Error("expected interface template");
}

const proposal: EngineTextProposal = {
  title: "Voice AI dashboard",
  hook: source.hook,
  body: "Short body",
  platformVariants: {},
  visualPrompt: "Render a calm workflow interface.",
  provider: "fallback",
};

const spec = buildVisualSpec(source, proposal);
if (spec.width !== 1080 || spec.height !== 1350) throw new Error("bad output size");
if (spec.subtitle !== source.facts[0]) throw new Error("expected fact subtitle");
