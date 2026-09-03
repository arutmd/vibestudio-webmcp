import fs from "node:fs/promises";
import { nowIso } from "../jsonl";
import { artifactPaths, proposalStamp } from "./paths";
import {
  buildQaResult,
  writePlatformPack,
  writeQaArtifacts,
  writeTextProposalArtifacts,
  writeVisualSpecArtifact,
} from "./platformPack";
import { readReviewState, refreshReviewState, writeReviewState } from "./reviewState";
import { generateHeroImage } from "./imageGenerator";
import { buildSourcePack, writeSourceArtifacts } from "./sourcePack";
import { buildTextProposalWithCodex } from "./textProposal";
import { buildVisualSpec } from "./templates";
import type { EngineRunInput, EngineRunResult } from "./types";

function bangkokIso(date: Date): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}+07:00`;
}

export async function runOneGo(input: EngineRunInput): Promise<EngineRunResult> {
  const at = input.now ? bangkokIso(input.now) : nowIso();
  await input.onStage?.("source");
  const source = buildSourcePack(input.piece, input.inboxRecords, at);
  const proposalId = input.proposalId ?? proposalStamp(input.now ?? new Date());
  const paths = artifactPaths(source.slug, proposalId, input.projectRoot);

  await writeSourceArtifacts(source, paths);

  await input.onStage?.("text");
  const text = await (input.buildText ?? buildTextProposalWithCodex)(source);
  await fs.mkdir(paths.proposalDir, { recursive: true });
  await writeTextProposalArtifacts(source, text, paths);

  await input.onStage?.("visual");
  const visualSpec = buildVisualSpec(source, text);
  await writeVisualSpecArtifact(visualSpec, paths);

  await input.onStage?.("render");
  const image = input.generateImage
    ? await input.generateImage(source, visualSpec, paths)
    : input.renderImage
    ? (await input.renderImage(visualSpec, paths),
      {
        provider: "html-fallback" as const,
        path: paths.relative.assetPng,
        prompt: visualSpec.prompt,
        fallbackReason: "Legacy renderImage hook was used instead of Codex imagegen.",
      })
    : await generateHeroImage(source, visualSpec, paths);

  await writePlatformPack(source, text, paths);

  await input.onStage?.("qa");
  const qa = await buildQaResult({
    source,
    proposal: text,
    visualSpec,
    image,
    assetPath: paths.assetPng,
    at,
  });
  await writeQaArtifacts(qa, paths);

  const currentReview = await readReviewState(source.slug, input.projectRoot);
  const reviewState = refreshReviewState(currentReview, source.slug, proposalId, at);
  await writeReviewState(reviewState, input.projectRoot);

  await input.onStage?.("ready");
  return {
    pieceId: input.piece.id,
    slug: source.slug,
    proposalId,
    stage: "ready",
    source,
    text,
    visualSpec,
    image,
    qa,
    reviewState,
    paths,
  };
}
