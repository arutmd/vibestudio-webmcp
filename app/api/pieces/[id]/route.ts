import { NextRequest, NextResponse } from "next/server";
import { findById, isValidId, nowIso, patchById } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type { PieceRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

// Mutable fields a client can PATCH on a piece. Anything outside this set is
// silently dropped — id, created_at, format are immutable; arbitrary keys
// cannot land in the JSONL via this route.
const PATCHABLE: ReadonlyArray<keyof PieceRecord> = [
  "updated_at",
  "status",
  "title",
  "hook",
  "topic_ids",
  "source_inbox_ids",
  "lead_platform",
  "platforms",
  "ip_kit",
  "firewall_check",
  "slop_check",
  "voice_check",
  "draft_path",
  "published_urls",
  "notes",
  "body",
  "platform_variants",
  "visual_prompt",
  "hero_image_path",
  "creative_reference_paths",
  "cover_background_path",
  "cover_headline",
  "cover_subheadline",
  "cover_badge",
  "cover_template",
  "cover_visual_mode",
  "visual_output",
  "scheduled_for",
  "firewall_reasons",
  "slop_reasons",
  "voice_reasons",
  "carousel",
  "video_kit",
];

const TEXT_APPROVAL_FIELDS: ReadonlyArray<keyof PieceRecord> = [
  "title",
  "hook",
  "body",
  "platform_variants",
];

const IMAGE_APPROVAL_FIELDS: ReadonlyArray<keyof PieceRecord> = [
  "visual_prompt",
  "hero_image_path",
  "cover_background_path",
  "cover_headline",
  "cover_subheadline",
  "cover_badge",
  "cover_template",
  "cover_visual_mode",
  "visual_output",
  "carousel",
];

function sanitizePatch(
  input: Partial<PieceRecord>,
  current: PieceRecord,
): Partial<PieceRecord> {
  const out: Partial<PieceRecord> = {};
  for (const key of PATCHABLE) {
    if (key in input) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (out as any)[key] = (input as any)[key];
    }
  }
  const textChanged = TEXT_APPROVAL_FIELDS.some((key) => key in input);
  const imageChanged = IMAGE_APPROVAL_FIELDS.some((key) => key in input);
  if (current.engine_proposal_id) {
    if (textChanged) out.engine_text_decision = "pending";
    if (imageChanged) out.engine_image_decision = "pending";
    if (textChanged || imageChanged) out.engine_stage = "ready";
  }
  return out;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const piece = await findById<PieceRecord>(FILES.pieces, id);
  if (!piece) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ record: piece });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  let raw: Partial<PieceRecord>;
  try {
    raw = (await req.json()) as Partial<PieceRecord>;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const current = await findById<PieceRecord>(FILES.pieces, id);
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });
  const patch = sanitizePatch(raw, current);
  // Server-stamped: every successful PATCH bumps updated_at so resume-here
  // can pick the most recently touched piece.
  (patch as Partial<PieceRecord>).updated_at = nowIso();
  const updated = await patchById<PieceRecord>(FILES.pieces, id, patch);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ record: updated });
}
