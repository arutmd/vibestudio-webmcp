import type { InboxRecord } from "./types";
import { assessCaptureSource } from "./sourceQuality";

function record(patch: Partial<InboxRecord>): InboxRecord {
  return {
    id: "inbox-test",
    captured_at: "2026-06-09T12:00:00+07:00",
    source: "youtube",
    raw: "https://www.youtube.com/watch?v=demo",
    url: "https://www.youtube.com/watch?v=demo",
    media_path: null,
    initial_format: "unknown",
    firewall_risk: "clear",
    status: "triaged",
    ...patch,
  };
}

const thinYoutube = assessCaptureSource(
  record({
    ingredients: {
      source_text_kind: "transcript",
      source_text_chars: 192,
      source_text: "Short transcript fragment",
    },
  }),
);
if (!thinYoutube.blocksIdeate || thinYoutube.label !== "transcript thin") {
  throw new Error("thin YouTube transcript should block Ideate");
}

const missingYoutubeTranscript = assessCaptureSource(
  record({
    ingredients: {
      source_text_kind: "article",
      source_text_chars: 192,
      source_text: "Short YouTube summary",
    },
  }),
);
if (
  !missingYoutubeTranscript.blocksIdeate ||
  missingYoutubeTranscript.label !== "transcript missing"
) {
  throw new Error("YouTube summary should be labeled transcript missing");
}

const richYoutube = assessCaptureSource(
  record({
    ingredients: {
      source_text_kind: "transcript",
      source_text_chars: 12_000,
      source_text: "x".repeat(12_000),
    },
  }),
);
if (richYoutube.blocksIdeate || richYoutube.level !== "rich") {
  throw new Error("rich YouTube transcript should allow Ideate");
}

const manualSeed = assessCaptureSource(
  record({
    source: "manual",
    url: null,
    raw: "A short personal observation.",
    ingredients: undefined,
  }),
);
if (manualSeed.blocksIdeate) {
  throw new Error("manual idea seeds should not be hard-blocked");
}

const researchedManualThinSource = assessCaptureSource(
  record({
    source: "manual",
    url: null,
    raw: "Palm capture / instruction:\nClaude fable 5",
    ingredients: {
      source_text_kind: "article",
      source_text_chars: 14,
      source_text: "Claude fable 5",
      research_sources: [
        {
          url: "https://www.anthropic.com/news/claude-fable-5-mythos-5",
          title: "Claude Fable 5 and Claude Mythos 5",
        },
      ],
    },
  }),
);
if (!researchedManualThinSource.blocksIdeate || researchedManualThinSource.level !== "thin") {
  throw new Error("researched manual captures with tiny source text should block Ideate");
}
