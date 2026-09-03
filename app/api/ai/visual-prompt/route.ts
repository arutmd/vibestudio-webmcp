import { NextRequest, NextResponse } from "next/server";
import { callClaude, resolveEngine } from "@/lib/claude";
import { visualPromptPrompt, SYSTEM_BRIEF } from "@/lib/prompts";
import { buildCoverImagePrompt } from "@/lib/visualModes";
import type { CaptureImageCandidate } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { body, format, mode, imageCandidates } = (await req.json()) as {
    body: string;
    format: string;
    mode?: string;
    imageCandidates?: CaptureImageCandidate[];
  };
  if (!body) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }
  if ((await resolveEngine()).engine === "none") {
    return NextResponse.json({
      prompt: buildCoverImagePrompt({ mode, body }),
      fallback: true,
    });
  }
  const prompt = await callClaude({
    system: SYSTEM_BRIEF,
    cacheSystem: true,
    messages: [
      {
        role: "user",
        content: visualPromptPrompt({
          body,
          format,
          mode,
          imageCandidates: imageCandidates?.slice(0, 5),
        }),
      },
    ],
    maxTokens: 600,
  });
  return NextResponse.json({ prompt });
}
