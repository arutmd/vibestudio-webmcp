import {
  assertReceiptMatchesCreate,
  humanPieceStatus,
  parseChallengePieceCreate,
  parseSlideUpdate,
} from "./challengePiece";
import type { CarouselSlide, ContextReceipt, PieceRecord } from "./types";

function expectThrow(work: () => unknown, includes: string): void {
  try {
    work();
  } catch (error) {
    if (error instanceof Error && error.message.includes(includes)) return;
    throw error;
  }
  throw new Error(`expected error containing: ${includes}`);
}

const slides: CarouselSlide[] = Array.from({ length: 7 }, (_, position) => ({
  index: position + 1,
  kind: position === 0 ? "cover" : position === 6 ? "outro" : "section",
  title: `Slide ${position + 1}`,
  body: `One original idea for beat ${position + 1}.`,
  visual_cue: `Specific editorial scene ${position + 1}`,
}));

const parsed = parseChallengePieceCreate({
  inspiration_id: "inspiration-20260830-001",
  context_receipt_id: "context-20260830-001",
  skill_id: "carousel-v1",
  skill_version: "1.0.0",
  title: "A source becomes a point of view",
  hook: "Borrow the mechanism, never the identity.",
  body: "A creator-specific seven-slide story.",
  transformation_note: "Keeps the reveal rhythm while changing the argument, wording, palette, and composition.",
  carousel: slides,
  idempotency_key: "test.carousel.create.1",
});
if (parsed.slides.length !== 7) throw new Error("seven-slide contract was not preserved");
if (parsed.slides[0].kind !== "cover" || parsed.slides[6].kind !== "outro") {
  throw new Error("challenge carousel edge kinds were not normalized");
}

expectThrow(
  () => parseChallengePieceCreate({
    inspiration_id: "inspiration-20260830-001",
    context_receipt_id: "context-20260830-001",
    skill_id: "carousel-v1",
    skill_version: "1.0.0",
    title: "Invalid",
    transformation_note: "This has enough explanation to pass the note boundary.",
    carousel: slides.slice(0, 6),
  }),
  "exactly seven",
);

const receipt: ContextReceipt = {
  id: "context-20260830-001",
  created_at: new Date().toISOString(),
  purpose: "carousel_create",
  inspiration_id: parsed.inspirationId,
  piece_id: null,
  skill_id: "carousel-v1",
  skill_version: "1.0.0",
  brain_ids: [],
  example_piece_ids: [],
  summary: "bounded",
};
assertReceiptMatchesCreate(receipt, parsed);
expectThrow(
  () => assertReceiptMatchesCreate({ ...receipt, inspiration_id: "inspiration-20260830-999" }, parsed),
  "does not match",
);

const update = parseSlideUpdate({
  slide_index: 4,
  actor: "palm",
  title: "Only this slide changes",
  expected_version: 2,
  reason: "Make the evidence specific",
});
if (update.index !== 4 || update.actor !== "palm" || update.expectedVersion !== 2 || Object.keys(update.patch).length !== 1) {
  throw new Error("slide-specific update was not bounded");
}
if (parseSlideUpdate({ slide_index: 1, title: "Agent default" }).actor !== "codex") {
  throw new Error("WebMCP slide updates must default to Codex attribution");
}
expectThrow(() => parseSlideUpdate({ slide_index: 8, title: "No" }), "1 to 7");

const piece = { status: "qa_passed" } as PieceRecord;
if (humanPieceStatus(piece) !== "ready") throw new Error("Ready status mapping failed");
if (humanPieceStatus({ ...piece, status: "scheduled" }) !== "scheduled") {
  throw new Error("Scheduled status mapping failed");
}
