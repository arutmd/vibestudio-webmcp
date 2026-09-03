"use client";

// Inline SVG icons matching SF Symbols' visual language. Single-color stroke
// glyphs, 24x24 viewBox, 1.5px stroke, rounded line caps. Sized via the
// `size` prop (default 16px to match macOS toolbar/sidebar glyph size). Color
// inherits from `currentColor` so they pick up the surrounding text color.
//
// We hand-roll instead of pulling in lucide-react to avoid a runtime dep and
// to keep paths matched specifically to SF Symbols' pixel-aligned style.
//
// Icon set is deliberately small — only what the studio actually needs:
//
//   tray              Intake (inbox)
//   pencilSquare      Workbench (the case file editor)
//   calendar          Desk (scheduled / metrics / review)
//   plus              Capture
//   sparkles          Run all (AI chain)
//   paperplane        Ship
//   sidebarLeft       Toggle sidebar
//   magnifyingglass   Search
//   listBullet        Pieces list
//   chevronDown/Right Disclosure rows
//   keyboard          Shortcut hint
//   circleFill        Status dots
//   checkmarkCircle   Verdict OK
//   xmarkCircle       Verdict block
//   exclamationmark   Verdict warn
//   eye               Inspect detail
//   trash             Delete

export type IconName =
  | "tray"
  | "pencilSquare"
  | "calendar"
  | "plus"
  | "sparkles"
  | "paperplane"
  | "sidebarLeft"
  | "magnifyingglass"
  | "listBullet"
  | "chevronDown"
  | "chevronRight"
  | "keyboard"
  | "circleFill"
  | "checkmarkCircle"
  | "xmarkCircle"
  | "exclamationmark"
  | "eye"
  | "trash"
  | "command"
  | "ellipsis";

export function Icon({
  name,
  size = 16,
  className,
  strokeWidth = 1.5,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  switch (name) {
    case "tray":
      return (
        <svg {...props}>
          <path d="M3 14l3-9h12l3 9" />
          <path d="M3 14v5a1 1 0 001 1h16a1 1 0 001-1v-5" />
          <path d="M3 14h5l1 2h6l1-2h5" />
        </svg>
      );
    case "pencilSquare":
      return (
        <svg {...props}>
          <path d="M5 5h7" />
          <path d="M5 5v14a1 1 0 001 1h13a1 1 0 001-1v-7" />
          <path d="M19.5 4.5l-9 9-1 3 3-1 9-9-2-2z" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...props}>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 10h17" />
          <path d="M8 3.5v3" />
          <path d="M16 3.5v3" />
        </svg>
      );
    case "plus":
      return (
        <svg {...props}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...props}>
          <path d="M12 4l1.5 4.5L18 10l-4.5 1.5L12 16l-1.5-4.5L6 10l4.5-1.5L12 4z" />
          <path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9L19 14z" />
        </svg>
      );
    case "paperplane":
      return (
        <svg {...props}>
          <path d="M21 4L3 11l7 3 3 7 8-17z" />
          <path d="M10 14l11-10" />
        </svg>
      );
    case "sidebarLeft":
      return (
        <svg {...props}>
          <rect x="3" y="4.5" width="18" height="15" rx="2" />
          <path d="M9.5 4.5v15" />
        </svg>
      );
    case "magnifyingglass":
      return (
        <svg {...props}>
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="M15 15l5 5" />
        </svg>
      );
    case "listBullet":
      return (
        <svg {...props}>
          <circle cx="5" cy="6.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="5" cy="17.5" r="1" fill="currentColor" stroke="none" />
          <path d="M9 6.5h11" />
          <path d="M9 12h11" />
          <path d="M9 17.5h11" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg {...props}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      );
    case "chevronRight":
      return (
        <svg {...props}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case "keyboard":
      return (
        <svg {...props}>
          <rect x="2.5" y="6" width="19" height="12" rx="2" />
          <path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01" />
          <path d="M6 14h12" />
        </svg>
      );
    case "circleFill":
      return (
        <svg {...props} fill="currentColor" stroke="none">
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case "checkmarkCircle":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12.5l3 3 5-6" />
        </svg>
      );
    case "xmarkCircle":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9l6 6M15 9l-6 6" />
        </svg>
      );
    case "exclamationmark":
      return (
        <svg {...props}>
          <path d="M12 3l9 16H3l9-16z" />
          <path d="M12 10v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "eye":
      return (
        <svg {...props}>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "trash":
      return (
        <svg {...props}>
          <path d="M4 7h16" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M6.5 7l1 13h9l1-13" />
          <path d="M9 7V4.5h6V7" />
        </svg>
      );
    case "command":
      return (
        <svg {...props}>
          <path d="M9 6a2 2 0 100 4h6a2 2 0 100-4 2 2 0 00-2 2v8a2 2 0 002 2 2 2 0 100-4H9a2 2 0 100 4 2 2 0 002-2V8a2 2 0 00-2-2z" />
        </svg>
      );
    case "ellipsis":
      return (
        <svg {...props} fill="currentColor" stroke="none">
          <circle cx="6" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="18" cy="12" r="1.5" />
        </svg>
      );
  }
}
