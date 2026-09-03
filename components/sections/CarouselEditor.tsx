"use client";

import { useEffect, useMemo, useState } from "react";
import type { CarouselSlide, PieceRecord } from "@/lib/types";
import type { CarouselState } from "@/lib/useStudio";

function fileUrl(path?: string): string | null {
  return path ? `/api/file?path=${encodeURIComponent(path)}` : null;
}

function reindex(slides: CarouselSlide[]): CarouselSlide[] {
  return slides.map((slide, position) => ({
    ...slide,
    index: position + 1,
    kind:
      position === 0
        ? "cover"
        : position === slides.length - 1
          ? "outro"
          : slide.kind === "cover" || slide.kind === "outro"
            ? "section"
            : slide.kind,
    asset_path: undefined,
  }));
}

function SlidePreview(props: { slide: CarouselSlide; total: number }) {
  const { slide, total } = props;
  const asset = fileUrl(slide.asset_path);
  const background = fileUrl(slide.background_path);

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-macMd bg-[#F5F1E8] text-[#1A1A1A]">
      {asset ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset} alt={`Rendered slide ${slide.index}`} className="h-full w-full object-cover" />
      ) : (
        <>
          {background ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={background} alt="" className="absolute inset-x-3 top-12 h-[43%] w-[calc(100%-1.5rem)] rounded-lg object-cover" />
          ) : (
            <div className="absolute inset-x-3 top-12 h-[43%] rounded-lg bg-[#202126]" />
          )}
          <div className="absolute left-4 right-4 top-4 flex justify-between font-mono text-[8px] font-bold tracking-wide">
            <span>ARUTLEE / {slide.kind.toUpperCase()}</span>
            <span>{slide.index}/{total}</span>
          </div>
          <div className="absolute bottom-5 left-5 right-5">
            <div className="mb-3 h-0.5 w-14 bg-[#D4341A]" />
            <div className="text-[18px] font-bold leading-tight">{slide.title}</div>
            <div className="mt-2 line-clamp-4 text-[10px] leading-relaxed opacity-70">{slide.body}</div>
          </div>
        </>
      )}
    </div>
  );
}

