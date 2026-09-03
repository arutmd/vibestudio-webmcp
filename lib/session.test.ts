import { deriveSessionTitle, isUnstartedSession, isVibeSession, sessionReceipt, starterSessionSlides } from "./session";
import type { PieceRecord } from "./types";

const brief = "Build a carousel that explains why durable creator memory matters. Keep it calm and evidence-led.";
const title = deriveSessionTitle(brief);
if (title !== "Why durable creator memory matters") {
  throw new Error(`unexpected Session title: ${title}`);
}

const slides = starterSessionSlides(brief, title);
if (slides.length !== 7 || slides[0].kind !== "cover" || slides[6].kind !== "outro") {
  throw new Error("Session starter did not preserve the seven-slide contract");
}
if (new Set(slides.map((slide) => slide.index)).size !== 7) {
  throw new Error("Session starter slide indices are not unique");
}
if (deriveSessionTitle("") !== "New session") {
  throw new Error("blank Session did not keep the expected new-session title");
}

const waiting = {
  id: "field-note-20260901-001",
  title,
  hook: brief,
  status: "draft",
  skill_id: "carousel-v1",
  current_version: 1,
  session_connection_id: "6f101784-009a-43f3-87a9-30bdcf9ca843",
  session_connection_status: "waiting",
  context_receipt_id: "context-20260901-001",
} as PieceRecord;
if (!isVibeSession(waiting)) throw new Error("shared carousel was not recognized as a Session");
if (isUnstartedSession(waiting)) throw new Error("a Session with a creator brief was treated as unstarted");
const waitingReceipt = sessionReceipt(waiting);
if (waitingReceipt.connection_status !== "waiting" || waitingReceipt.connected_agent !== null) {
  throw new Error("waiting Session receipt claims an agent connection");
}

const connectedReceipt = sessionReceipt({
  ...waiting,
  session_connection_status: "connected",
  session_agent_label: "Codex",
  session_connected_at: "2026-09-01T12:00:00+07:00",
});
if (connectedReceipt.connection_status !== "connected" || connectedReceipt.connected_agent !== "Codex") {
  throw new Error("connected Session receipt lost its agent handshake");
}

if (!isUnstartedSession({ ...waiting, title: "New session", hook: "", session_brief: "" })) {
  throw new Error("blank UI Session was not recognized as awaiting its first Codex direction");
}
