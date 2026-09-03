import { NextRequest, NextResponse } from "next/server";
import { callClaude, resolveEngine, safeJSON } from "@/lib/claude";
import { hookVariantsPrompt, SYSTEM_BRIEF } from "@/lib/prompts";

export const dynamic = "force-dynamic";

type Hook = {
  text: string;
  angle: string;
  fit_for: string[];
};

const FALLBACK_HOOKS: Hook[] = [
  {
    text: "เพิ่งเจอเคสนี้คืนนี้เอง",
    angle: "origin-moment",
    fit_for: ["linkedin", "facebook", "instagram"],
  },
  {
    text: "ผมลองมาแล้ว 1 อาทิตย์",
    angle: "specific-receipt",
    fit_for: ["linkedin", "facebook"],
  },
  {
    text: "ของส่วนใหญ่ที่บอกกัน wrong กว่าที่คิด",
    angle: "contrarian",
    fit_for: ["linkedin", "tiktok"],
  },
];

export async function POST(req: NextRequest) {
  let body: { body?: string; format?: string; count?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.body) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }

  if ((await resolveEngine()).engine === "none") {
    return NextResponse.json({ hooks: FALLBACK_HOOKS, fallback: true });
  }

  try {
    const text = await callClaude({
      system: SYSTEM_BRIEF,
      cacheSystem: true,
      messages: [
        {
          role: "user",
          content: hookVariantsPrompt({
            body: body.body,
            format: body.format ?? "field_note",
            count: body.count,
          }),
        },
      ],
      maxTokens: 1500,
    });
    const parsed = safeJSON<{ hooks: Hook[] }>(text, { hooks: [] });
    if (!parsed.hooks?.length) {
      return NextResponse.json({ hooks: FALLBACK_HOOKS, fallback: true });
    }
    return NextResponse.json({ hooks: parsed.hooks });
  } catch (err) {
    return NextResponse.json({
      hooks: FALLBACK_HOOKS,
      fallback: true,
      warning: (err as Error).message,
    });
  }
}
