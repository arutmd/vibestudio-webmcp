"use client";

import { useState } from "react";
import type { PieceRecord, PlatformId } from "@/lib/types";

const PACK_PLATFORMS: PlatformId[] = ["linkedin", "facebook", "instagram"];

export function ShipSection(props: {
  piece: PieceRecord;
  onGeneratePlatform: (platform: PlatformId) => void;
  onCopyPack: () => void;
  onSchedule: (when: string) => void;
  busy: Record<string, boolean>;
}) {
  const { piece, onGeneratePlatform, onCopyPack, onSchedule, busy } = props;
  const [when, setWhen] = useState(piece.scheduled_for ?? "");
  const checksPass =
    piece.firewall_check === "pass" &&
    piece.slop_check === "pass" &&
    piece.voice_check === "pass";
  const variants = piece.platform_variants ?? {};
  // Always show the lead platform first, even if it is outside the default pack set.
  const platforms = Array.from(
    new Set<PlatformId>([piece.lead_platform, ...PACK_PLATFORMS]),
  );
  return (
    <section id="section-5" className="card p-4">
      <h3 className="title-2">5. Pack and schedule</h3>

      <div className="label mt-3">Platforms</div>
      <div className="mt-1 flex flex-wrap gap-2">
        {platforms.map((pl) => {
          const isLead = pl === piece.lead_platform;
          const has = isLead ? Boolean(piece.body?.trim()) : Boolean(variants[pl]);
          return (
            <span key={pl} className="flex items-center gap-1">
              <span className={`pill ${has ? "pill-ok" : "pill-mute"}`}>
                {pl}
                {isLead ? " (lead)" : ""}
              </span>
              {!isLead && !has && (
                <button
                  className="btn"
                  disabled={busy[`platform:${pl}`]}
                  onClick={() => onGeneratePlatform(pl)}
                >
                  {busy[`platform:${pl}`] ? "..." : `Generate ${pl}`}
                </button>
              )}
            </span>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          className="btn-primary"
          onClick={onCopyPack}
          disabled={!checksPass || busy.pack}
          title={
            checksPass
              ? "Copy all platform text + image path"
              : "Blocked until the audit passes"
          }
        >
          {busy.pack ? "Packing..." : "Pack"}
        </button>
        <input
          type="datetime-local"
          className="input"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
        <button
          className="btn"
          disabled={!when || busy.schedule}
          onClick={() => onSchedule(when)}
        >
          {busy.schedule ? "Scheduling..." : "Schedule"}
        </button>
        {!checksPass && (
          <span className="pill pill-warn">audit must pass first</span>
        )}
      </div>
      <p className="footnote mt-2">
        Pack copies a paste-ready bundle to your clipboard. Auto-posting comes
        later through the same seam.
      </p>
    </section>
  );
}
