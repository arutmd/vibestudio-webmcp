import type { InboxRecord } from "./types";

export type SourceQualityLevel = "rich" | "usable" | "thin" | "missing";

export type SourceQuality = {
  level: SourceQualityLevel;
  label: string;
  detail: string;
  chars: number;
  kind: string;
  blocksIdeate: boolean;
  blocksDraft: boolean;
};

const URL_SOURCES = new Set<InboxRecord["source"]>([
  "youtube",
  "web",
  "linkedin",
  "facebook",
  "instagram",
  "tiktok",
]);

export function assessCaptureSource(record: InboxRecord): SourceQuality {
  const chars =
    record.ingredients?.source_text_chars ??
    record.ingredients?.source_text?.length ??
    0;
  const kind = record.ingredients?.source_text_kind ?? "unknown";
  const isUrlSource = URL_SOURCES.has(record.source) || !!record.url;
  const isResearchBackedManual =
    record.source === "manual" &&
    !record.url &&
    (record.ingredients?.research_sources?.length ?? 0) > 0;
  const shouldBlockThinSource = isUrlSource || isResearchBackedManual;
  const isYoutube = record.source === "youtube";
  const rawChars = record.raw.trim().length;

  if (!record.ingredients && !isUrlSource && rawChars > 0) {
    return {
      level: rawChars >= 600 ? "usable" : "thin",
      label: rawChars >= 600 ? "manual source usable" : "manual source thin",
      detail:
        rawChars >= 600
          ? "This is a manual note, so Ideate can use it as an opinion seed."
          : "This manual note is short; add more context for a stronger post.",
      chars: rawChars,
      kind: "manual",
      blocksIdeate: false,
      blocksDraft: false,
    };
  }

  if (chars <= 0) {
    return {
      level: "missing",
      label: "source missing",
      detail: "No source text was captured. Fetch or paste source material before Ideate.",
      chars,
      kind,
      blocksIdeate: shouldBlockThinSource,
      blocksDraft: shouldBlockThinSource,
    };
  }

  const richThreshold = isYoutube ? 8_000 : 3_000;
  const usableThreshold = isYoutube ? 3_000 : 1_500;

  if (chars >= richThreshold) {
    return {
      level: "rich",
      label: "source rich",
      detail: "Enough source material is available for low-hallucination ideation and drafting.",
      chars,
      kind,
      blocksIdeate: false,
      blocksDraft: false,
    };
  }

  if (chars >= usableThreshold) {
    return {
      level: "usable",
      label: "source usable",
      detail: "This source is usable, but verify claims before posting.",
      chars,
      kind,
      blocksIdeate: false,
      blocksDraft: false,
    };
  }

  const transcriptProblem = isYoutube
    ? kind === "transcript"
      ? "Only a tiny transcript fragment was captured."
      : "No full transcript was captured."
    : "Only a small source excerpt was captured.";

  return {
    level: "thin",
    label: isYoutube
      ? kind === "transcript"
        ? "transcript thin"
        : "transcript missing"
      : "source thin",
    detail: `${transcriptProblem} Deepen this source before Ideate to avoid shallow or hallucinated content.`,
    chars,
    kind,
    blocksIdeate: shouldBlockThinSource,
    blocksDraft: shouldBlockThinSource,
  };
}
