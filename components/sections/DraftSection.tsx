"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PieceRecord } from "@/lib/types";
import { joinBody, splitBody, spineFor } from "@/lib/formatSpine";
import { useLiveAudit } from "@/lib/useLiveAudit";
import { SelectionPopover, type PopoverState } from "./SelectionPopover";

export function DraftSection(props: {
  piece: PieceRecord;
  onSave: (patch: Partial<PieceRecord>) => Promise<unknown>;
  rewrite: (text: string, instruction: string) => Promise<string | null>;
  onRegenerateDraft: () => void;
  drafting: boolean;
  onRevise: (feedback: string) => Promise<unknown>;
  revising: boolean;
}) {
  const { piece, onSave, rewrite, onRegenerateDraft, drafting, onRevise, revising } = props;
  const [feedback, setFeedback] = useState("");
  const spine = useMemo(() => spineFor(piece.format), [piece.format]);
  const [title, setTitle] = useState(piece.title);
  const [hook, setHook] = useState(piece.hook);
  const [parts, setParts] = useState(() => splitBody(piece.body ?? "", spine));
  const [busySection, setBusySection] = useState<string | null>(null);
  const [popover, setPopover] = useState<PopoverState>(null);
  const activeKey = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // What we last wrote to the server. Used to tell an external change apart from
  // the echo of our own save, so an in-flight save does not clobber newer keystrokes.
  const lastSaved = useRef({ title: piece.title, hook: piece.hook, body: piece.body ?? "" });
  const syncedId = useRef(piece.id);

  // F-016 fix: resync local state when the piece changes externally
  // (Autopilot writes, another tool's PATCH, selecting another piece). Skip the
  // echo of our own autosave so newer local keystrokes are never reverted.
  useEffect(() => {
    const incoming = { title: piece.title, hook: piece.hook, body: piece.body ?? "" };
    const switchedPiece = piece.id !== syncedId.current;
    const isOwnEcho =
      incoming.title === lastSaved.current.title &&
      incoming.hook === lastSaved.current.hook &&
      incoming.body === lastSaved.current.body;
    if (switchedPiece || !isOwnEcho) {
      setTitle(incoming.title);
      setHook(incoming.hook);
      setParts(splitBody(incoming.body, spineFor(piece.format)));
      lastSaved.current = incoming;
      syncedId.current = piece.id;
    }
  }, [piece.id, piece.updated_at, piece.format, piece.title, piece.hook, piece.body]);

  const fullText = `${title}\n${hook}\n${joinBody(parts, spine)}`;
  const audit = useLiveAudit(fullText);

  const queueSave = (nextTitle: string, nextHook: string, nextParts: Record<string, string>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const body = joinBody(nextParts, spine);
      // Record what we are sending so the resync effect recognizes the echo.
      lastSaved.current = { title: nextTitle, hook: nextHook, body };
      void onSave({ title: nextTitle, hook: nextHook, body });
    }, 1500);
  };

  const setPart = (key: string, value: string) => {
    const next = { ...parts, [key]: value };
    setParts(next);
    queueSave(title, hook, next);
  };

  const sparkle = async (key: string) => {
    const current = parts[key];
    if (!current.trim()) return;
    setBusySection(key);
    try {
      const out = await rewrite(current, "regenerate");
      if (out) setPart(key, out);
    } finally { setBusySection(null); }
  };

  const translate = async (key: string) => {
    const current = parts[key];
    if (!current.trim()) return;
    const hasThai = /[฀-๿]/.test(current);
    setBusySection(key);
    try {
      const out = await rewrite(current, hasThai ? "translate_en" : "translate_th");
      if (out) setPart(key, out);
    } finally { setBusySection(null); }
  };

  const onSelect = (key: string, el: HTMLTextAreaElement) => {
    const sel = el.value.slice(el.selectionStart, el.selectionEnd);
    if (sel.trim().length < 8) { setPopover(null); return; }
    activeKey.current = key;
    const rect = el.getBoundingClientRect();
    setPopover({ x: rect.left + 16, y: rect.top - 40, text: sel });
  };

  const applyRewrite = async (instruction: string) => {
    const key = activeKey.current;
    if (!key || !popover) return;
    const out = await rewrite(popover.text, instruction);
    if (out) setPart(key, parts[key].replace(popover.text, out));
  };

  const pill = (v: string) =>
    v === "pass" ? "pill-ok" : v === "fail" ? "pill-block" : v === "near_miss" ? "pill-warn" : "pill-mute";

  return (
    <section id="section-2" className="card p-4">
      <div className="flex items-center justify-between">
        <h3 className="title-2">2. Draft, {piece.lead_platform}</h3>
        <div className="flex items-center gap-2">
          {audit.ran && (
            <>
              <span className={`pill ${pill(audit.slop.verdict)}`} title={audit.slop.reasons.join("; ")}>slop</span>
              <span className={`pill ${pill(audit.firewall.verdict)}`} title={audit.firewall.reasons.join("; ")}>firewall</span>
              <span className={`pill ${pill(audit.voice.verdict)}`} title={audit.voice.reasons.join("; ")}>voice</span>
            </>
          )}
          <button className="btn" onClick={onRegenerateDraft} disabled={drafting}>
            {drafting ? "Drafting..." : "Redraft all"}
          </button>
        </div>
      </div>
      <input
        className="input mt-3 w-full"
        value={title}
        placeholder="Title"
        onChange={(e) => { setTitle(e.target.value); queueSave(e.target.value, hook, parts); }}
      />
      <input
        className="input mt-2 w-full"
        value={hook}
        placeholder="Hook"
        onChange={(e) => { setHook(e.target.value); queueSave(title, e.target.value, parts); }}
      />
      {spine.map((s) => (
        <div key={s.key} className="mt-3">
          <div className="flex items-center justify-between">
            <span className="field-label">{s.label}</span>
            <span className="flex gap-1">
              <button className="btn" disabled={busySection === s.key} title="Rewrite this section" onClick={() => sparkle(s.key)}>
                {busySection === s.key ? "..." : "Rewrite"}
              </button>
              <button className="btn" disabled={busySection === s.key} title="Translate EN/TH" onClick={() => translate(s.key)}>
                EN/TH
              </button>
            </span>
          </div>
          <textarea
            className="input w-full min-h-[80px]"
            value={parts[s.key]}
            placeholder={s.placeholder}
            onChange={(e) => setPart(s.key, e.target.value)}
            onSelect={(e) => onSelect(s.key, e.currentTarget)}
            onBlur={() => setTimeout(() => setPopover(null), 200)}
          />
        </div>
      ))}
      <div className="mt-4">
        <span className="field-label">Adjust with feedback</span>
        <div className="mt-1 flex gap-2">
          <input
            className="input flex-1"
            value={feedback}
            placeholder={'Tell it what to change, e.g. "ยังสั้นไป" or "เอาประโยคที่ขึ้นต้นด้วย ผมว่า ออก"'}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && feedback.trim() && !revising) {
                void onRevise(feedback.trim()).then(() => setFeedback(""));
              }
            }}
            disabled={revising}
          />
          <button
            className="btn"
            disabled={revising || !feedback.trim()}
            onClick={() => void onRevise(feedback.trim()).then(() => setFeedback(""))}
          >
            {revising ? "Revising..." : "Revise"}
          </button>
        </div>
      </div>
      <SelectionPopover state={popover} onApply={applyRewrite} onClose={() => setPopover(null)} />
    </section>
  );
}
