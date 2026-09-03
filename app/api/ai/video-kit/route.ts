import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { callClaude, resolveEngine, safeJSON } from "@/lib/claude";
import { findById, nowIso, patchById } from "@/lib/jsonl";
import { FILES, PIECES_DIR, PROJECT_ROOT } from "@/lib/paths";
import { SYSTEM_BRIEF, videoKitPrompt } from "@/lib/prompts";
import type { InboxRecord, PieceRecord, VideoKit, VideoScene } from "@/lib/types";

export const dynamic = "force-dynamic";

type VideoKitResponse = Omit<VideoKit, "generated_at" | "files">;

const VISUAL_TYPES = new Set([
  "talking_head",
  "definition_card",
  "before_after",
  "flow_diagram",
  "tool_demo",
  "rule_of_thumb",
]);

function pieceFolder(piece: PieceRecord): { abs: string; rel: string } {
  const draftMatch = piece.draft_path?.match(/^pieces\/([^/]+)\//);
  const folder = draftMatch?.[1] || piece.id;
  return {
    abs: path.join(PIECES_DIR, folder),
    rel: `pieces/${folder}`,
  };
}

function sourceContext(piece: PieceRecord, inbox: InboxRecord[]): string {
  return piece.source_inbox_ids
    .map((id) => inbox.find((rec) => rec.id === id))
    .filter((rec): rec is InboxRecord => !!rec)
    .map((rec) => {
      const ingredients = rec.ingredients;
      const bits = [
        `Source ${rec.id}`,
        rec.url ? `URL: ${rec.url}` : "",
        ingredients?.source_title ? `Title: ${ingredients.source_title}` : "",
        ingredients?.summary ? `Summary: ${ingredients.summary}` : "",
        ingredients?.research_summary ? `Research: ${ingredients.research_summary}` : "",
        ingredients?.source_text ? `Transcript/article excerpt:\n${ingredients.source_text.slice(0, 2500)}` : "",
        rec.raw ? `Raw capture excerpt:\n${rec.raw.slice(0, 2500)}` : "",
      ].filter(Boolean);
      return bits.join("\n");
    })
    .join("\n\n---\n\n");
}

function fallbackKit(piece: PieceRecord): VideoKitResponse {
  const base = piece.platform_variants?.tiktok || piece.body || piece.hook || piece.title;
  const lines = base
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("-") && line.length > 12);
  const hook = piece.hook || lines.find((line) => line.length > 28) || piece.title || "หนึ่งอย่างที่คนใช้ AI ควรรู้";
  const caveat =
    lines.find((line) => /ยังไม่|ไม่ได้|caveat|ลอง|แต่/.test(line)) ||
    "อันนี้ยังเป็น production note แบบเร็ว ต้องเช็ค claim และตัวอย่างจริงก่อนถ่ายนะครับ";
  const angle =
    lines.find((line) => /น่าสนใจ|เปลี่ยน|สำคัญ|action layer|ควร/.test(line)) ||
    hook;
  const evidence =
    lines.find((line) => /demo|ตัวอย่าง|ทำงานจริง|dashboard|product|tool|screen/i.test(line)) ||
    lines[2] ||
    angle;
  const warning =
    lines.find((line) => /production|ship|วัด|ผิด|แพง|guardrail|eval/i.test(line)) ||
    "ถ้าจะเอาไปใช้จริง อย่าวัดแค่เสียงหรือหน้าตา ให้วัดว่า task สำเร็จไหม";
  const takeaway =
    lines.find((line) => /สรุป|takeaway|เส้นแบ่ง|จำไว้|สุดท้าย/i.test(line)) ||
    "จำง่ายๆ ครับ ฟีเจอร์ที่ดีไม่ใช่แค่ตอบได้ แต่ต้องช่วยให้เราทำงานจบได้จริง";
  const script = [hook, caveat, angle, evidence, warning, takeaway].join("\n\n");
  const scenes: VideoScene[] = [
    {
      id: "S01",
      start_sec: 0,
      end_sec: 4,
      spoken_line: hook,
      visual_type: "talking_head",
      visual_brief: "Palm talking head, large 2-line caption with the strongest hook.",
      production_note: "Record this as the first take. Keep the pause after the hook short.",
    },
    {
      id: "S02",
      start_sec: 4,
      end_sec: 10,
      spoken_line: caveat,
      visual_type: "definition_card",
      visual_brief: "Dark Arutlee card: 'context first' plus one short caveat line.",
      production_note: "Use this to keep the claim honest before the explanation starts.",
    },
    {
      id: "S03",
      start_sec: 10,
      end_sec: 18,
      spoken_line: angle,
      visual_type: "flow_diagram",
      visual_brief: "Simple 3-step flow: source/context -> AI/tool -> useful output.",
      production_note: "Use reusable boxes and arrows. No custom animation needed.",
    },
    {
      id: "S04",
      start_sec: 18,
      end_sec: 28,
      spoken_line: evidence,
      visual_type: "tool_demo",
      visual_brief: "Screen recording or screenshot crop with one highlight box around the concrete feature or example.",
      production_note: "Capture only the relevant 3-5 seconds, then crop for vertical.",
    },
    {
      id: "S05",
      start_sec: 28,
      end_sec: 38,
      spoken_line: warning,
      visual_type: "before_after",
      visual_brief: "Before/after card comparing weak usage vs production-minded usage.",
      production_note: "Keep each side under 6 words so captions remain readable.",
    },
    {
      id: "S06",
      start_sec: 38,
      end_sec: 50,
      spoken_line: takeaway,
      visual_type: "rule_of_thumb",
      visual_brief: "Final rule-of-thumb card, one practical sentence, screenshot-worthy.",
      production_note: "End on this card for 1 second after the voice stops.",
    },
  ];
  return {
    target_duration_sec: 50,
    hook,
    script,
    scenes,
    talking_head_lines: scenes
      .filter((scene) => scene.visual_type === "talking_head")
      .map((scene) => scene.spoken_line),
    visual_card_ideas: [
      "Definition card that names the core concept in one sentence.",
      "Flow diagram showing source/context -> AI/tool -> useful output.",
      "Before/after card showing casual use vs production-minded use.",
      "Rule-of-thumb card for the final takeaway.",
    ],
    screen_recording_needs: [
      "Capture the original source page or product page if it is public.",
      "Capture one screen that proves the feature, workflow, or example mentioned in the post.",
      "Capture one clean UI crop that can sit behind captions without clutter.",
    ],
    caption_style:
      "Large Thai captions, 2 lines max, white text with subtle dark backing. Highlight English tech terms.",
    edit_checklist: [
      "Record talking-head hook and transitions.",
      "Capture required screens.",
      "Create visual cards from the scene list.",
      "Cut to 40-60 seconds.",
      "Add always-on captions.",
      "Export vertical 1080x1920.",
    ],
  };
}

