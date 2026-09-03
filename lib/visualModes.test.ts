import { buildCoverImagePrompt, getCoverVisualMode } from "./visualModes";

const productPrompt = buildCoverImagePrompt({
  mode: "product_ui",
  title: "ChatGPT Agent update",
  hook: "A dashboard is now the product surface.",
  body: "The post explains how agent workflows move from chat into persistent tools.",
});

if (!productPrompt.includes("text-free base image")) {
  throw new Error("expected prompt to explicitly request a text-free base image");
}
if (!productPrompt.includes("lower 42%")) {
  throw new Error("expected prompt to reserve the lower overlay zone");
}
if (!productPrompt.includes("No Thai text")) {
  throw new Error("expected prompt to ban generated Thai text");
}
if (!productPrompt.includes("product interface")) {
  throw new Error("expected product UI mode to mention product interface direction");
}

const fallbackMode = getCoverVisualMode("not-a-mode");
if (fallbackMode.id !== "product_ui") {
  throw new Error("expected invalid mode to fall back to product_ui");
}

const humanToolPrompt = buildCoverImagePrompt({
  mode: "human_tool",
  title: "NotebookLM workflow",
  hook: "",
  body: "",
});
if (!humanToolPrompt.includes("human using an AI tool")) {
  throw new Error("expected human_tool mode to use human-tool visual direction");
}
