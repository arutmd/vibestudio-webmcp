import { assessPieceSources, buildPieceLeadStatus } from "./pieceReadiness";
import type { InboxRecord, PieceRecord } from "./types";

const basePiece: PieceRecord = {
  id: "field-note-20260609-001",
  created_at: "2026-06-09T12:00:00+07:00",
  status: "idea",
  format: "field_note",
  title: "Airbnb release",
  hook: "Airbnb is changing how launches work.",
  topic_ids: [],
  source_inbox_ids: ["inbox-20260609-001"],
  lead_platform: "linkedin",
  platforms: ["linkedin", "facebook"],
  ip_kit: "day1",
  firewall_check: "not_run",
  slop_check: "not_run",
  voice_check: "not_run",
  draft_path: null,
  published_urls: {},
  notes: "",
};

function youtubeSource(chars: number, kind: "transcript" | "summary" = "transcript"): InboxRecord {
  return {
    id: "inbox-20260609-001",
    captured_at: "2026-06-09T12:00:00+07:00",
    source: "youtube",
    raw: "Airbnb release",
    url: "https://www.youtube.com/watch?v=bFHdNb74YDo",
    media_path: null,
    initial_format: "field_note",
    firewall_risk: "clear",
    status: "triaged",
    ingredients: {
      source_title: "The Airbnb 2026 Summer Release",
      source_text_kind: kind,
      source_text: "x".repeat(chars),
      source_text_chars: chars,
    },
  };
}

{
  const readiness = assessPieceSources(basePiece, [youtubeSource(192, "summary")]);
  if (!readiness.blocked) throw new Error("thin YouTube source should block piece");
  if (readiness.label !== "transcript missing") {
    throw new Error(`expected transcript missing label, got ${readiness.label}`);
  }
  const lead = buildPieceLeadStatus(basePiece, [youtubeSource(192, "summary")]);
  if (lead.stage !== "source_check") {
    throw new Error(`thin source should keep lead in source_check, got ${lead.stage}`);
  }
}

{
  const rich = youtubeSource(34_972);
  const readiness = assessPieceSources(basePiece, [rich]);
  if (readiness.blocked) throw new Error("rich YouTube transcript should be allowed");
  if (readiness.strongestChars !== 34_972) {
    throw new Error(`expected strongest chars, got ${readiness.strongestChars}`);
  }
  const lead = buildPieceLeadStatus(basePiece, [rich]);
  if (lead.stage !== "draft") throw new Error(`rich source should move to draft, got ${lead.stage}`);
}

{
  const lead = buildPieceLeadStatus(
    {
      ...basePiece,
      body: "This is a drafted body with enough substance to qualify as a piece.",
      hero_image_path: "pieces/demo/hero.png",
      cover_visual_mode: "product_ui",
      firewall_check: "pass",
      slop_check: "pass",
      voice_check: "pass",
      scheduled_for: "2026-06-10T09:00:00+07:00",
    },
    [youtubeSource(34_972)],
  );
  if (lead.stage !== "ready") throw new Error(`complete piece should be ready, got ${lead.stage}`);
}
