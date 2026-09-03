import { selectPrimaryResearchSource } from "./fetchIngredients";
import type { ResearchSource } from "./research";

function source(patch: Partial<ResearchSource>): ResearchSource {
  return {
    url: "https://example.com/post",
    title: "Example",
    description: "Example description",
    body: "x".repeat(2_000),
    siteName: "Example",
    fetchedAt: "2026-06-10T00:00:00+07:00",
    ...patch,
  };
}

const selected = selectPrimaryResearchSource([
  source({
    url: "https://random-ai-blog.example/claude-fable",
    title: "Random Claude Fable take",
    body: "x".repeat(8_000),
  }),
  source({
    url: "https://www.anthropic.com/news/claude-fable-5-mythos-5",
    title: "Claude Fable 5 and Claude Mythos 5",
    body: "x".repeat(2_000),
    siteName: null,
  }),
]);

if (!selected?.url.includes("anthropic.com/news/claude-fable-5-mythos-5")) {
  throw new Error("official Anthropic source should win primary-source promotion");
}

const tooThin = selectPrimaryResearchSource([
  source({
    url: "https://www.anthropic.com/news/claude-fable-5-mythos-5",
    body: "too short",
  }),
]);

if (tooThin) {
  throw new Error("primary-source promotion should reject tiny research snippets");
}
