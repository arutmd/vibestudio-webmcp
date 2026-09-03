import { NextRequest, NextResponse } from "next/server";
import { callClaude, resolveEngine, safeJSON } from "@/lib/claude";
import { clipScriptsPrompt, SYSTEM_BRIEF } from "@/lib/prompts";

export const dynamic = "force-dynamic";

type Clip = {
  title: string;
  duration_sec: number;
  script: string;
  on_screen: string;
  best_platform: string;
};

function fallbackClips(body: string): Clip[] {
  const sentences = body
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [0, 1, 2].map((i) => ({
    title: `Clip ${i + 1}`,
    duration_sec: 60,
    script: sentences.slice(i * 2, i * 2 + 3).join(" ") || sentences.join(" ").slice(0, 480),
    on_screen: sentences[i] ?? "",
    best_platform: ["instagram", "tiktok", "linkedin"][i] ?? "instagram",
  }));
}

export async function POST(req: NextRequest) {
  let requestBody: { body?: string; count?: number };
  try {
    requestBody = (await req.json()) as typeof requestBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!requestBody.body) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }
  const body = requestBody.body;
  const count = requestBody.count;
  if ((await resolveEngine()).engine === "none") {
    return NextResponse.json({ clips: fallbackClips(body), fallback: true });
  }
  try {
    const text = await callClaude({
      system: SYSTEM_BRIEF,
      cacheSystem: true,
      messages: [{ role: "user", content: clipScriptsPrompt({ body, count }) }],
      maxTokens: 2000,
    });
    const parsed = safeJSON<{ clips: Clip[] }>(text, { clips: [] });
    if (!parsed.clips?.length) {
      return NextResponse.json({ clips: fallbackClips(body), fallback: true });
    }
    return NextResponse.json({ clips: parsed.clips });
  } catch (err) {
    return NextResponse.json({
      clips: fallbackClips(body),
      fallback: true,
      warning: (err as Error).message,
    });
  }
}