export function CarouselEditor(props: {
  piece: PieceRecord;
  onBuild: (slides: number) => void;
  onSave: (slides: CarouselSlide[]) => Promise<unknown>;
  onGenerateVisual: (slideIndex: number, slides: CarouselSlide[]) => void;
  onGenerateAllVisuals: (slides: CarouselSlide[]) => void;
  onRender: (slides: CarouselSlide[]) => void;
  onFinish: (slides: CarouselSlide[]) => void;
  busy: Record<string, boolean>;
  state: CarouselState;
}) {
  const {
    piece,
    onBuild,
    onSave,
    onGenerateVisual,
    onGenerateAllVisuals,
    onRender,
    onFinish,
    busy,
    state,
  } = props;
  const [slides, setSlides] = useState<CarouselSlide[]>(piece.carousel ?? []);
  const [slideCount, setSlideCount] = useState(piece.carousel?.length || 8);
  const [selectedPosition, setSelectedPosition] = useState(0);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const next = (piece.carousel ?? []).slice().sort((a, b) => a.index - b.index);
    setSlides(next);
    setSlideCount(next.length || 8);
    setSelectedPosition((position) => Math.min(position, Math.max(0, next.length - 1)));
    setDirty(false);
  }, [piece.id, piece.updated_at, piece.carousel]);

  const missingVisuals = useMemo(
    () => slides.filter((slide) => !slide.background_path).length,
    [slides],
  );
  const rendered = slides.filter((slide) => slide.asset_path).length;
  const selectedSlide = slides[selectedPosition] ?? null;
  const finishing = Boolean(busy["carousel:finish"] || state.running);
  const ready = Boolean(
    slides.length && rendered === slides.length && missingVisuals === 0 && !dirty,
  );

  const patchSlide = (index: number, patch: Partial<CarouselSlide>) => {
    setSlides((items) =>
      items.map((slide) =>
        slide.index === index ? { ...slide, ...patch, asset_path: undefined } : slide,
      ),
    );
    setDirty(true);
  };

  const move = (position: number, delta: number) => {
    const target = position + delta;
    if (target < 0 || target >= slides.length) return;
    const next = slides.slice();
    [next[position], next[target]] = [next[target], next[position]];
    setSlides(reindex(next));
    setSelectedPosition(target);
    setDirty(true);
  };

  const rebuild = () => {
    if (slides.length && !window.confirm("Replace the current carousel story? Existing image files stay on disk.")) return;
    setEditing(false);
    onBuild(slideCount);
  };

  const progressLabel =
    state.stage === "story"
      ? "Writing the slide story"
      : state.stage === "images"
        ? "Creating the visuals"
        : "Exporting the final slides";

  if (!slides.length) {
    return (
      <div className="mt-4 rounded-macMd border border-separator bg-contentBg p-5 text-center">
        <p className="title-3">Turn this draft into a carousel</p>
        <p className="footnote mx-auto mt-1 max-w-md">
          Start with an editable 8-slide story. Nothing is published automatically.
        </p>
        <button
          className="btn-primary mt-4 px-5 py-2"
          onClick={() => onBuild(8)}
          disabled={!piece.body?.trim() || busy["carousel:story"]}
        >
          {busy["carousel:story"] ? "Creating slide draft..." : "Create carousel draft"}
        </button>
        {!piece.body?.trim() && <p className="footnote mt-2">Write the post draft first.</p>}
        {state.error && <p className="mt-2 text-systemRed footnote">{state.error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className={`rounded-macMd border p-4 ${ready ? "border-[#30d15855] bg-[#30d1580b]" : "border-separator bg-contentBg"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="title-3">{slides.length}-slide carousel</p>
              <span className={`pill ${ready ? "pill-ok" : "pill-warn"}`}>
                {ready ? "ready" : "needs finishing"}
              </span>
            </div>
            <p className="footnote mt-1">
              {ready
                ? "All slides are generated and exported. Check them below or in the preview."
                : missingVisuals
                  ? `Next: create ${missingVisuals} missing visual${missingVisuals === 1 ? "" : "s"} and export the deck.`
                  : "Next: export the final deck with your latest edits."}
            </p>
          </div>
          {!ready && (
            <button
              className="btn-primary px-5 py-2"
              disabled={finishing}
              onClick={() => onFinish(slides)}
            >
              {finishing ? progressLabel : "Finish carousel"}
            </button>
          )}
        </div>

        {state.running && (
          <div className="mt-3">
            <div className="flex items-center justify-between footnote">
              <span>{progressLabel}</span>
              <span>{state.completed} / {state.total || 1}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.max(6, (state.completed / Math.max(1, state.total)) * 100)}%` }}
              />
            </div>
          </div>
        )}
        {state.error && <p className="mt-2 text-systemRed footnote">{state.error}</p>}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Carousel slides">
        {slides.map((slide, position) => {
          const asset = fileUrl(slide.asset_path);
          return (
            <button
              key={slide.index}
              className={`w-20 shrink-0 overflow-hidden rounded-macSm border text-left transition-colors ${
                selectedPosition === position ? "border-accent bg-fill" : "border-separator bg-contentBg"
              }`}
              onClick={() => {
                setSelectedPosition(position);
                setEditing(false);
              }}
              aria-label={`View slide ${slide.index}`}
            >
              <div className="aspect-[4/5] bg-[#202126]">
                {asset ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[11px] text-labelSecondary">
                    Slide {slide.index}
                  </div>
                )}
              </div>
              <div className="truncate px-2 py-1.5 text-[11px]">{slide.index}. {slide.title}</div>
            </button>
          );
        })}
      </div>

      {selectedSlide && (
        <div className="mt-2 grid gap-4 rounded-macMd border border-separator bg-contentBg p-4 md:grid-cols-[220px_1fr]">
          <SlidePreview slide={selectedSlide} total={slides.length} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="footnote">Slide {selectedSlide.index} of {slides.length} · {selectedSlide.kind}</p>
                {!editing && <p className="title-3 mt-1">{selectedSlide.title}</p>}
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="btn-ghost"
                  onClick={() => setSelectedPosition((position) => Math.max(0, position - 1))}
                  disabled={selectedPosition === 0}
                >
                  Previous
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setSelectedPosition((position) => Math.min(slides.length - 1, position + 1))}
                  disabled={selectedPosition === slides.length - 1}
                >
                  Next
                </button>
              </div>
            </div>

            {editing ? (
              <div className="mt-3">
                <label className="field-label block">Slide title</label>
                <textarea
                  className="input mt-1 min-h-[58px] w-full"
                  value={selectedSlide.title}
                  onChange={(event) => patchSlide(selectedSlide.index, { title: event.target.value })}
                />
                <label className="field-label mt-2 block">Slide copy</label>
                <textarea
                  className="input mt-1 min-h-[100px] w-full"
                  value={selectedSlide.body}
                  onChange={(event) => patchSlide(selectedSlide.index, { body: event.target.value })}
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    className="btn-primary"
                    disabled={!dirty}
                    onClick={() => void onSave(slides).then(() => {
                      setDirty(false);
                      setEditing(false);
                    })}
                  >
                    Save changes
                  </button>
                  <button className="btn" onClick={() => setEditing(false)}>Done</button>
                  {dirty && <span className="pill pill-warn">not saved</span>}
                </div>
              </div>
            ) : (
              <>
                <p className="body-text mt-3 whitespace-pre-wrap">{selectedSlide.body}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button className="btn" onClick={() => setEditing(true)}>Edit this slide</button>
                  <span className={`pill ${selectedSlide.background_path ? "pill-ok" : "pill-mute"}`}>
                    {selectedSlide.background_path ? "AI visual ready" : "designed background"}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <details className="mt-3 rounded-macMd border border-separator bg-contentBg p-3">
        <summary className="cursor-pointer text-[13px] font-medium text-labelSecondary">More options</summary>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <p className="field-label">Whole carousel</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                className="input"
                value={slideCount}
                onChange={(event) => setSlideCount(Number(event.target.value))}
                aria-label="Carousel slide count"
              >
                {[6, 7, 8, 9, 10].map((count) => (
                  <option key={count} value={count}>{count} slides</option>
                ))}
              </select>
              <button className="btn" onClick={rebuild} disabled={!piece.body?.trim() || busy["carousel:story"]}>
                {busy["carousel:story"] ? "Rebuilding..." : "Rebuild story"}
              </button>
              <button
                className="btn"
                disabled={busy["carousel:all"] || missingVisuals === 0}
                onClick={() => onGenerateAllVisuals(slides)}
              >
                Generate missing visuals
              </button>
              <button className="btn" disabled={busy["carousel:render"]} onClick={() => onRender(slides)}>
                Render without new visuals
              </button>
            </div>
          </div>

          {selectedSlide && (
            <div>
              <p className="field-label">Current slide</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  className="btn"
                  onClick={() => move(selectedPosition, -1)}
                  disabled={selectedPosition === 0}
                >
                  Move earlier
                </button>
                <button
                  className="btn"
                  onClick={() => move(selectedPosition, 1)}
                  disabled={selectedPosition === slides.length - 1}
                >
                  Move later
                </button>
                <button
                  className="btn"
                  disabled={busy[`carousel:image:${selectedSlide.index}`]}
                  onClick={() => onGenerateVisual(selectedSlide.index, slides)}
                >
                  {busy[`carousel:image:${selectedSlide.index}`]
                    ? "Generating..."
                    : selectedSlide.background_path
                      ? "Regenerate this visual"
                      : "Generate this visual"}
                </button>
              </div>
              <details className="mt-3 rounded-macSm border border-separator p-2">
                <summary className="cursor-pointer footnote">Image direction</summary>
                <label className="field-label mt-2 block">Visual idea</label>
                <textarea
                  className="input mt-1 min-h-[62px] w-full"
                  value={selectedSlide.visual_cue}
                  onChange={(event) => patchSlide(selectedSlide.index, { visual_cue: event.target.value })}
                />
                <label className="field-label mt-2 block">Image generation prompt</label>
                <textarea
                  className="input mt-1 min-h-[110px] w-full text-[11px]"
                  value={selectedSlide.visual_prompt ?? ""}
                  onChange={(event) => patchSlide(selectedSlide.index, { visual_prompt: event.target.value })}
                />
              </details>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
