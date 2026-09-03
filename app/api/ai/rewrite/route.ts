import { NextRequest, NextResponse } from "next/server";
import { callClaude, resolveEngine } from "@/lib/claude";

export const dynamic = "force-dynamic";

const PRESETS: Record<string, string> = {
  punchier:
    "Rewrite to be punchier and more direct. Keep the same meaning, language mix, and length or shorter.",
  shorter:
    "Cut this down by roughly half. Keep the core point and the same language mix.",
  fix: "Fix grammar and awkward phrasing only. Do not change voice, meaning, or language mix.",
  translate_th:
    "Translate to natural spoken Thai in Palm's code-switched register. Keep clinical or technical English terms in English. No formal ministry Thai.",
  translate_en:
    "Translate to natural professional English. Keep it concrete and plain.",
  regenerate:
    "Rewrite this section from scratch with the same intent and facts, in the same voice. Do not invent new facts.",
};

export async function POST(req: NextRequest) {
  let body: { text?: unknown; instruction?: unknown; voiceProfile?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text : "";
  const rawInstruction =
    typeof body.instruction === "string" ? body.instruction : "";

  if (!text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (!rawInstruction.trim()) {
    return NextResponse.json(
      { error: "instruction is required" },
      { status: 400 },
    );
  }

  const instruction = PRESETS[rawInstruction] ?? rawInstruction;
  const voiceProfile =
    typeof body.voiceProfile === "string" ? body.voiceProfile : "";

  if ((await resolveEngine()).engine === "none") {
    return NextResponse.json({ rewritten: text, fallback: true });
  }

  const systemParts = [
    "You rewrite short passages of social content for Palm (Arutlee).",
    "Rules: no em-dashes anywhere. No hype vocabulary. Keep concrete numbers and caveats.",
    "Keep Thai-English code-switching where the input has it.",
    voiceProfile ? `Match this voice profile:\n${voiceProfile}` : "",
    "Return ONLY the rewritten text. No preamble, no quotes, no markdown fences.",
  ].filter(Boolean);
  const system = systemParts.join("\n");

  try {
    const rewritten = await callClaude({
      system,
      messages: [
        {
          role: "user",
          content: `${instruction}\n\n---\n${text}`,
        },
      ],
      maxTokens: 2000,
    });
    return NextResponse.json({ rewritten: rewritten.trim() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "rewrite failed" },
      { status: 500 },
    );
  }
}
