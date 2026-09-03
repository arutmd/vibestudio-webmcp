import { NextRequest, NextResponse } from "next/server";
import { findById, isValidId, nowIso, patchById, readAll } from "@/lib/jsonl";
import { FILES, PROJECT_ROOT } from "@/lib/paths";
import type { InboxRecord, PieceRecord } from "@/lib/types";
import { runOneGo } from "@/lib/contentEngine/run";
import { assessPieceSources } from "@/lib/pieceReadiness";

export const dynamic = "force-dynamic";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function POST(req: NextRequest) {
  let body: { pieceId?: unknown };
  try {
    body = (await req.json()) as { pieceId?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!isValidId(body.pieceId)) {
    return NextResponse.json({ error: "invalid piece id" }, { status: 400 });
  }

  const piece = await findById<PieceRecord>(FILES.pieces, body.pieceId);
  if (!piece) return NextResponse.json({ error: "piece not found" }, { status: 404 });

  try {
    const inbox = await readAll<InboxRecord>(FILES.inbox);
    const matchingSources = inbox.filter((record) => piece.source_inbox_ids.includes(record.id));
    const sourceReadiness = assessPieceSources(piece, matchingSources);
    if (sourceReadiness.blocked) {
      return NextResponse.json(
        {
          error: `source not ready: ${sourceReadiness.detail}`,
          source: sourceReadiness,
        },
        { status: 409 },
      );
    }
    const result = await runOneGo({
      piece,
      inboxRecords: inbox,
      projectRoot: PROJECT_ROOT,
      onStage: async (stage) => {
        await patchById<PieceRecord>(FILES.pieces, piece.id, {
          updated_at: nowIso(),
          engine_stage: stage,
        });
      },
    });
    if (result.text.provider === "fallback") {
      throw new Error(
        `text generation failed: ${
          result.text.fallbackReason ??
          "local AI providers were unavailable, so no publishable text was saved"
        }`,
      );
    }
    const patch: Partial<PieceRecord> = {
      updated_at: nowIso(),
      engine_stage: "ready",
      engine_slug: result.slug,
      engine_proposal_id: result.proposalId,
      engine_text_path: result.paths.relative.textMd,
      engine_asset_path: result.paths.relative.assetPng,
      engine_base_layer_path: result.image.baseLayerPath,
      engine_reference_layer_path: result.image.referenceLayerPath,
      engine_reference_layer_label: result.image.referenceLayerLabel,
      engine_profile_layer_path: result.image.profileLayerPath,
      engine_profile_layer_label: result.image.profileLayerLabel,
      engine_qa_path: result.paths.relative.qaJson,
      engine_review_path: result.paths.relative.reviewStateJson,
      engine_last_run_at: nowIso(),
      engine_error: undefined,
      engine_text_decision: result.reviewState.text.decision,
      engine_image_decision: result.reviewState.image.decision,
      engine_provider: result.text.provider,
      engine_image_provider: result.image.provider,
      body: result.text.body,
      hook: result.text.hook || piece.hook,
      platform_variants: result.text.platformVariants,
      visual_prompt: result.text.visualPrompt,
      hero_image_path: result.paths.relative.assetPng,
      status: piece.status === "idea" ? "draft" : piece.status,
    };
    const updated = await patchById<PieceRecord>(FILES.pieces, piece.id, patch);
    return NextResponse.json({
      record: updated ?? piece,
      engine: {
        slug: result.slug,
        proposalId: result.proposalId,
        provider: result.text.provider,
        imageProvider: result.image.provider,
        referenceLayerPath: result.image.referenceLayerPath,
        referenceLayerLabel: result.image.referenceLayerLabel,
        profileLayerPath: result.image.profileLayerPath,
        profileLayerLabel: result.image.profileLayerLabel,
        fallbackReason: result.text.fallbackReason,
        imageFallbackReason: result.image.fallbackReason,
        qa: result.qa,
        paths: result.paths.relative,
        reviewState: result.reviewState,
      },
    });
  } catch (err) {
    const message = errorMessage(err).slice(0, 500);
    const at = nowIso();
    await patchById<PieceRecord>(FILES.pieces, piece.id, {
      updated_at: at,
      engine_stage: "error",
      engine_last_run_at: at,
      engine_error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
