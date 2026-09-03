"use client";

import { useState } from "react";
import type { useStudio } from "@/lib/useStudio";
import { CalendarStudio } from "./CalendarStudio";
import { ReviewPanel } from "./ReviewPanel";

type Studio = ReturnType<typeof useStudio>;
type DeskTab = "calendar" | "metrics" | "review";

export function DeskRoom(props: { studio: Studio }) {
  const { studio } = props;
  const [tab, setTab] = useState<DeskTab>("calendar");

  // Calendar shows all pieces (scheduled, published, drafts in pool).
  // CalendarStudio internally partitions them into week buckets + draft pool.
  const allPieces = studio.pieces;

  return (
    <div className="p-4">
      <nav className="segmented mb-4">
        {(["calendar", "metrics", "review"] as DeskTab[]).map((t) => (
          <button
            key={t}
            className="segmented-item"
            data-active={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "calendar"
              ? "Calendar"
              : t === "metrics"
                ? "Metrics"
                : "Weekly review"}
          </button>
        ))}
      </nav>

      {tab === "calendar" && (
        <CalendarStudio
          pieces={allPieces}
          selectedId={studio.selectedId}
          loading={!studio.loaded}
          onSelectPiece={studio.setSelectedId}
          onOpenDetails={() => undefined}
          onSchedule={async (when) => {
            if (studio.selected) {
              await studio.schedule(studio.selected, when);
            }
          }}
          onSavePiece={async (patch) => {
            if (studio.selected) {
              await studio.savePiece(studio.selected.id, patch);
            }
          }}
          saving={studio.busy["schedule"] ?? false}
        />
      )}

      {tab === "metrics" && <MetricsLite pieces={allPieces} />}

      {tab === "review" && <ReviewWrapper flash={studio.flash} />}
    </div>
  );
}

// MetricsLite: MetricsPanel requires a `metrics: MetricsRecord[]` array plus
// `onRecord` and `onSync` callbacks. useStudio does not expose a metrics array
// or those handlers, so we keep the lite fallback instead of mounting the real
// MetricsPanel. The full panel is available when metrics are wired to useStudio.
function MetricsLite({
  pieces,
}: {
  pieces: { id: string; title?: string | null; status: string }[];
}) {
  const shipped = pieces.filter(
    (p) => p.status === "scheduled" || p.status === "published",
  );
  return (
    <div className="card p-4">
      <h3 className="title-2">Metrics</h3>
      <p className="footnote mt-2">
        {shipped.length} shipped piece{shipped.length === 1 ? "" : "s"}. Manual
        snapshots live in data/metrics.jsonl.
      </p>
    </div>
  );
}

// ReviewWrapper: ReviewPanel has a clean props shape (markdown, onRun, running)
// that we can satisfy with local state + the /api/ai/weekly-review route.
// The route returns { markdown: string }. We mount the real ReviewPanel.
function ReviewWrapper({ flash }: { flash: (m: string) => void }) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function handleRun() {
    setRunning(true);
    try {
      const res = await fetch("/api/ai/weekly-review", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "review failed");
      const text = (data as { markdown?: string }).markdown;
      setMarkdown(text ?? JSON.stringify(data));
    } catch (e) {
      flash(e instanceof Error ? e.message : "review failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <ReviewPanel markdown={markdown} onRun={handleRun} running={running} />
  );
}
