import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { callClaude, resolveEngine, safeJSON } from "@/lib/claude";
import { AVOID_RULES, FORMAT_RULES, VOICE_RULES } from "@/lib/contentEngine/textProposal";
import { append, nowIso } from "@/lib/jsonl";
import { DATA_DIR } from "@/lib/paths";

export const dynamic = "force-dynamic";

// Whole-post revision from free-form feedback, the same loop Palm runs in a
// chat session ("ยังสั้นไป", "เอาประโยคแบบนี้ออก"). Revises the Thai master and
// the English rendition together so they never drift apart. Every
// feedback -> revision pair is logged to data/feedback.jsonl as raw material
// for the silent-learning store (decision E5 in 22-engine-redesign-decisions.md).

const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.jsonl");

function stripDashes(value: string): string {
  return value.replace(/[—–]/g, ",");
}

export async function POST(req: NextRequest) {
  let body: {
    pieceId?: unknown;
    feedback?: unknown;
    title?: unknown;
    hook?: unknown;
    body?: unknown;
    english?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const pieceId = typeof body.pieceId === "string" ? body.pieceId : "";
  const feedback = typeof body.feedback === "string" ? body.feedback.trim() : "";
  const title = typeof body.title === "string" ? body.title : "";
  const hook = typeof body.hook === "string" ? body.hook : "";
  const master = typeof body.body === "string" ? body.body : "";
  const english = typeof body.english === "string" ? body.english : "";

  if (!feedback) {
    return NextResponse.json({ error: "feedback is required" }, { status: 400 });
  }
  if (!master.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  if ((await resolveEngine()).engine === "none") {
    return NextResponse.json({ title, hook, body: master, english, fallback: true });
  }

  const system = [
    "You revise a finished social post for Palm (Arutlee) based on his feedback.",
    "Apply the feedback while keeping everything he did not mention. Do not invent new facts.",
    "Revise the Thai master and the English rendition together; they must carry the same content and structure.",
    "",
    "Voice rules:",
    VOICE_RULES,
    "",
    "Format rules:",
    FORMAT_RULES,
    "",
    "Avoid:",
    AVOID_RULES,
    "",
    'Return one strict JSON object only, no markdown fences: {"title": "...", "hook": "...", "body": "revised Thai master", "english": "revised English rendition"}.',
  ].join("\n");

  const user = `Palm's feedback on this post:
${feedback}

Current title: ${title}
Current hook: ${hook}

Current Thai master:
${master}

Current English rendition:
${english || "(none yet, write one matching the revised master)"}`;

  try {
    const raw = await callClaude({ system, messages: [{ role: "user", content: user }], maxTokens: 4000 });
    const parsed = safeJSON<Record<string, unknown>>(raw, {});
    const out = {
      title: stripDashes(typeof parsed.title === "string" && parsed.title.trim() ? parsed.title : title),
      hook: stripDashes(typeof parsed.hook === "string" && parsed.hook.trim() ? parsed.hook : hook),
      body: stripDashes(typeof parsed.body === "string" && parsed.body.trim() ? parsed.body : master),
      english: stripDashes(typeof parsed.english === "string" && parsed.english.trim() ? parsed.english : english),
    };

    // Learning-store seed: keep the pair even if the revision barely changed.
    await append(FEEDBACK_FILE, {
      id: `feedback-${Date.now()}`,
      piece_id: pieceId || null,
      feedback,
      before_body: master,
      after_body: out.body,
      created_at: nowIso(),
    });

    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "revise failed" },
      { status: 500 },
    );
  }
}
