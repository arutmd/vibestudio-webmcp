"use client";

import { useEffect, useState } from "react";
import type { PieceRecord } from "@/lib/types";
import { carouselAssetPaths } from "@/lib/visualOutput";
import { PlatformMockup } from "./PlatformMockup";

export function LivePreview(props: { piece: PieceRecord }) {
  const { piece } = props;
  const assets = piece.visual_output === "carousel" ? carouselAssetPaths(piece) : [];
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [piece.id, piece.updated_at]);
  const activeIndex = Math.min(index, Math.max(0, assets.length - 1));
  return (
    <aside className="w-[340px] shrink-0 overflow-y-auto p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="label">Preview · {piece.lead_platform}</div>
        {assets.length > 1 && (
          <div className="flex items-center gap-1">
            <button className="btn-ghost" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={activeIndex === 0}>‹</button>
            <span className="footnote">{activeIndex + 1}/{assets.length}</span>
            <button className="btn-ghost" onClick={() => setIndex((value) => Math.min(assets.length - 1, value + 1))} disabled={activeIndex === assets.length - 1}>›</button>
          </div>
        )}
      </div>
      <PlatformMockup
        platform={piece.lead_platform}
        piece={piece}
        previewImagePath={assets.length ? assets[activeIndex] : undefined}
        carouselPosition={assets.length ? { index: activeIndex + 1, total: assets.length } : null}
      />
    </aside>
  );
}
