import { NextRequest, NextResponse } from "next/server";
import { callClaude, resolveEngine, safeJSON } from "@/lib/claude";
import { ideatePrompt, SYSTEM_BRIEF } from "@/lib/prompts";
import { runFirewall, firewallVerdict } from "@/lib/firewall";
import type { PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

type Idea = {
  title: string;
  format: "field_note" | "casefile" | "filter" | "anchor" | "experiment";
  hook: string;
  rationale: string;
  firewall_risk: "clear" | "near_miss" | "blocked";
  topic_ids: string[];
};

export async function POST(req: NextRequest) {
  const { inboxRaw, source, topicHints, platforms } = (await req.json()) as {
    inboxRaw: string;
    source: string;
    topicHints?: string[];
    platforms?: PlatformId[];
  };
  if (!inboxRaw) {
    return NextResponse.json({ error: "inboxRaw required" }, { status: 400 });
  }

  if ((await resolveEngine()).engine === "none") {
    // Deterministic fallback — surfaces the capture as 1 Field Note candidate
    // and runs the rule-based firewall so the user still gets a useful read.
    const firewall = runFirewall(inboxRaw);
    const verdict = firewallVerdict(firewall);
    const idea: Idea = {
      title: inboxRaw.slice(0, 60).replace(/\s+/g, " ").trim(),
      format: "field_note",
      hook: inboxRaw.slice(0, 100).replace(/\s+/g, " ").trim(),
      rationale:
        "AI key not configured. This is the deterministic suggestion: turn the raw capture into a Field Note seed and run the AI ideation when the key is set.",
      firewall_risk: verdict === "fail" ? "blocked" : verdict === "near_miss" ? "near_miss" : "clear",
      topic_ids: [],
    };
    return NextResponse.json({ ideas: [idea], fallback: true });
  }

  const text = await callClaude({
    system: SYSTEM_BRIEF,
    cacheSystem: true,
    messages: [{ role: "user", content: ideatePrompt({ inboxRaw, source, topicHints, platforms }) }],
    maxTokens: 1500,
  });
  const parsed = safeJSON<{ ideas: Idea[] }>(text, { ideas: [] });
  return NextResponse.json({ ideas: parsed.ideas, raw: text });
}
