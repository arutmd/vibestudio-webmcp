import type { EngineSourcePack } from "./types";
import {
  buildCodexTextPrompt,
  buildFallbackTextProposal,
  buildTextProposalWithCodex,
  coerceTextProposal,
} from "./textProposal";

const source: EngineSourcePack = {
  pieceId: "field-note-20260604-001",
  slug: "demo",
  title: "Local Codex content engine",
  hook: "The dashboard should run locally.",
  format: "field_note",
  platforms: ["linkedin", "facebook"],
  sourceText: "Codex CLI can run as the local model layer.",
  notes: "",
  references: [],
  sourceIds: [],
  facts: ["Local API calls should save real artifacts."],
  createdAt: "2026-06-04T10:00:00+07:00",
};

const prompt = buildCodexTextPrompt(source);
if (!prompt.includes("Return one strict JSON object only")) throw new Error("prompt is not strict");
if (!prompt.includes(source.sourceText)) throw new Error("prompt missing source text");
if (!prompt.includes("Write like Palm thinking out loud")) {
  throw new Error("prompt should steer toward Palm's natural voice");
}
if (!prompt.includes('"the signal is"') || !prompt.includes("over-explaining obvious business implications")) {
  throw new Error("prompt should explicitly block generic AI business-post language");
}
if (!prompt.includes("Make the writer's lens visible") || !prompt.includes("Tell news straight")) {
  throw new Error("prompt should require a Palm lens and straight news-telling");
}
if (!prompt.includes("at most ONE light attribution line")) {
  throw new Error("prompt should cap hedging at one attribution line for explainers");
}
if (!prompt.includes("content engine / workflow / personalization") || !prompt.includes("Do not write self-doubt disclaimers")) {
  throw new Error("prompt should anchor Palm's lens and block self-doubt disclaimers");
}
if (!prompt.includes("stacked hedging")) {
  throw new Error("prompt should block stacked hedging");
}
if (!prompt.includes("news explainer") || !prompt.includes("Do not write a pure dump of the source")) {
  throw new Error("prompt should allow useful explainers while blocking source dumps");
}
if (!prompt.includes("emoji bullets") || !prompt.includes("production primitive")) {
  throw new Error("prompt should block copycat explainer packaging and clever LinkedIn framing");
}
if (!prompt.includes("committed takeaway")) {
  throw new Error("prompt should require a committed takeaway");
}
if (!prompt.includes('unsupported certainty like "แน่"')) {
  throw new Error("prompt should block unsupported certainty");
}
if (!prompt.includes('Never use "—" or "–"')) {
  throw new Error("prompt should block em dash and en dash usage");
}

const fallback = buildFallbackTextProposal(source, "offline");
if (fallback.provider !== "fallback") throw new Error("expected fallback provider");
if (!fallback.platformVariants.linkedin) throw new Error("missing fallback variant");

const coerced = coerceTextProposal(
  {
    title: "Generated",
    hook: "Generated hook — with dash",
    body: "Generated body – with dash",
    platformVariants: { linkedin: "LI — dash", facebook: "FB" },
    visualPrompt:
      "Show a UI with readable Thai labels, add a logo, and include a headline badge.",
  },
  source,
);
if (/readable|logo|headline|badge/i.test(coerced.visualPrompt)) {
  throw new Error(`unsafe visual prompt was not cleaned: ${coerced.visualPrompt}`);
}
if (/[—–]/.test(`${coerced.hook}\n${coerced.body}\n${coerced.platformVariants.linkedin}`)) {
  throw new Error("coerced post text should remove em dash and en dash");
}

async function main() {
  const generated = await buildTextProposalWithCodex(source, async () => ({
    title: "Generated",
    hook: "Generated hook",
    body: "Generated body",
    platformVariants: { linkedin: "LI", facebook: "FB" },
    visualPrompt: "Hero image brief",
  }));
  if (generated.provider !== "codex") throw new Error("expected codex provider");
  if (generated.platformVariants.facebook !== "FB") throw new Error("bad platform variant");
}

main().catch((err) => {
  throw err;
});
