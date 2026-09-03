# CLAUDE.md — Arutlee Studio

Localhost-only AI-native content workflow dashboard. See `README.md` for setup, env vars, and workflow.

## Design system

Always read `DESIGN.md` before making any UI, IA, or interaction decisions. Visual tokens (color, type, spacing) live in `../15-visual-ip-brief.md` — DESIGN.md references it; do not duplicate values.

Hard rules from DESIGN.md:

- **Two rooms, not per-stage tabs.** The app has two rooms: `Pieces` (default) and `Desk`. Capture is a global overlay (`c` key, available from anywhere). The piece's `status` drives what the UI shows; there are no modes to toggle.
- **PieceScroll is one scrollable case file.** Five anchored sections (`1 Sources` through `5 Pack and schedule`), expanded by default. Keys `1-5` collapse all but one; `Esc` expands all.
- **No em-dashes anywhere.** UI strings, fallback templates, prompts, comments. Per `feedback_no_em_dash.md`.
- **No light mode toggle.** Dark default, single user.
- **Format-aware editor.** When `piece.format` is `casefile_opd` or `casefile_ipd`, render OPD spine (CC/PI/PH/PE/IX/TX) or IPD spine (SOAP) as separate textareas. Body still saves as one markdown blob with H2 headers. `lib/formatSpine.ts` owns the mapping.
- **Studio chrome is Apple-native (macOS Tahoe / Liquid Glass).** SF Pro system font stack. systemBlue accent. macOS semantic tokens (label / labelSecondary / etc). Translucent toolbar + sidebar via backdrop-filter. Sentence case, no chart-form UPPERCASE.
- **Carousel slide preview + platform mockup keep medical-chart aesthetic.** `tracking-chart`, JetBrains Mono uppercase, ARUTLEE/SECTION labels are reserved for those mockup components only — they preview public posts which follow `15-visual-ip-brief.md`. Do not apply to studio chrome.
- **No Fraunces / IBM Plex / JetBrains Mono webfonts in chrome.** System fonts only. Mono for IDs and code via SF Mono / ui-monospace.

## Data layer

- Single source of truth = `../data/*.jsonl`. Same files Claude Code, OpenClaude, and the studio all read.
- All writes go through `lib/jsonl.ts` helpers (`readJsonl`, `appendJsonl`, `patchJsonl`).
- No DB, no migrations, no caching layer. The file system IS the state.

## AI engine

Three-engine detection chain (`lib/claude.ts:resolveEngine()`):

1. `ANTHROPIC_API_KEY` set → Anthropic SDK direct (paid).
2. `claude` binary on PATH → `claude -p` subprocess (Palm's Max subscription, $0).
3. Neither → deterministic fallbacks per route.

**Default = #2 for Palm's setup.** No API key is required. The CLI uses subscription OAuth from `~/.claude/`. Do NOT introduce the `@anthropic-ai/claude-agent-sdk` package — it requires an API key and would defeat the purpose.

When adding a new AI route:

- Import `callClaude` and `resolveEngine` from `@/lib/claude`. Never import the Anthropic SDK directly outside `lib/claude.ts`.
- Gate on `(await resolveEngine()).engine === "none"` — that's the only branch that should fall back to deterministic templates.
- Treat `callClaude` as engine-agnostic: it returns the model's text response regardless of which backend handled the request.
- Research-type calls (those that need web access) pass `allowedTools: ["WebFetch", "WebSearch"]` to `callClaude`; all other calls use the default (no tools).

The TopBar chip shows the active engine as `AI api`, `AI cli`, or `AI off`.

## Quality gates

- **Rule-based floor** runs first, always: `lib/slop.ts`, `lib/firewall.ts`, `lib/voice.ts`. Block-level rule failures cannot be overridden by AI.
- **AI ceiling** runs second, only when an engine is available: `lib/claude.ts` + prompts in `lib/prompts.ts`. AI can confirm or escalate, never pass a rule failure.
- **Live audit** runs the rule-based pass on title + hook + body text every 1.5s while editing the Draft section (F-013 fix). AI qualitative pass remains explicit (Audit button or Autopilot).

## Component structure

The two rooms and their components:

```
app/page.tsx              thin shell: room routing + global hotkeys
components/TopBar.tsx      single chrome bar (room switch, engine chip, capture hint)
components/CaptureOverlay  global c capture
components/PiecesRoom.tsx  three-pane container
  PieceRail.tsx            left list grouped by state (Inbox / Drafting / Ready / Scheduled / Live)
  PieceScroll.tsx          center; composes the five sections
    sections/SourcesSection.tsx
    sections/DraftSection.tsx      (format spine + state resync + inline AI)
    sections/SelectionPopover.tsx
    sections/ImageSection.tsx      (hero or opt-in carousel output)
      sections/CarouselEditor.tsx  (story, generated visual layers, render/export)
    sections/AuditSection.tsx      (inline reasons + fix-jumps)
    sections/ShipSection.tsx       (pack + schedule + on-demand platforms)
  VitalStrip.tsx           sticky status + Autopilot button + computed next action
  LivePreview.tsx          right pane; wraps PlatformMockup
components/DeskRoom.tsx    calendar + verify gate + metrics + weekly review
lib/formatSpine.ts         format -> section spine; split/join body markdown (tested)
lib/nextAction.ts          pure next-action computation (tested)
lib/useStudio.ts           data + actions hook (all fetching + ~12 actions)
app/api/ai/rewrite/        selection rewrite / translate / per-section regenerate
app/api/ai/carousel-background/   one text-free generated visual layer per slide
app/api/carousel/render/           deterministic branded 1080 x 1350 slide export
```

`useStudio.ts` is the single source of state for all components. Components do not fetch independently; they receive data and action callbacks as props.

## Dev rules

- **Next.js 14**, not 16. **React 18**, not 19. **Tailwind 3**, not 4. Pinned per `README.md` "Stack" section. Do not upgrade without a plan.
- **No external CSS framework** beyond Tailwind. No CSS-in-JS, no Stitches, no styled-components.
- **No client-side data fetching libraries** (SWR, React Query). Plain `fetch` + local state via `useStudio`. The data is small and the user is one person.
- **Server actions over API routes** only when there is no other way. Default to API routes for clarity.
- **State resync:** any component that mirrors piece data into local state must resync on `piece.id` / `piece.updated_at` change (F-016 fix, implemented in `DraftSection`).

## QA mode

When asked to QA the studio: flag any code that doesn't match `DESIGN.md`. Specifically:

- Per-stage modes or tabs reappearing (e.g. a 1-0 key scheme routing between stages as top-level screens) → red flag, point to "Two rooms" rule.
- A wall of AI buttons on the main surface (old "AI Draft / Hooks / Carousel / Platform / Firewall / Visual / Clips" cluster) → red flag; AI is woven into sections, not bolted on as a button row.
- Light mode toggle → red flag.
- Em-dashes in any UI string or fallback template → red flag.
- Inline visual tokens that should reference `15-visual-ip-brief.md` → red flag.
- References to deleted components (Masthead, NavSidebar, StatusBar, Workbench, InboxPanel, PipelinePanel, PlatformPanel, TopicsPanel, DraftPanel, CarouselPanel, AICockpit, FloatingAssistant, EngineRunPanel, PieceLeadPanel, IntakePanel, SchedulePanel, FirewallPanel) → red flag.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
