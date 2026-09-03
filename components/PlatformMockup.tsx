"use client";

import type { PieceRecord, PlatformId } from "@/lib/types";
import { activeVisualPath } from "@/lib/visualOutput";

// Authentic-feeling platform card mockups so Palm sees what the post will
// look like before publish. These are intentionally low-fidelity (not pixel-
// perfect screenshots) but good enough to spot bad line breaks, missing hero,
// or cropped first lines.

function fileUrl(p: string): string {
  return `/api/file?path=${encodeURIComponent(p)}`;
}

const PROFILE = {
  name: "Arut Leelataweewud, MD",
  handle: "arutlee",
  meta: "Doctor + AI builder · Bangkok",
};

export function PlatformMockup({
  platform,
  piece,
  previewImagePath,
  carouselPosition,
}: {
  platform: PlatformId;
  piece: PieceRecord;
  previewImagePath?: string | null;
  carouselPosition?: { index: number; total: number } | null;
}) {
  const text =
    piece.platform_variants?.[platform] ?? piece.body ?? piece.hook ?? piece.title;
  const visualPath = previewImagePath === undefined ? activeVisualPath(piece) : previewImagePath;
  const hero = visualPath ? fileUrl(visualPath) : null;

  if (platform === "linkedin") return <LinkedInCard text={text} hero={hero} />;
  if (platform === "facebook") return <FacebookCard text={text} hero={hero} />;
  if (platform === "instagram") {
    return <InstagramCard text={text} hero={hero} piece={piece} carouselPosition={carouselPosition} />;
  }
  if (platform === "threads") return <ThreadsCard text={text} hero={hero} />;
  if (platform === "tiktok") return <TikTokCard text={text} hero={hero} />;
  return <GenericCard text={text} hero={hero} platform={platform} />;
}

function Avatar({ size = 36 }: { size?: number }) {
  return (
    <div
      className="rounded-full bg-amber/30 border border-amber/60 grid place-items-center font-serif text-amber"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      A
    </div>
  );
}

function LinkedInCard({ text, hero }: { text: string; hero: string | null }) {
  return (
    <div className="bg-[#1d2226] text-[#e9e9e9] border border-white/10 rounded-md w-full max-w-[560px] mx-auto overflow-hidden font-sans">
      <header className="p-3 flex items-center gap-3">
        <Avatar size={48} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight">{PROFILE.name}</div>
          <div className="text-[11px] text-white/60 leading-tight">{PROFILE.meta}</div>
          <div className="text-[10px] text-white/40">2h · 🌐</div>
        </div>
        <button className="text-[#70b5f9] text-xs font-semibold border border-[#70b5f9]/60 px-3 py-1 rounded-full">
          + Follow
        </button>
      </header>
      <div className="px-3 pb-3 text-[14px] leading-[1.5] whitespace-pre-wrap">
        {text || <span className="italic text-white/40">[empty]</span>}
      </div>
      {hero && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={hero} alt="hero" className="w-full max-h-[360px] object-cover" />
      )}
      <footer className="border-t border-white/10 px-3 py-2 flex items-center text-[12px] text-white/60 gap-5">
        <span>👍 Like</span>
        <span>💬 Comment</span>
        <span>🔁 Repost</span>
        <span>✉ Send</span>
      </footer>
    </div>
  );
}

function FacebookCard({ text, hero }: { text: string; hero: string | null }) {
  return (
    <div className="bg-[#242526] text-[#e4e6eb] border border-white/10 rounded-lg w-full max-w-[560px] mx-auto overflow-hidden font-sans">
      <header className="p-3 flex items-center gap-3">
        <Avatar size={40} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight">{PROFILE.name}</div>
          <div className="text-[11px] text-white/60 leading-tight">2h · 🌐</div>
        </div>
      </header>
      <div className="px-3 pb-3 text-[15px] leading-[1.5] whitespace-pre-wrap">
        {text || <span className="italic text-white/40">[empty]</span>}
      </div>
      {hero && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={hero} alt="hero" className="w-full max-h-[400px] object-cover" />
      )}
      <footer className="border-t border-white/10 px-3 py-1.5 flex items-center text-[12px] text-white/70 gap-6 justify-around">
        <span>👍 Like</span>
        <span>💬 Comment</span>
        <span>↗ Share</span>
      </footer>
    </div>
  );
}

