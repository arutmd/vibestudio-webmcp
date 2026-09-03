import type { PieceRecord } from "./types";
import { activeVisualIsReady } from "./visualOutput";

export type NextAction = { label: string; section: 1 | 2 | 3 | 4 | 5 };

/** The single computed next step for a piece. Null when there is nothing to do. */
export function computeNextAction(p: PieceRecord): NextAction | null {
  if (p.status === "published") return null;
  const hasSources = p.source_inbox_ids.length > 0;
  const hasBody = Boolean(p.body && p.body.trim());
  if (!hasSources && !hasBody) return { label: "Research", section: 1 };
  if (!hasBody) return { label: "Draft", section: 2 };
  const hasImage = activeVisualIsReady(p);
  if (!hasImage) return { label: "Generate image", section: 3 };
  const checksPass =
    p.firewall_check === "pass" && p.slop_check === "pass" && p.voice_check === "pass";
  if (!checksPass) return { label: "Audit", section: 4 };
  if (!p.scheduled_for) return { label: "Pack and schedule", section: 5 };
  return { label: "Ship", section: 5 };
}