function normalizeKit(raw: VideoKitResponse, piece: PieceRecord): VideoKitResponse {
  const fallback = fallbackKit(piece);
  const scenes = Array.isArray(raw.scenes) ? raw.scenes : fallback.scenes;
  const normalizedScenes: VideoScene[] = scenes.slice(0, 10).map((scene, index) => {
    const start = Number.isFinite(scene.start_sec) ? Math.max(0, Math.round(scene.start_sec)) : index * 6;
    const end = Number.isFinite(scene.end_sec)
      ? Math.max(start + 2, Math.round(scene.end_sec))
      : index === scenes.length - 1
      ? 50
      : start + 6;
    const visualType = VISUAL_TYPES.has(scene.visual_type)
      ? scene.visual_type
      : index === 0
      ? "talking_head"
      : "definition_card";
    return {
      id: scene.id || `S${String(index + 1).padStart(2, "0")}`,
      start_sec: start,
      end_sec: end,
      spoken_line: String(scene.spoken_line || fallback.scenes[index]?.spoken_line || "").slice(0, 800),
      visual_type: visualType as VideoScene["visual_type"],
      visual_brief: String(scene.visual_brief || fallback.scenes[index]?.visual_brief || "").slice(0, 1000),
      production_note: scene.production_note
        ? String(scene.production_note).slice(0, 800)
        : fallback.scenes[index]?.production_note,
    };
  });
  return {
    target_duration_sec: Number.isFinite(raw.target_duration_sec)
      ? Math.max(40, Math.min(60, Math.round(raw.target_duration_sec)))
      : fallback.target_duration_sec,
    hook: String(raw.hook || fallback.hook).slice(0, 500),
    script: String(raw.script || fallback.script).slice(0, 8000),
    scenes: normalizedScenes.length ? normalizedScenes : fallback.scenes,
    talking_head_lines: arrayOfStrings(raw.talking_head_lines, fallback.talking_head_lines, 12),
    visual_card_ideas: arrayOfStrings(raw.visual_card_ideas, fallback.visual_card_ideas, 12),
    screen_recording_needs: arrayOfStrings(raw.screen_recording_needs, fallback.screen_recording_needs, 12),
    caption_style: String(raw.caption_style || fallback.caption_style).slice(0, 1000),
    edit_checklist: arrayOfStrings(raw.edit_checklist, fallback.edit_checklist, 16),
  };
}

function arrayOfStrings(input: unknown, fallback: string[], max: number): string[] {
  if (!Array.isArray(input)) return fallback;
  const out = input
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, max);
  return out.length ? out : fallback;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`AI generation timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function mdList(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}

function renderScriptMd(piece: PieceRecord, kit: VideoKit): string {
  return `# ${piece.title || piece.id} - Video Script

Target: ${kit.target_duration_sec} seconds

## Hook

${kit.hook}