function InstagramCard({
  text,
  hero,
  piece,
  carouselPosition,
}: {
  text: string;
  hero: string | null;
  piece: PieceRecord;
  carouselPosition?: { index: number; total: number } | null;
}) {
  return (
    <div className="bg-black text-white border border-white/10 rounded-md w-full max-w-[420px] mx-auto overflow-hidden font-sans">
      <header className="p-3 flex items-center gap-3 border-b border-white/10">
        <Avatar size={32} />
        <div className="text-sm font-semibold flex-1">{PROFILE.handle}</div>
        <span className="text-white/50 text-lg">⋯</span>
      </header>
      <div className="aspect-[4/5] bg-paper text-ink relative flex flex-col p-5">
        {hero ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
            {carouselPosition && (
              <span className="absolute right-3 top-3 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold text-white">
                {carouselPosition.index} / {carouselPosition.total}
              </span>
            )}
          </>
        ) : (
          <>
            <div className="font-mono text-[9px] uppercase tracking-chart text-ink/50">
              ARUTLEE / {piece.format.toUpperCase()} / 27 APR
            </div>
            <div className="h-px bg-ink/20 my-2" />
            <h3 className="serif text-2xl text-ink leading-tight flex-1">
              {piece.title || piece.hook || "(cover)"}
            </h3>
            <div className="font-mono text-[8px] uppercase tracking-chart text-ink/50">
              SWIPE → 1 / {(piece.carousel?.length ?? 1)}
            </div>
          </>
        )}
      </div>
      <footer className="px-3 pt-3 pb-3 text-sm space-y-2">
        <div className="flex gap-4 text-xl">♡ 💬 ↗</div>
        <div>
          <span className="font-semibold">{PROFILE.handle}</span>{" "}
          <span className="whitespace-pre-wrap">
            {text.slice(0, 220)}
            {text.length > 220 ? "..." : ""}
          </span>
        </div>
      </footer>
    </div>
  );
}

function ThreadsCard({ text, hero }: { text: string; hero: string | null }) {
  return (
    <div className="bg-black text-white border border-white/10 rounded-2xl w-full max-w-[520px] mx-auto p-3 font-sans">
      <header className="flex items-start gap-3">
        <Avatar size={36} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight">{PROFILE.handle}</div>
          <div className="text-[14px] mt-1 whitespace-pre-wrap leading-[1.4]">
            {text || <span className="italic text-white/40">[empty]</span>}
          </div>
          {hero && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt="hero" className="mt-3 rounded-md max-h-[300px] object-cover" />
          )}
          <div className="mt-2 flex gap-5 text-white/60 text-sm">♡ 💬 ↗ ✉</div>
        </div>
      </header>
    </div>
  );
}

function TikTokCard({ text, hero }: { text: string; hero: string | null }) {
  return (
    <div className="bg-black text-white border border-white/10 rounded-md w-full max-w-[300px] mx-auto overflow-hidden relative font-sans">
      <div className="aspect-[9/16] relative">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-amber/30 to-black grid place-items-center">
            <div className="font-mono text-xs text-amber">[hero pending]</div>
          </div>
        )}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-4 items-center text-white text-xs">
          <span>♡ 12k</span>
          <span>💬 240</span>
          <span>↗ 410</span>
        </div>
        <div className="absolute left-3 right-14 bottom-3">
          <div className="font-semibold text-sm">@{PROFILE.handle}</div>
          <p className="text-xs leading-snug mt-1 line-clamp-3 whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    </div>
  );
}

function GenericCard({
  text,
  hero,
  platform,
}: {
  text: string;
  hero: string | null;
  platform: string;
}) {
  return (
    <div className="card p-4">
      <span className="label">{platform}</span>
      <p className="mt-2 text-sm whitespace-pre-wrap text-paper-dim">{text}</p>
      {hero && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={hero} alt="hero" className="mt-2 w-full max-h-[200px] object-cover" />
      )}
    </div>
  );
}
