"use client";

import type { InboxRecord, PieceRecord } from "@/lib/types";

type Bucket = { key: string; label: string };
const BUCKETS: Bucket[] = [
  { key: "inbox", label: "Inbox" },
  { key: "drafting", label: "Drafting" },
  { key: "ready", label: "Ready" },
  { key: "scheduled", label: "Scheduled" },
  { key: "live", label: "Live" },
];

export function bucketOf(p: PieceRecord): string {
  if (p.status === "published") return "live";
  if (p.status === "scheduled") return "scheduled";
  if (p.status === "qa_passed") return "ready";
  return "drafting"; // idea | draft | held | skipped
}

export function PieceRail(props: {
  inbox: InboxRecord[];
  pieces: PieceRecord[];
  selectedId: string | null;
  onSelectPiece: (id: string) => void;
  onTurnIntoPiece: (rec: InboxRecord) => void;
  promotingId: string | null;
}) {
  const { inbox, pieces, selectedId, onSelectPiece, onTurnIntoPiece, promotingId } = props;
  const usedInboxIds = new Set(pieces.flatMap((p) => p.source_inbox_ids));
  const freshInbox = inbox.filter(
    (r) => !usedInboxIds.has(r.id) && r.status !== "skipped",
  );
  const grouped = new Map<string, PieceRecord[]>();
  for (const p of pieces) {
    const b = bucketOf(p);
    grouped.set(b, [...(grouped.get(b) ?? []), p]);
  }
  return (
    <aside className="sidebar-surface w-60 shrink-0 overflow-y-auto p-2">
      {BUCKETS.map((b) => {
        const items = b.key === "inbox" ? freshInbox : (grouped.get(b.key) ?? []);
        if (items.length === 0) return null;
        return (
          <section key={b.key} className="mb-3">
            <div className="label px-2 py-1">
              {b.label} ({items.length})
            </div>
            {b.key === "inbox"
              ? freshInbox.map((r) => (
                  <div key={r.id} className="list-row flex items-center justify-between gap-2">
                    <span className="truncate footnote" title={r.raw}>
                      {r.ingredients?.source_title ?? r.raw.slice(0, 60)}
                    </span>
                    <button
                      className="btn shrink-0"
                      disabled={promotingId === r.id}
                      onClick={() => onTurnIntoPiece(r)}
                      title="Turn into a piece"
                    >
                      {promotingId === r.id ? "..." : "+"}
                    </button>
                  </div>
                ))
              : (items as PieceRecord[]).map((p) => (
                  <button
                    key={p.id}
                    className="list-row w-full text-left truncate"
                    data-selected={p.id === selectedId}
                    onClick={() => onSelectPiece(p.id)}
                    title={p.title}
                  >
                    {p.title || p.id}
                  </button>
                ))}
          </section>
        );
      })}
    </aside>
  );
}
