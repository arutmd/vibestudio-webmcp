"use client";

import type { InboxRecord, PieceRecord } from "@/lib/types";
import type { useStudio } from "@/lib/useStudio";
import { useLiveAudit } from "@/lib/useLiveAudit";
import { VitalStrip } from "./VitalStrip";
import { SourcesSection } from "./sections/SourcesSection";
import { DraftSection } from "./sections/DraftSection";
import { ImageSection } from "./sections/ImageSection";
import { AuditSection } from "./sections/AuditSection";
import { ShipSection } from "./sections/ShipSection";

type Studio = ReturnType<typeof useStudio>;

export function PieceScroll(props: { studio: Studio; piece: PieceRecord; sources: InboxRecord[] }) {
  const { studio, piece, sources } = props;
  const audit = useLiveAudit(`${piece.title}\n${piece.hook}\n${piece.body ?? ""}`);
  const jump = (n: 1 | 2 | 3 | 4 | 5) => {
    document.getElementById(`section-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-16">
      <div className="liquid-glass sticky top-0 z-20 mb-4 rounded-macLg p-3">
        <VitalStrip
          piece={piece}
          audit={audit}
          onJumpSection={jump}
          onAutopilot={() => void studio.runAutopilot(piece.id)}
          autopilot={studio.autopilot}
        />
      </div>
      <div className="flex flex-col gap-4 max-w-3xl">
        <SourcesSection piece={piece} sources={sources} />
        <DraftSection
          piece={piece}
          onSave={(patch) => studio.savePiece(piece.id, patch)}
          rewrite={(t, i) => studio.rewrite(t, i)}
          onRegenerateDraft={() => void studio.runDraft(piece)}
          drafting={Boolean(studio.busy.draft)}
          onRevise={(feedback) => studio.revisePiece(piece, feedback)}
          revising={Boolean(studio.busy.revise)}
        />
        <ImageSection
          piece={piece}
          onSave={(patch) => studio.savePiece(piece.id, patch)}
          onBuildCarousel={(slides) => void studio.buildCarousel(piece, slides)}
          onSaveCarousel={(slides) => studio.saveCarousel(piece.id, slides)}
          onGenerateCarouselVisual={(slideIndex, slides) =>
            void studio.generateCarouselVisual(piece, slideIndex, slides)
          }
          onGenerateAllCarouselVisuals={(slides) =>
            void studio.generateAllCarouselVisuals(piece, slides)
          }
          onRenderCarousel={(slides) => void studio.renderCarousel(piece, slides)}
          onFinishCarousel={(slides) => void studio.finishCarousel(piece, slides)}
          busy={studio.busy}
          carouselState={studio.carouselState}
        />
        <AuditSection
          piece={piece}
          onAudit={() => void studio.runAudit(piece)}
          auditing={Boolean(studio.busy.audit)}
          onJumpToDraft={() => jump(2)}
        />
        <ShipSection
          piece={piece}
          onGeneratePlatform={(pl) => void studio.generatePlatform(piece, pl)}
          onCopyPack={() => void studio.copyPack(piece)}
          onSchedule={(when) => void studio.schedule(piece, when)}
          busy={studio.busy}
        />
      </div>
    </div>
  );
}