## Script

${kit.script}
`;
}

function renderShotListMd(kit: VideoKit): string {
  return `# Talking-Head Shot List

${mdList(kit.talking_head_lines)}

## Screen Recording Needs

${mdList(kit.screen_recording_needs)}

## Caption Style

${kit.caption_style}
`;
}

function renderVisualBriefsMd(kit: VideoKit): string {
  const scenes = kit.scenes
    .map(
      (scene) => `## ${scene.id} - ${scene.visual_type}

Time: ${scene.start_sec}-${scene.end_sec}s

Spoken line:
${scene.spoken_line}

Visual brief:
${scene.visual_brief}

Production note:
${scene.production_note || "none"}
`,
    )
    .join("\n");
  return `# Visual Briefs

## Reusable Visual Card Ideas

${mdList(kit.visual_card_ideas)}

${scenes}
`;
}

function renderChecklistMd(kit: VideoKit): string {
  return `# Edit Checklist

${kit.edit_checklist.map((item) => `- [ ] ${item}`).join("\n")}
`;
}

async function writeVideoFiles(piece: PieceRecord, kit: VideoKit): Promise<NonNullable<VideoKit["files"]>> {
  const folder = pieceFolder(piece);
  const videoAbs = path.join(folder.abs, "video");
  await fs.mkdir(videoAbs, { recursive: true });

  const files = {
    script: `${folder.rel}/video/script.md`,
    scenes: `${folder.rel}/video/scenes.json`,
    shot_list: `${folder.rel}/video/shot-list.md`,
    visual_briefs: `${folder.rel}/video/visual-briefs.md`,
    edit_checklist: `${folder.rel}/video/edit-checklist.md`,
  };

  await Promise.all([
    fs.writeFile(path.join(PROJECT_ROOT, files.script), renderScriptMd(piece, kit), "utf8"),
    fs.writeFile(path.join(PROJECT_ROOT, files.scenes), JSON.stringify(kit.scenes, null, 2) + "\n", "utf8"),
    fs.writeFile(path.join(PROJECT_ROOT, files.shot_list), renderShotListMd(kit), "utf8"),
    fs.writeFile(path.join(PROJECT_ROOT, files.visual_briefs), renderVisualBriefsMd(kit), "utf8"),
    fs.writeFile(path.join(PROJECT_ROOT, files.edit_checklist), renderChecklistMd(kit), "utf8"),
  ]);

  return files;
}

export async function POST(req: NextRequest) {
  let requestBody: { pieceId?: string };
  try {
    requestBody = (await req.json()) as typeof requestBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!requestBody.pieceId) {
    return NextResponse.json({ error: "pieceId required" }, { status: 400 });
  }

  const piece = await findById<PieceRecord>(FILES.pieces, requestBody.pieceId);
  if (!piece) return NextResponse.json({ error: "piece not found" }, { status: 404 });
  const body = piece.body || Object.values(piece.platform_variants ?? {}).find(Boolean) || piece.hook || piece.title;
  if (!body?.trim()) {
    return NextResponse.json({ error: "piece needs body or platform output first" }, { status: 400 });
  }

  const inbox = await Promise.all(
    piece.source_inbox_ids.map((id) => findById<InboxRecord>(FILES.inbox, id)),
  );
  const sources = sourceContext(
    piece,
    inbox.filter((rec): rec is InboxRecord => !!rec),
  );
  const platformVariants = Object.entries(piece.platform_variants ?? {})
    .map(([platform, text]) => `${platform}:\n${text}`)
    .join("\n\n");

  let kitPayload: VideoKitResponse;
  let fallback = false;
  if ((await resolveEngine()).engine === "none") {
    kitPayload = fallbackKit(piece);
    fallback = true;
  } else {
    try {
      const text = await withTimeout(
        callClaude({
          system: SYSTEM_BRIEF,
          cacheSystem: true,
          messages: [
            {
              role: "user",
              content: videoKitPrompt({
                title: piece.title,
                hook: piece.hook,
                body,
                platformVariants,
                sourceContext: sources,
              }),
            },
          ],
          maxTokens: 3200,
        }),
        25_000,
      );
      kitPayload = safeJSON<VideoKitResponse>(text, fallbackKit(piece));
    } catch {
      kitPayload = fallbackKit(piece);
      fallback = true;
    }
  }

  const generatedAt = nowIso();
  const kitWithoutFiles = normalizeKit(kitPayload, piece);
  const kit: VideoKit = {
    ...kitWithoutFiles,
    generated_at: generatedAt,
  };
  const files = await writeVideoFiles(piece, kit);
  const savedKit: VideoKit = { ...kit, files };
  const updated = await patchById<PieceRecord>(FILES.pieces, piece.id, {
    video_kit: savedKit,
    updated_at: generatedAt,
  });

  return NextResponse.json({ kit: savedKit, record: updated, fallback });
}
