import type { Config } from "tailwindcss";

// macOS-native dark palette + SF system font stack.
// Token names mirror Apple's AppKit Dynamic System Colors so meaning travels:
// `label`, `secondaryLabel`, `fill`, `separator`, `windowBg`, `controlBg`.
//
// Concrete dark-mode hex values approximate the AppKit tokens (Apple computes
// them at render time; we hard-code reasonable equivalents for the web).
//
// LEGACY ALIASES kept temporarily so old class names (ink/paper/amber/etc.)
// still resolve while components migrate. New code should use the macOS
// token names. The aliases are scheduled for removal once all components
// reference the new tokens directly.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ---- macOS semantic tokens (preferred) ----
        // Surfaces (window backgrounds, content backgrounds)
        windowBg: "#1e1e1e",
        contentBg: "#252525",
        sidebarBg: "rgba(40, 40, 42, 0.72)", // translucent for backdrop-filter
        controlBg: "#2c2c2e",
        elevated: "#2f2f31",

        // Text labels, with Apple's documented opacity tiers on dark
        label: "rgba(255, 255, 255, 0.92)",
        labelSecondary: "rgba(255, 255, 255, 0.55)",
        labelTertiary: "rgba(255, 255, 255, 0.30)",
        labelQuaternary: "rgba(255, 255, 255, 0.16)",

        // Fills (subtle backgrounds for non-text surfaces)
        fill: "rgba(255, 255, 255, 0.08)",
        fillSecondary: "rgba(255, 255, 255, 0.05)",
        fillTertiary: "rgba(255, 255, 255, 0.03)",

        // Separators (subtle dividers)
        separator: "rgba(255, 255, 255, 0.13)",
        separatorOpaque: "#3a3a3c",

        // Accent (systemBlue dark-mode); user can override at runtime
        accent: "#0a84ff",
        accentMuted: "rgba(10, 132, 255, 0.18)",

        // System semantic colors for status pills
        systemRed: "#ff453a",
        systemOrange: "#ff9f0a",
        systemYellow: "#ffd60a",
        systemGreen: "#30d158",
        systemBlue: "#0a84ff",
        systemIndigo: "#5e5ce6",
        systemTeal: "#64d2ff",

        // Selection
        selection: "rgba(10, 132, 255, 0.30)",

        // ---- Legacy aliases (will be removed after component migration) ----
        // Mapped to the closest macOS-token equivalent so the old class
        // names render correctly in the new theme without rewriting every
        // component on day one.
        ink: "#1e1e1e",
        "ink-2": "#252525",
        "ink-3": "#2c2c2e",
        paper: "rgba(255, 255, 255, 0.92)",
        "paper-dim": "rgba(255, 255, 255, 0.78)",
        "paper-mute": "rgba(255, 255, 255, 0.45)",
        rule: "rgba(255, 255, 255, 0.13)",
        "rule-soft": "rgba(255, 255, 255, 0.08)",
        amber: "#0a84ff", // remap amber -> systemBlue accent
        burnt: "#ff453a",
        sage: "#30d158",
        plum: "#5e5ce6",
        cream: "#ffd60a",
        ok: "#30d158",
        warn: "#ff9f0a",
        block: "#ff453a",
      },
      fontFamily: {
        // SF Pro is the macOS / iOS system font; -apple-system resolves to
        // the right variant per platform. SF Pro Text < 20pt, SF Pro Display
        // >= 20pt is handled automatically by the variable font opsz axis.
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Helvetica Neue"',
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        // SF Mono → ui-monospace falls back to system mono on each OS.
        mono: [
          "ui-monospace",
          '"SF Mono"',
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          "monospace",
        ],
        // New York is Apple's serif companion to SF. Used very sparingly
        // (rarely in macOS apps; saved for editorial flourishes if needed).
        serif: [
          '"New York"',
          "ui-serif",
          "Charter",
          "Georgia",
          "Cambria",
          '"Times New Roman"',
          "serif",
        ],
      },
      letterSpacing: {
        // SF tracking values approximated. Apple recommends slight negative
        // tracking on large display sizes and zero/positive on small text.
        tightDisplay: "-0.022em",
        tightTitle: "-0.012em",
        normalSF: "0em",
        wideCaption: "0.02em",
        // Legacy alias used by the medical-chart `.label` class. Keep until
        // those classes are migrated.
        chart: "0.06em",
      },
      borderRadius: {
        // macOS standard radii. Buttons 6, cards 10, sheets 12-14, sidebar
        // selection rows 6.
        macSm: "5px",
        macMd: "8px",
        macLg: "12px",
        macXl: "16px",
      },
      boxShadow: {
        // Apple uses very subtle shadows in dark mode — depth comes from
        // material translucency, not heavy drop shadows.
        macWindow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 0.5px 0 rgba(0,0,0,0.6)",
        macCard: "0 1px 2px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(255,255,255,0.06) inset",
        macSheet: "0 16px 48px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.08) inset",
      },
      backdropBlur: {
        // Liquid Glass approximations. Lower blur = thinner material.
        macThin: "10px",
        macRegular: "20px",
        macThick: "40px",
      },
    },
  },
  plugins: [],
};

export default config;
