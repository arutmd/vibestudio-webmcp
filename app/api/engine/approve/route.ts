import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { findById, isValidId, nowIso, patchById } from "@/lib/jsonl";
import { FILES, PROJECT_ROOT } from "@/lib/paths";
import type { PieceRecord } from "@/lib/types";
import {
  readReviewState,
  reviewStateIsReady,
  setReviewDecision,
  writeReviewState,
} from "@/lib/contentEngine/reviewState";
import { artifactPaths, isEngineSlug, isProposalId } from "@/lib/contentEngine/paths";
import type { EngineReviewState, EngineTextProposal } from "@/lib/contentEngine/types";

export const dynamic = "force-dynamic";

type Body = {
  pieceId?: unknown;
  kind?: unknown;
  decision?: unknown;
  reason?: unknown;
};

async function readProposal(
  slug: string,
  proposalId: string,
): Promise<EngineTextProposal> {
  const file = artifactPaths(slug, proposalId, PROJECT_ROOT).proposalJson;
  return JSON.parse(await fs.readFile(file, "utf8")) as EngineTextProposal;
}

function syncStaleReviewState(
  state: EngineReviewState,
  piece: PieceRecord,
): EngineReviewState {
  return {
    ...state,
    text:
      piece.engine_text_decision === "pending"
        ? { decision: "pending", decidedAt: null }
        : state.text,
    image:
      piece.engine_image_decision === "pending"
        ? { decision: "pending", decidedAt: null }
        : state.image,
  };
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!isValidId(body.pieceId)) {
    return NextResponse.json({ error: "invalid piece id" }, { status: 400 });
  }
  if (body.kind !== "text" && body.kind !== "image") {
    return NextResponse.json({ error: "kind must be text or image" }, { status: 400 });
  }
  if (body.decision !== "approved" && body.decision !== "rejected") {
    return NextResponse.json({ error: "decision must be approved or rejected" }, { status: 400 });
  }

  const piece = await findById<PieceRecord>(FILES.pieces, body.pieceId);
  if (!piece) return NextResponse.json({ error: "piece not found" }, { status: 404 });
  if (!piece.engine_slug || !piece.engine_proposal_id) {
    return NextResponse.json({ error: "run the engine before review" }, { status: 400 });
  }
  if (!isEngineSlug(piece.engine_slug) || !isProposalId(piece.engine_proposal_id)) {
    return NextResponse.json({ error: "invalid engine metadata" }, { status: 400 });
  }

  const current = await readReviewState(piece.engine_slug, PROJECT_ROOT);
  if (!current || current.proposalId !== piece.engine_proposal_id) {
    return NextResponse.json({ error: "review state not found for current proposal" }, { status: 404 });
  }

  const synced = syncStaleReviewState(current, piece);
  const next = setReviewDecision(
    synced,
    body.kind,
    body.decision,
    typeof body.reason === "string" ? body.reason : undefined,
  );
  await writeReviewState(next, PROJECT_ROOT);

  const ready = reviewStateIsReady(next);
  const stage = ready ? "approved" : body.decision === "rejected" ? "rejected" : "ready";
  const proposal =
    body.decision === "approved" ? await readProposal(piece.engine_slug, piece.engine_proposal_id) : null;
  const approvalPatch: Partial<PieceRecord> = {};
  if (body.decision === "approved" && body.kind === "text" && proposal) {
    approvalPatch.status = "draft";
    approvalPatch.title = proposal.title;
    approvalPatch.hook = proposal.hook;
    approvalPatch.body = proposal.body;
    approvalPatch.platform_variants = proposal.platformVariants;
  }
  if (body.decision === "approved" && body.kind === "image" && proposal) {
    approvalPatch.visual_prompt = proposal.visualPrompt;
    approvalPatch.hero_image_path = piece.engine_asset_path;
  }

  const updated = await patchById<PieceRecord>(FILES.pieces, piece.id, {
    updated_at: nowIso(),
    ...approvalPatch,
    status: ready ? "qa_passed" : approvalPatch.status ?? piece.status,
    engine_stage: stage,
    engine_review_path: `pieces/${piece.engine_slug}/review-state.json`,
    engine_text_decision: next.text.decision,
    engine_image_decision: next.image.decision,
    engine_error: body.decision === "rejected" && typeof body.reason === "string" ? body.reason : undefined,
  });

  return NextResponse.json({
    record: updated ?? piece,
    reviewState: next,
  });
}
