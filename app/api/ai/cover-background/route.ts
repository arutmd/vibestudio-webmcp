import { NextRequest, NextResponse } from "next/server";
import { generateCoverBackgroundWithCodex } from "@/lib/codexImage";
import { isValidId } from "@/lib/jsonl";

export const dynamic = "force-dynamic";

function cleanPrompt(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\b(render|write|add)\s+(thai|english)?\s*(headline|text|logo|watermark)s?\b/gi, "")
    .trim()
    .slice(0, 1800);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | {
        pieceId?: string;
        prompt?: string;
        headline?: string;
      }
    | null;
  const pieceId = body?.pieceId;
  if (!pieceId || !isValidId(pieceId)) {
    return NextResponse.json({ error: "valid pieceId required" }, { status: 400 });
  }
  const prompt = cleanPrompt(body?.prompt || "");
  if (!prompt) {
    return NextResponse.json({ error: "background prompt required" }, { status: 400 });
  }

  const result = await generateCoverBackgroundWithCodex({
    pieceId,
    prompt,
    headline: body?.headline,
  });

  if (!result.path) {
    return NextResponse.json(
      {
        error: result.timedOut
          ? "Codex imagegen timed out before it produced a file."
          : "Codex imagegen did not produce a usable image file.",
        timedOut: result.timedOut,
        exitCode: result.exitCode,
        stderr: result.stderr.slice(-1200),
        stdout: result.stdout.slice(-1200),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    path: result.path,
    prompt: result.prompt,
    timedOut: result.timedOut,
    exitCode: result.exitCode,
  });
}
