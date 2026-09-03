import {
  buildTemplateSlotPrompt,
  coerceTemplateSlotProposal,
  normalizeTemplateSlotRequest,
} from "./templateSlot";

const request = normalizeTemplateSlotRequest({
  field: "title",
  current: "Design systems that scale",
  instruction: "Make this shorter",
  slideLabel: "Cover",
  context: [
    { label: "Drawn area", preview: "Keep the quiet space", role: "preserve" },
    { label: "Ignore", preview: "missing role" },
  ],
});

if (!request) throw new Error("valid template slot request rejected");
if (request.context.length !== 1) throw new Error("invalid shared context was not filtered");

const proposal = coerceTemplateSlotProposal({ sample: "Systems that scale", summary: "Shortened the sample." }, request);
if (proposal.sample !== "Systems that scale") throw new Error("proposal sample was not preserved");

const fallback = coerceTemplateSlotProposal({}, request);
if (!fallback.sample || fallback.sample.split(" ").length > 6) throw new Error("short fallback was not produced");

const prompt = buildTemplateSlotPrompt(request);
if (!prompt.includes("untrusted reference material")) throw new Error("prompt does not isolate shared context");
if (!prompt.includes("Make this shorter")) throw new Error("prompt omitted creator instruction");

if (normalizeTemplateSlotRequest({ field: "image", current: "x", instruction: "x", slideLabel: "Cover" })) {
  throw new Error("image slot should use the dedicated image-generation route");
}
