import { NextRequest, NextResponse } from "next/server";
import { selectBrainContext } from "@/lib/contextSelector";
import { CAROUSEL_SKILL } from "@/lib/skills/carouselSkill";
import { appendWithGeneratedId, findById, nowIso, readAll } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import { ensureHackathonSeedData } from "@/lib/seeds";
import type {
  BrainRecord,
  ContextPurpose,
  ContextReceipt,
  InspirationRecord,
  PieceRecord,
} from "@/lib/types";
import { ValidationError, asEnum, asObject, asOptionalText, errorResponse } from "@/lib/validation";

export const dynamic = "force-dynamic";

const PURPOSES = ["carousel_create", "carousel_revise", "session_create"] as const satisfies readonly ContextPurpose[];

export async function POST(req: NextRequest) {
  try {
    await ensureHackathonSeedData();
    const raw = asObject(await req.json());
    const purpose = asEnum(raw.purpose, "purpose", PURPOSES);
    if (raw.skill_id !== CAROUSEL_SKILL.id) throw new ValidationError("skill_id must be carousel-v1");
    const inspirationId = asOptionalText(raw.inspiration_id, "inspiration_id", 80) ?? null;
    const pieceId = asOptionalText(raw.piece_id, "piece_id", 80) ?? null;
    if (purpose === "carousel_create" && !inspirationId) {
      throw new ValidationError("inspiration_id is required for carousel_create");
    }
    if (purpose === "carousel_revise" && !pieceId) {
      throw new ValidationError("piece_id is required for carousel_revise");
    }
    const piece = pieceId ? await findById<PieceRecord>(FILES.pieces, pieceId) : null;
    if (pieceId && !piece) throw new ValidationError("piece not found", 404);
    const resolvedInspirationId = inspirationId ?? piece?.inspiration_id ?? null;
    const inspiration = resolvedInspirationId
      ? await findById<InspirationRecord>(FILES.inspirations, resolvedInspirationId)
      : null;
    if (resolvedInspirationId && !inspiration) throw new ValidationError("inspiration not found", 404);
    const brain = await readAll<BrainRecord>(FILES.brain);
    const selected = selectBrainContext({ records: brain, inspiration, purpose, pieceId });
    const receipt = await appendWithGeneratedId<ContextReceipt>(
      FILES.contextReceipts,
      "context",
      (id) => ({
        id,
        created_at: nowIso(),
        purpose,
        inspiration_id: resolvedInspirationId,
        piece_id: pieceId,
        skill_id: CAROUSEL_SKILL.id,
        skill_version: CAROUSEL_SKILL.version,
        brain_ids: selected.selected.map((record) => record.id),
        example_piece_ids: selected.examples
          .map((record) => record.source_id)
          .filter((id): id is string => Boolean(id)),
        summary: selected.summary,
      }),
    );
    return NextResponse.json({
      receipt_id: receipt.id,
      summary: receipt.summary,
      brain_ids: receipt.brain_ids,
      skill: {
        id: CAROUSEL_SKILL.id,
        version: CAROUSEL_SKILL.version,
        title: CAROUSEL_SKILL.title,
        slide_count: CAROUSEL_SKILL.output_contract.slide_count,
        dimensions: CAROUSEL_SKILL.output_contract.dimensions,
        quality_rules: CAROUSEL_SKILL.quality_rules,
      },
    });
  } catch (err) {
    const failure = errorResponse(err);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
