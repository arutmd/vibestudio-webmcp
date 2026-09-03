import type { CheckResult, PieceRecord } from "./types";
import { activeVisualIsReady } from "./visualOutput";

export type QualityGateId =
  | "text"
  | "image"
  | "source"
  | "leakage"
  | "platform";

export type QualityGateStatus = "pass" | "review" | "fail";

export type QualityGate = {
  id: QualityGateId;
  label: string;
  status: QualityGateStatus;
  detail: string;
};

export type PostQualitySummary = {
  canApprove: boolean;
  label: string;
  detail: string;
  gates: QualityGate[];
};

function failing(check: CheckResult | undefined): boolean {
  return check === "fail";
}

function hasCopy(piece: PieceRecord): boolean {
  const body = piece.body?.trim() ?? "";
  const variants = Object.values(piece.platform_variants ?? {}).join("\n").trim();
  return body.length >= 40 || variants.length >= 40;
}

function hasImage(piece: PieceRecord): boolean {
  return activeVisualIsReady(piece);
}

function hasImageDiscipline(piece: PieceRecord): boolean {
  if (piece.visual_output === "carousel") {
    return Boolean(
      piece.carousel?.length &&
        piece.carousel.every((slide) => Boolean(slide.visual_prompt?.trim() || slide.visual_cue?.trim())),
    );
  }
  const prompt = piece.visual_prompt?.toLowerCase() ?? "";
  return Boolean(
    piece.cover_visual_mode ||
      piece.cover_template ||
      (prompt.includes("text-free") &&
        (prompt.includes("overlay") || prompt.includes("lower 42") || prompt.includes("lower 40"))),
  );
}

function hasSource(piece: PieceRecord): boolean {
  return piece.source_inbox_ids.length > 0 || /source|ingredient/i.test(piece.notes);
}

export function summarizePostQuality(piece: PieceRecord): PostQualitySummary {
  const gates: QualityGate[] = [
    {
      id: "text",
      label: "Text quality",
      status:
        hasCopy(piece) && !failing(piece.slop_check) && !failing(piece.voice_check)
          ? "pass"
          : "review",
      detail: hasCopy(piece)
        ? "Copy exists and no rule-based voice or slop failure is recorded."
        : "Add or generate enough copy to judge the post.",
    },
    {
      id: "image",
      label: "Image quality",
      status: hasImage(piece) && hasImageDiscipline(piece) ? "pass" : "review",
      detail: !hasImage(piece)
        ? piece.visual_output === "carousel"
          ? "Render every carousel slide before approval."
          : "Generate or import a strong hero image before approval."
        : hasImageDiscipline(piece)
          ? "A base image exists with a reusable prompt, mode, or Studio cover template trail."
          : "Attach the visual mode or text-free base prompt before approval.",
    },
    {
      id: "source",
      label: "Source truth",
      status: hasSource(piece) ? "pass" : "review",
      detail: hasSource(piece)
        ? "The post is linked to source material or notes."
        : "Attach source context or open details to verify claims.",
    },
    {
      id: "leakage",
      label: "Private/work leakage",
      status: failing(piece.firewall_check) ? "fail" : "pass",
      detail: failing(piece.firewall_check)
        ? "Firewall failed. Fix private-work or brand leakage before approval."
        : "No firewall failure is recorded.",
    },
    {
      id: "platform",
      label: "Platform fit",
      status: piece.platforms.length > 0 ? "pass" : "review",
      detail:
        piece.platforms.length > 0
          ? `Targets ${piece.platforms.join(", ")}.`
          : "Select at least one publishing platform.",
    },
  ];

  const blockers = gates.filter((gate) => gate.status !== "pass");

  return {
    gates,
    canApprove: blockers.length === 0,
    label:
      blockers.length === 0
        ? "Ready to approve"
        : `Needs ${blockers.length} fix${blockers.length === 1 ? "" : "es"}`,
    detail:
      blockers.length === 0
        ? "Text, image, source, leakage, and platform gates are clean."
        : blockers.map((gate) => gate.label).join(", "),
  };
}
