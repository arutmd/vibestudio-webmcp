"use client";

import type { PieceRecord } from "@/lib/types";
import type { LiveAuditResult } from "@/lib/useLiveAudit";
import { pillClass, statusPill } from "@/lib/format";
import { computeNextAction } from "@/lib/nextAction";

function relativeAgo(iso: string | null | undefined): string {
  if (!iso) return "unknown";
  try {
    const then = new Date(iso).getTime();
    const ms = Date.now() - then;
    if (Number.isNaN(ms) || ms < 0) return "just now";
    const min = Math.floor(ms / 60_000);
    if (min < 1) return "just now";
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    const day = Math.floor(hr / 24);
    return `${day}d ago`;
  } catch {
    return "unknown";
  }
}

type AutopilotState = { running: boolean; stage: string | null; error: string | null };

// Slimmed inspector-style header. The piece title is in the toolbar now;
// this strip gives quick status + audit verdicts + the single most useful
// next action (clicking it jumps to the relevant section). When wired with
// Autopilot it also offers the one-tap "Autopilot" primary action.
export function VitalStrip({
  piece,
  audit,
  onJumpSection,
  onAutopilot,
  autopilot,
}: {
  piece: PieceRecord;
  audit: LiveAuditResult;
  onJumpSection: (n: 1 | 2 | 3 | 4 | 5) => void;
  onAutopilot?: () => void;
  autopilot?: AutopilotState;
}) {
  const next = computeNextAction(piece);
  const ap: AutopilotState = autopilot ?? { running: false, stage: null, error: null };
  const slopV = audit.ran ? audit.slop.verdict : piece.slop_check;
  const fwV = audit.ran ? audit.firewall.verdict : piece.firewall_check;
  const voiceV = audit.ran ? audit.voice.verdict : piece.voice_check;

  const reasonsTip = (reasons: string[]) =>
    reasons.length ? reasons.slice(0, 4).join("\n") : undefined;

  const lastTouched = piece.updated_at ?? piece.created_at;

  return (
    <div className="flex items-center gap-3 flex-wrap py-1">
      <span className={statusPill(piece.status)}>{piece.status}</span>
      <span className="pill pill-mute">{piece.format}</span>
      <span className="text-labelQuaternary">·</span>
      <span
        className={pillClass(fwV)}
        title={reasonsTip(audit.firewall.reasons) ?? "firewall"}
      >
        firewall
      </span>
      <span
        className={pillClass(slopV)}
        title={reasonsTip(audit.slop.reasons) ?? "slop"}
      >
        slop
      </span>
      <span
        className={pillClass(voiceV)}
        title={reasonsTip(audit.voice.reasons) ?? "voice"}
      >
        voice
      </span>
      {ap.error && <span className="pill pill-block">{ap.error}</span>}

      <span className="ml-auto flex items-center gap-3">
        <span className="font-sans text-[11px] text-labelTertiary">
          Edited {relativeAgo(lastTouched)}
        </span>
        {onAutopilot && (
          <button
            onClick={onAutopilot}
            disabled={ap.running}
            className="btn-primary"
            title="Run the full pipeline for this piece"
          >
            {ap.running ? `Autopilot: ${ap.stage ?? "..."}` : "Autopilot"}
          </button>
        )}
        {next ? (
          <button
            onClick={() => onJumpSection(next.section)}
            className="btn"
            title={`Jump to section 0${next.section}`}
          >
            Next: {next.label}
          </button>
        ) : (
          <span className="pill pill-ok">Shipped</span>
        )}
      </span>
    </div>
  );
}
