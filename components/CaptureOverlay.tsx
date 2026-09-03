"use client";

import { useEffect, useRef, useState } from "react";
import type { InboxRecord } from "@/lib/types";
import {
  buildCaptureIngredients,
  buildSmartCaptureNotes,
  buildSmartCaptureRaw,
  extractFirstUrl,
  guessSourceFromUrl,
  type ScrapeCaptureResult,
} from "@/lib/capture";

type Mode = "idle" | "scraping" | "ideating" | "saving" | "done";

// Global capture overlay. Triggered by the `c` key from anywhere outside an
// input. The user drops anything into one box; URLs are detected inside the
// full instruction text and enriched before saving.

export function CaptureOverlay({
  open,
  onClose,
  onSavedRecord,
  flash,
}: {
  open: boolean;
  onClose: () => void;
  onSavedRecord: () => Promise<void>;
  flash: (msg: string) => void;
}) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [hint, setHint] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Focus the textarea when opened. Clear state when closed so reopening
  // gives a fresh canvas.
  useEffect(() => {
    if (open) {
      setText("");
      setMode("idle");
      setHint(null);
      // Focus on next tick so the modal is mounted.
      setTimeout(() => taRef.current?.focus(), 30);
    }
  }, [open]);

  // Esc closes at any time.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const detectedUrl = extractFirstUrl(text);

  async function commit() {
    const fullText = text.trim();
    if (!fullText || mode !== "idle") return;
    setMode("scraping");
    setHint(
      detectedUrl
        ? "URL detected. Fetching transcript/source, research, and images..."
        : "Fetching research and images from this source text...",
    );
    try {
      const r = await fetch("/api/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullText, url: detectedUrl ?? undefined }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as ScrapeCaptureResult;
      const payload: Partial<InboxRecord> = {
        source: detectedUrl ? guessSourceFromUrl(detectedUrl) : "manual",
        raw: buildSmartCaptureRaw(fullText, data),
        url: detectedUrl,
        firewall_risk: data.firewall_risk,
        status: "triaged",
        notes: buildSmartCaptureNotes(data),
        ingredients: buildCaptureIngredients(data),
      };
      await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await onSavedRecord();
      flash(`Fetched: ${data.scraped.title.slice(0, 60)}`);
      setMode("done");
      setTimeout(onClose, 900);
    } catch (e) {
      setMode("idle");
      setHint(`Fetch failed: ${(e as Error).message.slice(0, 120)}`);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-sm flex items-start justify-center p-8 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card w-full max-w-2xl mt-24 p-6">
        <header className="flex items-center justify-between mb-4 pb-3 border-b border-rule">
          <div>
            <span className="label">fetch ingredients</span>
            <h2 className="chart-label mt-1">Drop a source</h2>
          </div>
          <span className="label">esc to cancel · ⌘↵ to fetch</span>
        </header>
        <textarea
          ref={taRef}
          className="input font-sans text-base min-h-[180px] leading-relaxed"
          placeholder="Paste a YouTube link, article, transcript, or instruction. Press ⌘↵ to fetch."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void commit();
            }
          }}
          disabled={mode !== "idle"}
        />
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <span className="label">
            {detectedUrl
              ? "URL detected. Fetch will save transcript/source text, research, images, and your instruction."
              : "No URL detected. This will be saved as raw source context."}
          </span>
          {hint && <span className="label text-warn">{hint}</span>}
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="btn" disabled={mode !== "idle"}>
              Cancel
            </button>
            <button
              onClick={() => void commit()}
              className="btn-primary"
              disabled={!text.trim() || mode !== "idle"}
            >
              {mode === "idle"
                ? detectedUrl
                  ? "Fetch"
                  : "Fetch"
                : mode === "done"
                ? "✓ Saved"
                : "Working..."}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
