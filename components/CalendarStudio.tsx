"use client";

import { useMemo, useState } from "react";
import type { PieceRecord } from "@/lib/types";
import { activeVisualPath } from "@/lib/visualOutput";
import { shortDate, statusPill } from "@/lib/format";
import { summarizePostQuality, type QualityGateStatus } from "@/lib/postQuality";

type CalendarStudioProps = {
  pieces: PieceRecord[];
  selectedId: string | null;
  loading?: boolean;
  onSelectPiece: (id: string) => void;
  onOpenDetails: () => void;
  onSchedule: (when: string) => Promise<void>;
  onSavePiece: (patch: Partial<PieceRecord>) => Promise<void>;
  saving?: boolean;
};

type DayBucket = {
  date: Date;
  key: string;
  label: string;
  pieces: PieceRecord[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function CalendarStudio({
  pieces,
  selectedId,
  loading = false,
  onSelectPiece,
  onOpenDetails,
  onSchedule,
  onSavePiece,
  saving = false,
}: CalendarStudioProps) {
  const [scheduleValue, setScheduleValue] = useState("");
  const week = useMemo(() => buildCurrentWeek(pieces), [pieces]);
  const selected =
    pieces.find((piece) => piece.id === selectedId) ??
    firstActionablePiece(pieces) ??
    null;
  const draftPool = useMemo(() => unscheduledPieces(pieces), [pieces]);
  const approvedCount = pieces.filter((piece) => summarizePostQuality(piece).canApprove).length;
  const selectedQuality = selected ? summarizePostQuality(selected) : null;

  async function approveSelected() {
    if (!selected || !selectedQuality?.canApprove) return;
    await onSavePiece({
      status: selected.scheduled_for ? "scheduled" : "qa_passed",
    });
  }

  async function scheduleSelected() {
    if (!selected || !scheduleValue) return;
    await onSchedule(new Date(scheduleValue).toISOString());
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="label mb-1">Content calendar</div>
          <h1 className="font-sans text-[26px] font-semibold tracking-tight text-label">
            This week
          </h1>
          <p className="mt-1 max-w-2xl font-sans text-[13px] leading-relaxed text-labelSecondary">
            A post is text plus picture plus time. Click a card to verify it before it goes out.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 min-w-[330px]">
          <CalendarStat label="Planned" value={scheduledThisWeek(week)} />
          <CalendarStat label="Approved" value={approvedCount} />
          <CalendarStat label="Draft pool" value={draftPool.length} />
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-separator px-4 py-3">
            <div>
              <h2 className="font-sans text-[15px] font-semibold text-label">
                {week[0]?.date.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                to{" "}
                {week[6]?.date.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </h2>
              <p className="label mt-0.5">
                Calendar is simple. The approval gate is strict.
              </p>
            </div>
            <button type="button" className="btn" onClick={onOpenDetails}>
              Open details
            </button>
          </div>

          <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-7">
            {week.map((day) => (
              <CalendarDay
                key={day.key}
                day={day}
                selectedId={selected?.id ?? null}
                onSelectPiece={onSelectPiece}
              />
            ))}
          </div>

          <DraftPool
            pieces={draftPool}
            selectedId={selected?.id ?? null}
            onSelectPiece={onSelectPiece}
            loading={loading}
          />
        </section>

        <VerifyDrawer
          piece={selected}
          quality={selectedQuality}
          scheduleValue={scheduleValue}
          saving={saving}
          onScheduleValue={setScheduleValue}
          onApprove={approveSelected}
          onSchedule={scheduleSelected}
          onOpenDetails={onOpenDetails}
        />
      </div>
    </div>
  );
}

function CalendarStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-macMd border border-separator bg-elevated px-3 py-2">
      <div className="font-sans text-[10px] font-medium uppercase tracking-wide text-labelTertiary">
        {label}
      </div>
      <div className="mt-1 font-mono text-[18px] text-label">{value}</div>
    </div>
  );
}

function CalendarDay({
  day,
  selectedId,
  onSelectPiece,
}: {
  day: DayBucket;
  selectedId: string | null;
  onSelectPiece: (id: string) => void;
}) {
  const today = dateKey(new Date()) === day.key;
  return (
    <section
      className={`min-h-[210px] rounded-macMd border p-2 ${
        today ? "border-accent bg-accentMuted/40" : "border-separator bg-white/[0.025]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-sans text-[11px] font-semibold text-labelSecondary">
          {day.label}
        </span>
        <span className="font-mono text-[10px] text-labelTertiary">
          {day.date.getDate()}
        </span>
      </div>
      <div className="space-y-2">
        {day.pieces.map((piece) => (
          <PostCard
            key={piece.id}
            piece={piece}
            selected={piece.id === selectedId}
            onSelect={() => onSelectPiece(piece.id)}
          />
        ))}
      </div>
    </section>
  );
}

function PostCard({
  piece,
  selected,
  onSelect,
}: {
  piece: PieceRecord;
  selected: boolean;
  onSelect: () => void;
}) {
  const quality = summarizePostQuality(piece);
  const imagePath = activeVisualPath(piece);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full overflow-hidden rounded-macMd border text-left transition-colors hover:bg-fill ${
        selected ? "border-accent bg-accentMuted" : "border-separator bg-black/15"
      }`}
    >
      <ImagePreview path={imagePath ?? undefined} compact />
      <div className="p-2">
        <div className="line-clamp-2 font-sans text-[11px] font-semibold leading-snug text-label">
          {piece.title || piece.hook || piece.id}
        </div>
        <div className="mt-1 font-sans text-[10px] text-labelTertiary">
          {platformLabel(piece)} · {piece.scheduled_for ? shortTime(piece.scheduled_for) : "unscheduled"}
        </div>
        <div className="mt-1">
          <span className={quality.canApprove ? "pill pill-ok" : "pill pill-warn"}>
            {quality.canApprove ? "approved" : "not approved"}
          </span>
        </div>
      </div>
    </button>
  );
}

function DraftPool({
  pieces,
  selectedId,
  onSelectPiece,
  loading,
}: {
  pieces: PieceRecord[];
  selectedId: string | null;
  onSelectPiece: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div className="border-t border-separator p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-sans text-[14px] font-semibold text-label">Draft pool</h3>
        <span className="label">unscheduled or needs work</span>
      </div>
      {loading ? (
        <p className="label">Loading local data...</p>
      ) : pieces.length === 0 ? (
        <p className="label">No unscheduled drafts. Intake can add more source material.</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {pieces.map((piece) => (
            <button
              key={piece.id}
              type="button"
              onClick={() => onSelectPiece(piece.id)}
              className={`rounded-macMd border p-3 text-left transition-colors hover:bg-fill ${
                piece.id === selectedId
                  ? "border-accent bg-accentMuted"
                  : "border-separator bg-white/[0.025]"
              }`}
            >
              <div className="line-clamp-1 font-sans text-[13px] font-semibold text-label">
                {piece.title || piece.hook || piece.id}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                <span className={statusPill(piece.status)}>{piece.status}</span>
                <span className="pill pill-mute">{platformLabel(piece)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VerifyDrawer({
  piece,
  quality,
  scheduleValue,
  saving,
  onScheduleValue,
  onApprove,
  onSchedule,
  onOpenDetails,
}: {
  piece: PieceRecord | null;
  quality: ReturnType<typeof summarizePostQuality> | null;
  scheduleValue: string;
  saving: boolean;
  onScheduleValue: (value: string) => void;
  onApprove: () => Promise<void>;
  onSchedule: () => Promise<void>;
  onOpenDetails: () => void;
}) {
  if (!piece || !quality) {
    return (
      <aside className="card p-5">
        <h2 className="font-sans text-[18px] font-semibold text-label">
          Verify Post
        </h2>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-labelSecondary">
          Select a calendar card or draft to verify text plus picture before posting.
        </p>
      </aside>
    );
  }

  const imagePath = activeVisualPath(piece);

  return (
    <aside className="card overflow-hidden">
      <div className="border-b border-separator p-5">
        <div className="label mb-1">Verify before posting</div>
        <h2 className="font-sans text-[18px] font-semibold tracking-tight text-label">
          {quality.label}
        </h2>
        <p className="mt-1 font-sans text-[12px] leading-relaxed text-labelSecondary">
          {quality.detail}
        </p>
      </div>

      <div className="p-5">
        <div className="overflow-hidden rounded-macLg border border-separator bg-black/20">
          <ImagePreview path={imagePath ?? undefined} headline={piece.cover_headline || piece.title || piece.hook} />
          <div className="max-h-[220px] overflow-auto p-3 font-sans text-[12px] leading-relaxed text-label">
            {previewText(piece)}
          </div>
        </div>

        <div className="mt-4 space-y-1">
          {quality.gates.map((gate) => (
            <QualityRow key={gate.id} gate={gate} />
          ))}
        </div>

        <label className="mt-4 block">
          <span className="field-label">Schedule time</span>
          <input
            type="datetime-local"
            className="form-control"
            value={scheduleValue}
            onChange={(event) => onScheduleValue(event.target.value)}
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn" onClick={onOpenDetails}>
            Edit text
          </button>
          <button type="button" className="btn" onClick={onOpenDetails}>
            Replace picture
          </button>
          <button type="button" className="btn" onClick={onOpenDetails}>
            Open source
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void onSchedule()}
            disabled={!scheduleValue || saving}
          >
            Move date
          </button>
          <button
            type="button"
            className="btn-primary col-span-2 min-h-[36px]"
            onClick={() => void onApprove()}
            disabled={!quality.canApprove || saving}
            title={
              quality.canApprove
                ? "Approve this post"
                : "Approval is locked until all quality gates pass"
            }
          >
            {quality.canApprove
              ? saving
                ? "Approving..."
                : "Approve for posting"
              : "Approve locked until fixes are done"}
          </button>
        </div>
      </div>
    </aside>
  );
}

function QualityRow({
  gate,
}: {
  gate: ReturnType<typeof summarizePostQuality>["gates"][number];
}) {
  return (
    <div className="rounded-macSm bg-white/[0.035] px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="font-sans text-[12px] font-semibold text-label">
          {gate.label}
        </div>
        <span className={qualityPill(gate.status)}>{gate.status}</span>
      </div>
      <p className="mt-1 font-sans text-[11px] leading-relaxed text-labelTertiary">
        {gate.detail}
      </p>
    </div>
  );
}

function ImagePreview({
  path,
  headline,
  compact = false,
}: {
  path?: string;
  headline?: string;
  compact?: boolean;
}) {
  const src = path ? `/api/file?path=${encodeURIComponent(path)}` : null;
  return (
    <div
      className={`relative overflow-hidden bg-black/40 ${
        compact ? "h-[74px]" : "h-[210px]"
      }`}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-[radial-gradient(circle_at_70%_20%,rgba(122,176,255,.55),transparent_38%),linear-gradient(135deg,#222,#405a7f_55%,#121212)]" />
      )}
      {!compact && headline && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4">
          <div className="font-sans text-[19px] font-semibold leading-tight text-white">
            {headline}
          </div>
        </div>
      )}
    </div>
  );
}

function buildCurrentWeek(pieces: PieceRecord[]): DayBucket[] {
  const start = startOfWeek(new Date());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY_MS);
    const key = dateKey(date);
    return {
      date,
      key,
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      pieces: pieces
        .filter((piece) => piece.scheduled_for && dateKey(new Date(piece.scheduled_for)) === key)
        .sort((a, b) => (a.scheduled_for ?? "").localeCompare(b.scheduled_for ?? "")),
    };
  });
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const mondayOffset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - mondayOffset);
  return copy;
}

function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function unscheduledPieces(pieces: PieceRecord[]): PieceRecord[] {
  return pieces
    .filter((piece) =>
      ["idea", "draft", "qa_passed"].includes(piece.status) || !piece.scheduled_for,
    )
    .filter((piece) => piece.status !== "published" && piece.status !== "skipped")
    .sort((a, b) => (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at));
}

function firstActionablePiece(pieces: PieceRecord[]): PieceRecord | null {
  return unscheduledPieces(pieces)[0] ?? pieces[0] ?? null;
}

function scheduledThisWeek(week: DayBucket[]): number {
  return week.reduce((sum, day) => sum + day.pieces.length, 0);
}

function qualityPill(status: QualityGateStatus): string {
  if (status === "pass") return "pill pill-ok";
  if (status === "fail") return "pill pill-block";
  return "pill pill-warn";
}

function platformLabel(piece: PieceRecord): string {
  return piece.platforms.length ? piece.platforms.join(" / ") : piece.lead_platform;
}

function shortTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return shortDate(iso);
  }
}

function previewText(piece: PieceRecord): string {
  const lead = piece.platform_variants?.[piece.lead_platform];
  return lead || piece.body || piece.hook || "No text yet. Open details to draft this post.";
}
