import type { CarouselSlide, PieceRecord } from "./types";

export type SessionReceipt = {
  session_id: string;
  connection_id: string;
  connection_status: "waiting" | "connected";
  connected_agent: string | null;
  connected_at: string | null;
  output: "carousel";
  title: string;
  brief: string;
  status: PieceRecord["status"];
  version: number;
  context_receipt_id: string | null;
  instruction: string;
};

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function deriveSessionTitle(brief: string): string {
  const clean = cleanText(brief);
  if (!clean) return "New session";
  const firstThought = clean.split(/(?<=[.!?])\s/)[0] ?? clean;
  const firstClause = firstThought.split(/[,;:]\s/)[0] ?? firstThought;
  const withoutFormatFraming = firstClause.replace(
    /^(?:(?:please\s+)?(?:make|create|build|design|draft|write)\s+(?:me\s+)?)?(?:an?\s+)?(?:launch\s+)?(?:carousel|hero image|video|post)(?:\s+(?:that explains|explaining|showing|about|on))?\s+/i,
    "",
  );
  const candidate = (withoutFormatFraming || firstClause).replace(/[.!?]+$/, "");
  const titled = candidate.charAt(0).toLocaleUpperCase() + candidate.slice(1);
  if (titled.length <= 96) return titled;
  return `${titled.slice(0, 93).trimEnd()}…`;
}

export function starterSessionSlides(brief: string, title = deriveSessionTitle(brief)): CarouselSlide[] {
  const cleanBrief = cleanText(brief);
  const beats: Array<[CarouselSlide["kind"], string, string, string]> = [
    ["cover", title, cleanBrief, "Choose one unmistakable visual metaphor that makes the promise visible."],
    ["section", "The tension", "Name what the audience currently experiences or believes.", "Show the current state with one concrete scene, object, or interface."],
    ["section", "The shift", "Reveal the idea that changes how the audience sees the problem.", "Contrast the old assumption with the new frame without using generic arrows."],
    ["section", "The useful detail", "Give one specific proof, mechanism, example, or observation.", "Zoom into the detail that makes the argument credible."],
    ["section", "How it works", "Turn the idea into a sequence the audience can follow.", "Use a restrained visual system with a clear reading order."],
    ["section", "What to remember", "Compress the story into one line worth saving or sharing.", "Let the memorable line own the frame with calm negative space."],
    ["outro", "The next move", "End with a useful action, question, or invitation.", "Close the visual story with a decisive but human final image."],
  ];
  return beats.map(([kind, slideTitle, body, visualCue], index) => ({
    index: index + 1,
    kind,
    title: slideTitle,
    body,
    visual_cue: visualCue,
  }));
}

export function isVibeSession(piece: PieceRecord): boolean {
  return piece.skill_id === "carousel-v1" || Boolean(piece.session_connection_id);
}

export function isUnstartedSession(piece: PieceRecord): boolean {
  return isVibeSession(piece)
    && !(piece.session_brief ?? piece.hook ?? "").trim()
    && (piece.current_version ?? 1) === 1;
}

export function sessionReceipt(piece: PieceRecord): SessionReceipt {
  const status = piece.session_connection_status ?? "waiting";
  return {
    session_id: piece.id,
    connection_id: piece.session_connection_id ?? "",
    connection_status: status,
    connected_agent: status === "connected" ? piece.session_agent_label ?? "Codex" : null,
    connected_at: piece.session_connected_at ?? null,
    output: piece.session_output ?? "carousel",
    title: piece.title,
    brief: piece.session_brief ?? piece.hook,
    status: piece.status,
    version: piece.current_version ?? 1,
    context_receipt_id: piece.context_receipt_id ?? null,
    instruction: status === "connected"
      ? `Continue all work for this creator task in VibeStudio Session ${piece.id}. Read the selected Session and its Template receipt before changing it.`
      : `Connect the current browser agent to VibeStudio Session ${piece.id} with its connection receipt before changing it.`,
  };
}
