import assert from "node:assert/strict";
import { buildTemplateBackgroundPrompt } from "./templateBackground";

const prompt = buildTemplateBackgroundPrompt({
  direction: "Warm editorial paper with monochrome documentary imagery.",
  variability: "balanced",
  composition: "text-left",
  referenceName: "reference.png",
});

assert.match(prompt, /Warm editorial paper/);
assert.match(prompt, /recognizable/);
assert.match(prompt, /left half/);
assert.match(prompt, /reference\.png/);
assert.match(prompt, /text-free background layer/);

const originalPrompt = buildTemplateBackgroundPrompt({
  direction: "Clinical product photography.",
  variability: "locked",
  composition: "quiet-top",
});

assert.match(originalPrompt, /Create an original visual/);
assert.doesNotMatch(originalPrompt, /supplied reference/);

console.log("templateBackground tests passed");
