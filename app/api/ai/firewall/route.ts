import { NextRequest, NextResponse } from "next/server";
import { callClaude, resolveEngine, safeJSON } from "@/lib/claude";
import { firewallPrompt, SYSTEM_BRIEF } from "@/lib/prompts";
import { runFirewall, firewallVerdict, type FirewallHit } from "@/lib/firewall";
import { runSlopTest, slopVerdict, type SlopHit } from "@/lib/slop";
import { runVoiceCheck, voiceVerdict, type VoiceHit } from "@/lib/voice";

export const dynamic = "force-dynamic";

type CheckBlock = { verdict: "pass" | "near_miss" | "fail"; reasons: string[] };

export async function POST(req: NextRequest) {
  const { body } = (await req.json()) as { body: string };
  if (!body) return NextResponse.json({ error: "body required" }, { status: 400 });

  // Step 1: rule-based pass. This is the deterministic floor — runs even with
  // no API key. The AI pass below adds qualitative judgment on top.
  const slopHits: SlopHit[] = runSlopTest(body);
  const fwHits: FirewallHit[] = runFirewall(body);
  const voiceHits: VoiceHit[] = runVoiceCheck(body);

  const ruleResult = {
    slop: {
      verdict: slopVerdict(slopHits),
      reasons: slopHits.map((h) => `[${h.severity}] ${h.message}`),
    } as CheckBlock,
    firewall: {
      verdict: firewallVerdict(fwHits),
      reasons: fwHits.map((h) => `[${h.severity}] ${h.reason}`),
    } as CheckBlock,
    voice: {
      verdict: voiceVerdict(voiceHits),
      reasons: voiceHits.map((h) => `[${h.severity}] ${h.message}`),
    } as CheckBlock,
  };

  // If no engine is available, return rules-only.
  if ((await resolveEngine()).engine === "none") {
    const overall: CheckBlock["verdict"] = ((): CheckBlock["verdict"] => {
      if ([ruleResult.slop, ruleResult.firewall, ruleResult.voice].some((b) => b.verdict === "fail")) return "fail";
      if ([ruleResult.slop, ruleResult.firewall, ruleResult.voice].some((b) => b.verdict === "near_miss")) return "near_miss";
      return "pass";
    })();
    return NextResponse.json({
      ...ruleResult,
      quick_test: { verdict: "not_run" as const, reasons: ["No AI engine configured."] },
      overall,
      fix_suggestions: ruleResult.slop.reasons.concat(ruleResult.firewall.reasons, ruleResult.voice.reasons),
      fallback: true,
    });
  }

  // Step 2: AI pass for qualitative checks.
  const text = await callClaude({
    system: SYSTEM_BRIEF,
    cacheSystem: true,
    messages: [{ role: "user", content: firewallPrompt({ body }) }],
    maxTokens: 1500,
  });
  const ai = safeJSON<{
    slop: CheckBlock;
    firewall: CheckBlock;
    voice: CheckBlock;
    quick_test: CheckBlock;
    overall: CheckBlock["verdict"];
    fix_suggestions: string[];
  }>(text, {
    slop: ruleResult.slop,
    firewall: ruleResult.firewall,
    voice: ruleResult.voice,
    quick_test: { verdict: "near_miss", reasons: ["AI returned unparseable response."] },
    overall: "near_miss",
    fix_suggestions: [],
  });

  // Merge: take the worse of rule-based vs AI for each category. The rule
  // floor is binary; the AI cannot override a rule failure to pass.
  const worse = (a: CheckBlock["verdict"], b: CheckBlock["verdict"]): CheckBlock["verdict"] => {
    const order = { fail: 3, near_miss: 2, pass: 1 } as const;
    return order[a] >= order[b] ? a : b;
  };

  const merged = {
    slop: {
      verdict: worse(ruleResult.slop.verdict, ai.slop.verdict),
      reasons: [...ruleResult.slop.reasons, ...ai.slop.reasons.map((r) => `[ai] ${r}`)],
    },
    firewall: {
      verdict: worse(ruleResult.firewall.verdict, ai.firewall.verdict),
      reasons: [...ruleResult.firewall.reasons, ...ai.firewall.reasons.map((r) => `[ai] ${r}`)],
    },
    voice: {
      verdict: worse(ruleResult.voice.verdict, ai.voice.verdict),
      reasons: [...ruleResult.voice.reasons, ...ai.voice.reasons.map((r) => `[ai] ${r}`)],
    },
    quick_test: ai.quick_test,
  };

  const overall = (() => {
    const verdicts = [merged.slop.verdict, merged.firewall.verdict, merged.voice.verdict, merged.quick_test.verdict];
    if (verdicts.some((v) => v === "fail")) return "fail";
    if (verdicts.some((v) => v === "near_miss")) return "near_miss";
    return "pass";
  })();

  return NextResponse.json({ ...merged, overall, fix_suggestions: ai.fix_suggestions });
}
