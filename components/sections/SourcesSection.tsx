"use client";

import type { InboxRecord, PieceRecord } from "@/lib/types";

export function SourcesSection(props: {
  piece: PieceRecord;
  sources: InboxRecord[];
}) {
  const { sources } = props;
  const photos = sources.flatMap((s) => s.image_paths ?? []).slice(0, 5);
  return (
    <section id="section-1" className="card p-4">
      <h3 className="title-2">1. Sources and research</h3>
      {sources.length === 0 && (
        <p className="footnote mt-2">
          No sources yet. Press Autopilot to research this piece: it fetches real pages, summarizes them, and pulls reference photos.
        </p>
      )}
      {sources.map((s) => (
        <div key={s.id} className="mt-3">
          <div className="label">
            {s.source} · {s.captured_at.slice(0, 10)}
          </div>
          <p className="body-text whitespace-pre-wrap">
            {s.ingredients?.summary ?? s.raw.slice(0, 400)}
          </p>
          {s.url && (
            <a className="footnote underline" href={s.url} target="_blank" rel="noreferrer">
              {s.url}
            </a>
          )}
        </div>
      ))}
      {photos.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p}
              src={`/api/file?path=${encodeURIComponent(p)}`}
              alt="reference"
              className="h-24 rounded-macSm object-cover"
            />
          ))}
        </div>
      )}
    </section>
  );
}
