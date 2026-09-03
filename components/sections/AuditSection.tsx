"use client";

import type { PieceRecord } from "@/lib/types";

const CHECKS = [
  { key: "slop", label: "Slop test" },
  { key: "firewall", label: "Cariva / Vein firewall" },
  { key: "voice", label: "Voice register" },
] as const;

export function AuditSection(props: {
  piece: PieceRecord;
  onAudit: () => void;
  auditing: boolean;
  onJumpToDraft: () => void;
}) {
  const { piece, onAudit, auditing, onJumpToDraft } = props;
  const verdictOf = (k: string) =>
    (piece as unknown as Record<string, string>)[`${k}_check`] ?? "not_run";
  const reasonsOf = (k: string) =>
    ((piece as unknown as Record<string, string[]>)[`${k}_reasons`] ?? []);
  const pill = (v: string) =>
    v === "pass"
      ? "pill-ok"
      : v === "fail"
      ? "pill-block"
      : v === "near_miss"
      ? "pill-warn"
      : "pill-mute";
  return (
    <section id="section-4" className="card p-4">
      <div className="flex items-center justify-between">
        <h3 className="title-2">4. Quality audit</h3>
        <button className="btn" onClick={onAudit} disabled={auditing}>
          {auditing ? "Auditing..." : "Run audit"}
        </button>
      </div>
      {CHECKS.map((c) => {
        const v = verdictOf(c.key);
        const reasons = reasonsOf(c.key);
        return (
          <div key={c.key} className="mt-3">
            <div className="flex items-center gap-2">
              <span className={`pill ${pill(v)}`}>{v}</span>
              <span className="chart-label">{c.label}</span>
            </div>
            {reasons.length > 0 && (
              <ul className="mt-1 ml-1">
                {reasons.map((r, i) => (
                  <li key={i} className="footnote flex items-center gap-2">
                    <span>{r}</span>
                    <button
                      className="btn"
                      onClick={onJumpToDraft}
                      title="Jump to the draft"
                    >
                      fix
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      <p className="footnote mt-3">
        Rule failures block shipping and cannot be overridden by AI.
      </p>
    </section>
  );
}
