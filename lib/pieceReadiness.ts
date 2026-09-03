import { summarizePostQuality } from "./postQuality";
import { assessCaptureSource, type SourceQuality } from "./sourceQuality";
import type { InboxRecord, PieceRecord } from "./types";
import { activeVisualIsReady } from "./visualOutput";

export type PieceSourceReadiness = {
  records: {
    record: InboxRecord;
    quality: SourceQuality;
  }[];
  missingSourceIds: string[];
  blocked: boolean;
  label: string;
  detail: string;
  strongestChars: number;
};

export type PieceLeadStage =
  | "source_check"
  | "draft"
  | "visual"
  | "quality"
  | "schedule"
  | "ready";

export type PieceLeadStatus = {
  owner: string;
  stage: PieceLeadStage;
  label: string;
  summary: string;
  nextAction: string;
  blockers: string[];
  source: PieceSourceReadiness;
  progress: {
    textReady: boolean;
    imageReady: boolean;
    checksReady: boolean;
    scheduleReady: boolean;
  };
};

export function assessPieceSources(
  piece: PieceRecord,
  inboxRecords: InboxRecord[],
): PieceSourceReadiness {
  const byId = new Map(inboxRecords.map((record) => [record.id, record]));
  const records = piece.source_inbox_ids
    .map((id) => byId.get(id))
    .filter((record): record is InboxRecord => Boolean(record))
    .map((record) => ({ record, quality: assessCaptureSource(record) }));
  const missingSourceIds = piece.source_inbox_ids.filter((id) => !byId.has(id));
  const blocked = records.some((item) => item.quality.blocksDraft) || missingSourceIds.length > 0;
  const strongestChars = records.reduce(
    (max, item) => Math.max(max, item.quality.chars),
    0,
  );

  if (!piece.source_inbox_ids.length) {
    return {
      records,
      missingSourceIds,
      blocked: true,
      label: "source missing",
      detail: "This piece has no linked source yet.",
      strongestChars,
    };
  }

  if (missingSourceIds.length) {
    return {
      records,
      missingSourceIds,
      blocked: true,
      label: "source link missing",
      detail: `Missing source record: ${missingSourceIds.join(", ")}.`,
      strongestChars,
    };
  }

  if (blocked) {
    const thin = records.find((item) => item.quality.blocksDraft);
    return {
      records,
      missingSourceIds,
      blocked,
      label: thin?.quality.label ?? "source blocked",
      detail: thin
        ? `${thin.record.id}: ${thin.quality.detail}`
        : "One or more sources are not ready.",
      strongestChars,
    };
  }

  const richCount = records.filter((item) => item.quality.level === "rich").length;
  return {
    records,
    missingSourceIds,
    blocked: false,
    label: richCount ? "source rich" : "source usable",
    detail: richCount
      ? `${richCount} rich source${richCount === 1 ? "" : "s"} linked.`
      : "Sources are usable; verify claims before publishing.",
    strongestChars,
  };
}

export function buildPieceLeadStatus(
  piece: PieceRecord,
  inboxRecords: InboxRecord[],
): PieceLeadStatus {
  const source = assessPieceSources(piece, inboxRecords);
  const quality = summarizePostQuality(piece);
  const textReady = Boolean(
    piece.engine_text_path ||
      piece.body?.trim() ||
      Object.values(piece.platform_variants ?? {}).join("").trim(),
  );
  const imageReady = activeVisualIsReady(piece);
  const checksReady =
    piece.firewall_check === "pass" &&
    piece.slop_check === "pass" &&
    piece.voice_check === "pass";
  const scheduleReady = Boolean(piece.scheduled_for);
  const blockers: string[] = [];

  if (source.blocked) blockers.push(source.detail);
  if (!textReady) blockers.push("Text is not drafted yet.");
  if (!imageReady) {
    blockers.push(piece.visual_output === "carousel" ? "Carousel slides are not rendered yet." : "Hero image is not ready yet.");
  }
  if (!checksReady) blockers.push("Quality checks have not all passed yet.");
  if (!scheduleReady) blockers.push("Publish date is not set yet.");

  if (source.blocked) {
    return {
      owner: leadName(piece),
      stage: "source_check",
      label: "Source first",
      summary: "The lead is holding this piece until the source is deep enough.",
      nextAction: "Deepen the source, then ideate or run the engine.",
      blockers,
      source,
      progress: { textReady, imageReady, checksReady, scheduleReady },
    };
  }

  if (!textReady) {
    return {
      owner: leadName(piece),
      stage: "draft",
      label: "Ready to write",
      summary: "The source is ready. The next job is a clean master post.",
      nextAction: "Draft the master post from the linked source packet.",
      blockers,
      source,
      progress: { textReady, imageReady, checksReady, scheduleReady },
    };
  }

  if (!imageReady) {
    return {
      owner: leadName(piece),
      stage: "visual",
      label: "Picture needed",
      summary:
        piece.visual_output === "carousel"
          ? "The copy exists. The carousel needs its final rendered slides."
          : "The copy exists. The lead needs one relevant hero image.",
      nextAction:
        piece.visual_output === "carousel"
          ? "Build the slide story, add visuals where useful, then render the deck."
          : "Create or import the hero image, then keep overlays consistent.",
      blockers,
      source,
      progress: { textReady, imageReady, checksReady, scheduleReady },
    };
  }

  if (!checksReady || !quality.canApprove) {
    return {
      owner: leadName(piece),
      stage: "quality",
      label: "Needs QA",
      summary: "Text and image exist. The lead is checking voice, safety, and source truth.",
      nextAction: "Run the quality check and fix any failed gate.",
      blockers,
      source,
      progress: { textReady, imageReady, checksReady, scheduleReady },
    };
  }

  if (!scheduleReady) {
    return {
      owner: leadName(piece),
      stage: "schedule",
      label: "Ready to schedule",
      summary: "The post is ready enough for calendar placement.",
      nextAction: "Pick the publish date and export or queue it.",
      blockers,
      source,
      progress: { textReady, imageReady, checksReady, scheduleReady },
    };
  }

  return {
    owner: leadName(piece),
    stage: "ready",
    label: "Publishable",
    summary: "The lead has text, picture, checks, and schedule in place.",
    nextAction: "Review one last time, then publish or export.",
    blockers,
    source,
    progress: { textReady, imageReady, checksReady, scheduleReady },
  };
}

function leadName(piece: PieceRecord): string {
  const shortId = piece.id.split("-").slice(-2).join("-");
  return `Lead ${shortId}`;
}
