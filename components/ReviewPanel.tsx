"use client";

export function ReviewPanel({
  markdown,
  onRun,
  running,
}: {
  markdown: string | null;
  onRun: () => Promise<void>;
  running: boolean;
}) {
  return (
    <section>
      <header className="flex items-baseline justify-between mb-4">
        <div>
          <h2 className="chart-label">Sunday weekly review</h2>
          <p className="label mt-1">AI prep + Palm decision = the closed loop (16-data-system.md Role 2)</p>
        </div>
        <button onClick={onRun} disabled={running} className="btn-primary">
          {running ? "Reviewing..." : "✦ Generate review"}
        </button>
      </header>

      <div className="card p-6">
        {markdown ? (
          <article className="prose-arutlee whitespace-pre-wrap font-sans text-paper-dim text-[15px] leading-relaxed">
            {markdown}
          </article>
        ) : (
          <div className="text-center text-paper-mute py-12">
            <p className="serif text-2xl mb-2">No review yet.</p>
            <p className="label">
              Click "Generate review" to read pieces / metrics / decisions and produce the Sunday template.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 card p-5">
        <h3 className="chart-label mb-3">What the AI checks</h3>
        <ul className="space-y-2 text-sm text-paper-dim font-light">
          <li>→ Top + bottom performers across saves + shares + comments</li>
          <li>→ Firewall near-misses from production logs</li>
          <li>→ Platform-by-platform pattern (which platforms over/underperformed for which formats)</li>
          <li>→ Trailing 4-week baseline comparison; flag any 2x+ swings</li>
          <li>→ 2-3 next-week candidates from the seed list, ranked by data signal</li>
        </ul>
      </div>
    </section>
  );
}
