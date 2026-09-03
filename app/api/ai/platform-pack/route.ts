import { NextRequest, NextResponse } from "next/server";
import { callClaude, resolveEngine, safeJSON } from "@/lib/claude";
import { platformPackPrompt, SYSTEM_BRIEF } from "@/lib/prompts";
import type { PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { body, platforms, format } = (await req.json()) as {
    body: string;
    platforms: PlatformId[];
    format: string;
  };
  if (!body || !platforms?.length) {
    return NextResponse.json({ error: "body and platforms required" }, { status: 400 });
  }
  if ((await resolveEngine()).engine === "none") {
    // Fallback: use the same body across platforms with a small platform-prefix
    // header so the user sees the layout is intentional and can hand-edit.
    const variants: Partial<Record<PlatformId, string>> = {};
    for (const p of platforms) {
      variants[p] = `[${p.toUpperCase()} variant; AI key not configured, using source body verbatim.]\n\n${body}`;
    }
    return NextResponse.json({ variants, fallback: true });
  }
  const text = await callClaude({
    system: SYSTEM_BRIEF,
    cacheSystem: true,
    messages: [{ role: "user", content: platformPackPrompt({ body, platforms, format }) }],
    maxTokens: 3000,
  });
  const parsed = safeJSON<{ variants: Record<string, string> }>(text, { variants: {} });
  return NextResponse.json({ variants: parsed.variants, raw: text });
}
