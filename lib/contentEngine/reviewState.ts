import fs from "node:fs/promises";
import path from "node:path";
import { nowIso } from "../jsonl";
import { artifactPaths, pieceFolder } from "./paths";
import type { EngineApproval, EngineReviewState } from "./types";

function pending(): EngineApproval {
  return { decision: "pending", decidedAt: null };
}

export function initialReviewState(
  slug: string,
  proposalId: string,
  at = nowIso(),
): EngineReviewState {
  return {
    slug,
    proposalId,
    text: pending(),
    image: pending(),
    updatedAt: at,
  };
}

export function reviewStateIsReady(state: EngineReviewState): boolean {
  return state.text.decision === "approved" && state.image.decision === "approved";
}

export function refreshReviewState(
  current: EngineReviewState | null,
  slug: string,
  proposalId: string,
  at = nowIso(),
): EngineReviewState {
  if (!current || current.proposalId !== proposalId) {
    return initialReviewState(slug, proposalId, at);
  }
  return { ...current, updatedAt: at };
}

export function setReviewDecision(
  state: EngineReviewState,
  kind: "text" | "image",
  decision: "approved" | "rejected",
  reason?: string,
  at = nowIso(),
): EngineReviewState {
  return {
    ...state,
    [kind]: {
      decision,
      decidedAt: at,
      ...(reason ? { reason } : {}),
    },
    updatedAt: at,
  };
}

export async function readReviewState(
  slug: string,
  projectRoot?: string,
): Promise<EngineReviewState | null> {
  const file = path.join(pieceFolder(slug, projectRoot), "review-state.json");
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as EngineReviewState;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function writeReviewState(
  state: EngineReviewState,
  projectRoot?: string,
): Promise<void> {
  const file = artifactPaths(state.slug, state.proposalId, projectRoot).reviewStateJson;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
