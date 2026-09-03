"use client";

export type Room = "pieces" | "desk";

type EngineInfo = { engine?: string; model?: string | null };

export function TopBar(props: {
  room: Room;
  onRoom: (r: Room) => void;
  engine: EngineInfo | null;
}) {
  const { room, onRoom, engine } = props;
  const chip =
    engine?.engine === "api" ? "AI api" : engine?.engine === "cli" ? "AI cli" : "AI off";
  return (
    <header className="toolbar-surface sticky top-0 z-30 flex items-center gap-3 px-4 h-11">
      <span className="chart-label">VibeStudio</span>
      <nav className="segmented">
        <button
          className="segmented-item"
          data-active={room === "pieces"}
          onClick={() => onRoom("pieces")}
        >
          Pieces
        </button>
        <button
          className="segmented-item"
          data-active={room === "desk"}
          onClick={() => onRoom("desk")}
        >
          Desk
        </button>
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <span className="pill pill-mute">{chip}</span>
        <span className="footnote">
          press <span className="kbd">c</span> to capture
        </span>
      </div>
    </header>
  );
}
