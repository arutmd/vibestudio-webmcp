"use client";

import type { useStudio } from "@/lib/useStudio";
import { PieceRail } from "./PieceRail";
import { PieceScroll } from "./PieceScroll";
import { LivePreview } from "./LivePreview";

type Studio = ReturnType<typeof useStudio>;

export function PiecesRoom(props: { studio: Studio }) {
  const { studio } = props;
  const piece = studio.selected;
  const sources = piece
    ? studio.inbox.filter((r) => piece.source_inbox_ids.includes(r.id))
    : [];
  const promotingId =
    Object.keys(studio.busy).find((k) => k.startsWith("promote:") && studio.busy[k])?.slice(8) ?? null;
  return (
    <div className="flex h-[calc(100vh-44px)]">
      <PieceRail
        inbox={studio.inbox}
        pieces={studio.pieces}
        selectedId={studio.selectedId}
        onSelectPiece={studio.setSelectedId}
        onTurnIntoPiece={(rec) => void studio.turnIntoPiece(rec)}
        promotingId={promotingId}
      />
      {piece ? (
        <>
          <PieceScroll studio={studio} piece={piece} sources={sources} />
          <LivePreview piece={piece} />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="footnote">
            No piece selected. Press c to capture an idea, then turn it into a piece.
          </p>
        </div>
      )}
    </div>
  );
}
