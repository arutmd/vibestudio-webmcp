"use client";

import type { CarouselSlide, PieceRecord } from "@/lib/types";
import type { CarouselState } from "@/lib/useStudio";
import { CarouselEditor } from "./CarouselEditor";

export function ImageSection(props: {
  piece: PieceRecord;
  onSave: (patch: Partial<PieceRecord>) => Promise<unknown>;
  onBuildCarousel: (slides: number) => void;
  onSaveCarousel: (slides: CarouselSlide[]) => Promise<unknown>;
  onGenerateCarouselVisual: (slideIndex: number, slides: CarouselSlide[]) => void;
  onGenerateAllCarouselVisuals: (slides: CarouselSlide[]) => void;
  onRenderCarousel: (slides: CarouselSlide[]) => void;
  onFinishCarousel: (slides: CarouselSlide[]) => void;
  busy: Record<string, boolean>;
  carouselState: CarouselState;
}) {
  const {
    piece,
    onSave,
    onBuildCarousel,
    onSaveCarousel,
    onGenerateCarouselVisual,
    onGenerateAllCarouselVisuals,
    onRenderCarousel,
    onFinishCarousel,
    busy,
    carouselState,
  } = props;
  const mode = piece.visual_output ?? "hero";
  const img = piece.engine_asset_path ?? piece.hero_image_path ?? null;

  return (
    <section id="section-3" className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="title-2">3. Visuals</h3>
          <p className="footnote mt-1">Choose the visual output for this piece.</p>
        </div>
        <div className="segmented flex p-0.5">
          {(["hero", "carousel"] as const).map((item) => (
            <button
              key={item}
              className={`rounded-macSm px-3 py-1 text-[12px] font-medium ${
                mode === item ? "bg-accent text-white" : "text-labelSecondary"
              }`}
              onClick={() => void onSave({ visual_output: item })}
            >
              {item === "hero" ? "Hero image" : "Carousel"}
            </button>
          ))}
        </div>
      </div>

      {mode === "hero" ? (
        <div className="mt-3">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/file?path=${encodeURIComponent(img)}`}
              alt="hero"
              className="max-h-96 rounded-macMd"
            />
          ) : (
            <p className="footnote">No image yet. Press Autopilot to render the hero in your brand style.</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            {piece.engine_image_provider && (
              <span className="pill pill-mute">image: {piece.engine_image_provider}</span>
            )}
            {piece.engine_provider && (
              <span className="pill pill-mute">text: {piece.engine_provider}</span>
            )}
            {piece.engine_error && <span className="pill pill-block">{piece.engine_error}</span>}
          </div>
        </div>
      ) : (
        <CarouselEditor
          piece={piece}
          onBuild={onBuildCarousel}
          onSave={onSaveCarousel}
          onGenerateVisual={onGenerateCarouselVisual}
          onGenerateAllVisuals={onGenerateAllCarouselVisuals}
          onRender={onRenderCarousel}
          onFinish={onFinishCarousel}
          busy={busy}
          state={carouselState}
        />
      )}
    </section>
  );
}
