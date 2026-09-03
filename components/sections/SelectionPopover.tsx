"use client";

import { useState } from "react";

export type PopoverState = { x: number; y: number; text: string } | null;

export function SelectionPopover(props: {
  state: PopoverState;
  onApply: (instruction: string) => Promise<void>;
  onClose: () => void;
}) {
  const { state, onApply, onClose } = props;
  const [busyKey, setBusyKey] = useState<string | null>(null);
  if (!state) return null;
  const actions: { key: string; label: string }[] = [
    { key: "punchier", label: "Punchier" },
    { key: "shorter", label: "Shorter" },
    { key: "fix", label: "Fix" },
  ];
  return (
    <div
      className="liquid-glass fixed z-50 flex gap-1 rounded-macMd p-1"
      style={{ left: state.x, top: state.y }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {actions.map((a) => (
        <button
          key={a.key}
          className="btn"
          disabled={busyKey !== null}
          onClick={async () => {
            setBusyKey(a.key);
            try { await onApply(a.key); }
            finally { setBusyKey(null); onClose(); }
          }}
        >
          {busyKey === a.key ? "..." : a.label}
        </button>
      ))}
      <button className="btn" onClick={onClose}>x</button>
    </div>
  );
}
