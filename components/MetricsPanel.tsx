"use client";

import { useState } from "react";
import type { MetricsRecord, PieceRecord, PlatformId } from "@/lib/types";
import { shortDate } from "@/lib/format";

const PLATFORMS: PlatformId[] = ["linkedin", "facebook", "instagram", "threads", "tiktok"];
const WINDOWS = ["24h", "7d", "30d"] as const;

export function MetricsPanel({
  pieces,
  metrics,
  onRecord,
  onSync,
  syncing,
}: {
  pieces: PieceRecord[];
  metrics: MetricsRecord[];
  onRecord: (m: Omit<MetricsRecord, "captured_at">) => Promise<void>;
  onSync: () => Promise<void>;
  syncing: boolean;
}) {
  const [pieceId, setPieceId] = useState<string>(pieces[0]?.id ?? "");
  const [platform, setPlatform] = useState<PlatformId>("linkedin");
  const [windowKey, setWindow] = useState<MetricsRecord["window"]>("7d");
  const [impressions, setImpressions] = useState("");
  const [saves, setSaves] = useState("");
  const [shares, setShares] = useState("");
  const [comments, setComments] = useState("");
  const [followerDelta, setFollowerDelta] = useState("");

  const totals = metrics.reduce(
    (acc, m) => {
      acc.impressions += m.impressions ?? 0;
      acc.saves += m.saves ?? 0;
      acc.shares += m.shares ?? 0;
      acc.comments += m.comments ?? 0;
      return acc;
    },
    { impressions: 0, saves: 0, shares: 0, comments: 0 },
  );

  const top = [...metrics]
    .map((m) => ({ ...m, score: (m.saves ?? 0) + (m.shares ?? 0) + (m.comments ?? 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
      <div className="space-y-6">
        <header className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="chart-label">Metrics</h2>
          <div className="flex items-center gap-3">
            <span className="label">Layer 2 / engagement, weekly snapshot</span>
            <button onClick={onSync} disabled={syncing} className="btn">
              {syncing ? "Syncing..." : "↻ Sync from Buffer"}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Impressions" value={totals.impressions} />
          <Stat label="Saves" value={totals.saves} accent />
          <Stat label="Shares" value={totals.shares} accent />
          <Stat label="Comments" value={totals.comments} />
        </div>

        <div className="card p-4">
          <h3 className="chart-label mb-3">Top by saves+shares+comments</h3>
          {top.length === 0 ? (
            <p className="text-paper-mute text-sm italic">No metrics recorded yet.</p>
          ) : (
            <ol className="space-y-2">
              {top.map((m, i) => {
                const piece = pieces.find((p) => p.id === m.piece_id);
                return (
                  <li key={`${m.piece_id}-${m.platform}-${m.captured_at}`} className="flex items-center gap-3 text-sm border-b border-rule pb-2 last:border-0">
                    <span className="font-mono text-xs text-paper-mute w-6">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex-1 truncate">{piece?.title ?? m.piece_id}</span>
                    <span className="pill pill-mute">{m.platform}</span>
                    <span className="font-mono text-amber">{m.score}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="card p-4">
          <h3 className="chart-label mb-3">All snapshots</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="label border-b border-rule">
                  <th className="text-left py-2">Captured</th>
                  <th className="text-left">Piece</th>
                  <th className="text-left">Platform</th>
                  <th className="text-left">Win</th>
                  <th className="text-right">Imp</th>
                  <th className="text-right">Saves</th>
                  <th className="text-right">Shares</th>
                  <th className="text-right">Comm</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {metrics.length === 0 && (
                  <tr>
                    <td className="py-3 text-paper-mute italic" colSpan={8}>
                      Empty.
                    </td>
                  </tr>
                )}
                {metrics
                  .slice()
                  .reverse()
                  .map((m, i) => (
                    <tr key={i} className="border-b border-rule-soft">
                      <td className="py-1 text-paper-mute">{shortDate(m.captured_at)}</td>
                      <td className="text-paper">{m.piece_id}</td>
                      <td>{m.platform}</td>
                      <td>{m.window}</td>
                      <td className="text-right">{m.impressions ?? "·"}</td>
                      <td className="text-right text-amber">{m.saves ?? "·"}</td>
                      <td className="text-right text-amber">{m.shares ?? "·"}</td>
                      <td className="text-right">{m.comments ?? "·"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <aside>
        <div className="card p-5">
          <h3 className="chart-label mb-3">Record snapshot</h3>
          <p className="label text-paper-mute mb-4 leading-relaxed">
            Pull from each platform's native analytics at +24h, +7d, +30d. Append-only; latest reading wins on
            duplicates.
          </p>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!pieceId) return;
              await onRecord({
                piece_id: pieceId,
                platform,
                window: windowKey,
                impressions: numOrUndef(impressions),
                saves: numOrUndef(saves),
                shares: numOrUndef(shares),
                comments: numOrUndef(comments),
                follower_delta: followerDelta ? Number(followerDelta) : null,
              });
              setImpressions("");
              setSaves("");
              setShares("");
              setComments("");
              setFollowerDelta("");
            }}
          >
            <label>
              <span className="field-label">Piece</span>
              <select className="input" value={pieceId} onChange={(e) => setPieceId(e.target.value)}>
                {pieces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} / {p.title || p.hook || "(untitled)"}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="field-label">Platform</span>
                <select
                  className="input"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as PlatformId)}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">Window</span>
                <select
                  className="input"
                  value={windowKey}
                  onChange={(e) => setWindow(e.target.value as MetricsRecord["window"])}
                >
                  {WINDOWS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Impressions" value={impressions} setValue={setImpressions} />
              <NumberField label="Saves" value={saves} setValue={setSaves} />
              <NumberField label="Shares" value={shares} setValue={setShares} />
              <NumberField label="Comments" value={comments} setValue={setComments} />
              <NumberField label="Follower Δ" value={followerDelta} setValue={setFollowerDelta} />
            </div>
            <button type="submit" className="btn-primary w-full">
              Append to metrics.jsonl
            </button>
          </form>
        </div>
      </aside>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="card p-4">
      <span className="label">{label}</span>
      <div className={`mt-1 font-mono text-3xl ${accent ? "text-amber" : "text-paper"}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        className="input font-mono text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </label>
  );
}

function numOrUndef(v: string): number | undefined {
  if (!v.trim()) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
