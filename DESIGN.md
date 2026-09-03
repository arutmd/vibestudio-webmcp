# Design System — Arutlee Studio

## Memorable thing

> "The most efficient, automated, high-quality content studio I've used."

Speed + automation + quality gates. Every IA, layout, and interaction decision serves that line. Not "feels like a doctor's chart" — that was a metaphor I retired. The medical-chart aesthetic is the *visual treatment* (per `../15-visual-ip-brief.md`), not the IA paradigm.

## Product context

- **What this is:** localhost-only AI-native content workflow dashboard for the Arutlee channel (one operator, one channel, JSONL data layer at `../data/`).
- **Who it's for:** Palm. Solo. Power user. Keyboard-first.
- **Project type:** internal tool (single-page dashboard).
- **Source of truth for visual IP:** `../15-visual-ip-brief.md` (this file references it; do not duplicate token values).

## Information architecture

### Three modes (was: ten tabs)

```
INTAKE        WORKBENCH                          DESK
─────────     ───────────────────────────        ───────────────
capture +     piece list ┃ case file ┃ context   calendar +
topic seeds                                       metrics +
                                                  weekly review
```

- **Intake** — merges Inbox + Topics. Capture form on top, queue of unpromoted items below (split: recent captures / topic seeds). Each item has one action: "Promote to piece."
- **Workbench** — where 80% of the work happens. Replaces the per-stage tabs (Draft / Platform / Carousel / Firewall / Schedule). Single piece, single scroll, five anchored sections.
- **Desk** — rear-view mirror. Calendar of scheduled posts, metrics for published pieces, Sunday review.

### Workbench layout

```
┌─────────────────────────────────────────────────────────────────┐
│ MASTHEAD (slim)   integrations chips                            │
├─────────────┬───────────────────────────────────┬───────────────┤
│ PIECES (l)  │ CASE FILE (center)                │ CONTEXT (r)   │
│ 220px       │ flex                              │ 300px         │
│             │                                    │ collapsible   │
│ filters:    │ [STICKY] vital strip + next-action│               │
│ idea/draft/ │ [STICKY] Run All (⌘R)             │               │
│ ready/live  │                                    │               │
│             │ 01 ─ HOOK & BODY                  │ section-aware:│
│ piece list  │ 02 ─ PLATFORM VARIANTS            │ §01 voice     │
│ ◉ status    │ 03 ─ CAROUSEL                     │     cheat     │
│ ◉ pills     │ 04 ─ FIREWALL AUDIT               │ §02 platform  │
│             │ 05 ─ SCHEDULE & SHIP              │     spine     │
│ + capture   │                                    │ §03 slide     │
│             │                                    │     thumbs    │
│             │                                    │ §04 reasons   │
└─────────────┴───────────────────────────────────┴───────────────┘
```

### Section anchors

`01 ─ HOOK & BODY` reads as a chart label, links as `#section-01`. Numbers are part of the brand voice (chart-form), not navigation chrome. Press `1-5` to collapse all other sections (per Q2.B); default state is everything expanded for continuity.

## Interaction model — the five automations

These are what make the studio feel "automated," not just "fast."

### 1. Global capture (`c`)

Press `c` from anywhere except inside an input. Overlay opens with a textarea.

- Paste a URL → auto-detect, fire `/api/scrape`, auto-ideate, persist to inbox. User sees results inline.
- Type a note → debounce 2s, fire `/api/ai/ideate` automatically. Promote-to-piece appears under the textarea.
- `enter` saves; `esc` cancels.

Capture is global so the user never has to navigate to Intake to drop a thought.

### 2. Resume-here

On `/api/status` load, return `last_edited_piece_id`. Workbench auto-selects it. Vital strip renders:

```
FN-20260427-001  field_note  ●fw ●slop ●voice
Resume · last edited 14:23 · 23 min ago    [Next: Pack platforms →]
```

The "Next" pill is computed from piece state:

| State | Next pill |
|---|---|
| `body` empty | "Draft" → focus §01, fire AI draft |
| `body` full, no `platform_variants` | "Pack platforms" → §02, fire pack |
| variants present, no carousel | "Build carousel" → §03 |
| carousel done, no firewall verdict | "Audit" → §04, fire firewall |
| firewall pass, no schedule | "Ship" → §05 |

One pill, one click. It's the primary CTA at the top of the case file.

### 3. Run All (`⌘R`)

Single button in the sticky strip, also `cmd+R` keystroke. Sequence:

```
AI draft → AI variants (auto-detect lead platform) → AI carousel (8 slides default)
→ AI firewall audit → stop
```

Stops on first hard failure (e.g., firewall block). Each step shows a per-step spinner; user can cancel mid-chain. By chain end, the piece is one click away from ship.

**Implementation:** runs client-side as a sequential async chain calling the existing `/api/ai/draft`, `/api/ai/platform-pack`, `/api/ai/carousel`, `/api/ai/firewall` endpoints. No new server route required — sequential calls on localhost are fast enough that SSE adds complexity without UX gain. State (current step, error) lives in `app/page.tsx`.

### 4. Live quality pills

Slop / Firewall / Voice rule-based checks run as the user types in §01 (debounce 1.5s). Pills in the vital strip update live. AI qualitative passes still run on explicit `Audit` button — they're slower and more expensive.

Hover a red pill → tooltip lists the rule(s) that fired and a fix hint:

- Slop: "Em-dash detected at char 1247." → click to jump.
- Voice: "No concrete number + caveat. Add a `n=` or date anchor."
- Firewall: "Hard keyword 'Cariva' at line 8." → click to jump.

This kills the end-of-flow audit wall. By the time §01 is done, the user already knows if there are issues.

### 5. Format-aware editor

`DraftPanel` reads `piece.format` and renders the section spine inline. Body is still saved as one markdown blob with H2 headers; the UI just renders sections as separate textareas under each header.

| Format | Spine |
|---|---|
| `field_note` | Hook / Body / Caveat |
| `casefile_opd` | CC / PI / PH / PE / IX / TX |
| `casefile_ipd` | S / O / A / P |
| `filter` | Setup / Filter / Decision |
| `anchor` | Hook / Body / Receipts |
| `threads_card` | Single typography quote |

The OPD and IPD spines are doctor's-card templates (a gimmick of post format, not a metaphor for the studio). The format stays a property of the piece; the editor adapts.

## Keymap

```
GLOBAL
  i / w / d           switch mode (Intake / Workbench / Desk)
  c                   global capture overlay
  ?                   shortcut overlay

WORKBENCH
  j / k               next / prev piece in list
  1-5                 focus section (collapse others)
  esc                 expand all sections
  ⌘R                  Run All (AI draft → variants → carousel → audit)
  ⌘↵                  Ship (only when firewall pass + schedule set)
  ⌘S                  save current piece

INTAKE
  p                   focus capture textarea
  enter               save capture (in textarea)
  ⌘↵                  promote highlighted item to piece

DESK
  no shortcuts; click-driven
```

Existing 1-0 stage shortcut is removed; replaced by `i/w/d` mode + `1-5` section.

## Visual system

**Studio chrome = Apple-native (macOS Tahoe / Liquid Glass era, 2025+).**
**Carousel slide preview + platform mockups = medical-chart aesthetic** per `../15-visual-ip-brief.md` (those mock the public Arutlee posts).

This split is intentional. The studio is an internal tool that runs on Palm's Mac. Making the chrome feel like a native macOS app reduces friction. The post mockups inside the studio are previews of the public visual IP and must keep that DNA.

### macOS HIG references

Sourced from Apple's HIG, WWDC25 Liquid Glass announcement, and AppKit Dynamic System Colors. Concrete values live in `tailwind.config.ts` and `app/globals.css`.

### Typography

System font stack — no webfonts to download:

- **Sans:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif`
- **Mono:** `ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace`
- **Serif (sparingly):** `"New York", ui-serif, Charter, Georgia, serif`

Type roles (from globals.css, mapped to HIG named styles):

| Role | Class | Size | Weight | Tracking | Use |
|---|---|---|---|---|---|
| Large Title | `.large-title` | 28px | 700 | -0.024em | Hero (rare) |
| Title 1 | `.title-1` | 22px | 600 | -0.018em | Page titles |
| Title 2 | `.title-2` | 17px | 600 | -0.012em | Section headers, modal headers |
| Headline | `.chart-label` | 13px | 600 | -0.005em | Inline emphasis, subgroup labels |
| Body | `.body-text` (default) | 13px | 400 | 0 | Paragraphs, form copy |
| Footnote | `.footnote` | 11px | 400 | 0 | Hints, secondary info |
| Caption | `.label` | 11px | 500 | 0 | IDs, timestamps, metadata |

Sentence case throughout (`Hook & body`, not `HOOK & BODY`). Apple apps don't UPPERCASE chrome labels.

### Color (macOS dark, semantic tokens mirroring AppKit)

| Token | Value | Use |
|---|---|---|
| `windowBg` | `#1e1e1e` | Page background |
| `contentBg` | `#252525` | Content surfaces |
| `controlBg` | `#2c2c2e` | Inline controls |
| `elevated` | `#2f2f31` | Cards / NSBox |
| `sidebarBg` | `rgba(40,40,42,0.72)` | Sidebar (translucent) |
| `label` | `rgba(255,255,255,0.92)` | Primary text |
| `labelSecondary` | `rgba(255,255,255,0.55)` | Secondary text |
| `labelTertiary` | `rgba(255,255,255,0.30)` | Hints, metadata |
| `labelQuaternary` | `rgba(255,255,255,0.16)` | Watermark text |
| `separator` | `rgba(255,255,255,0.13)` | Dividers |
| `accent` | `#0a84ff` | systemBlue, primary action |
| `systemRed` `Orange` `Yellow` `Green` `Blue` `Indigo` `Teal` | per Apple | Semantic status |

### Materials (Liquid Glass approximations)

| Class | Use | Properties |
|---|---|---|
| `.toolbar-surface` | Top toolbar | rgba(28,28,30,0.75) + 20px blur + saturate 180% |
| `.sidebar-surface` | Piece list rail | rgba(40,40,42,0.65) + 20px blur |
| `.liquid-glass` | Sticky vital strip, toasts | rgba(36,36,38,0.66) + 40px blur, specular highlight on top edge |
| `.card` | Content groups | Solid `elevated` fill + 0.5px border + soft shadow |

### Controls

- **`.btn`** — secondary action. `rgba(255,255,255,0.07)` fill, 0.5px border, 13px medium, 6px radius.
- **`.btn-primary`** — primary action. systemBlue fill, white text, 13px semibold.
- **`.btn-danger`** — destructive. systemRed fill.
- **`.input`** — NSTextField look. Dark inset fill, 0.5px border, focus uses systemBlue ring.
- **`.segmented`** — NSSegmentedControl. Rounded pill picker for mode/section switching.
- **`.list-row`** — sidebar list. Selected row uses systemBlue tint.
- **`.kbd`** — keyboard cap glyph for shortcut hints.
- **Pills** — capsule-shaped status chips. Use semantic colors (`pill-ok` green, `pill-warn` orange, `pill-block` red, `pill-mute` neutral).

### Spacing and layout

- **Base unit:** 4px (Tailwind default).
- **Toolbar height:** 44px title row + 40px control row = 84px (sticky).
- **Sidebar width:** 240px (matches macOS NavigationSplitView medium).
- **Max content width:** 1600px.
- **Card padding:** 16-20px standard.
- **Section header gap:** 12px.

### Corner radii (matches macOS HIG)

| Class | Value | Use |
|---|---|---|
| `rounded-macSm` | 5px | Buttons, segmented items, list rows |
| `rounded-macMd` | 8px | Cards, toasts, sidebar container |
| `rounded-macLg` | 12px | Vital strip, sheets |
| `rounded-macXl` | 16px | Hero cards |

### Motion

Minimal-functional. macOS-style transitions:
- Section collapse/expand: 150ms ease-out
- Toast: liquid-glass material slides up 200ms ease-out
- List row hover: instant fill change
- Button: instant press feedback via active state

No entrance animations. No scroll-driven choreography.

### What NOT to use in chrome

- No Fraunces / IBM Plex / JetBrains Mono webfonts (deleted from `globals.css`).
- No UPPERCASE CHART-FORM LABELS in studio chrome. Sentence case.
- No tracking-chart 0.18em letter-spacing in chrome.
- No grain texture, no radial-gradient ambient backdrop.
- No amber `#d99850` accent. Use systemBlue `#0a84ff`.
- No 2px-ish sharp corner radii on cards/buttons. Minimum 5px (button), 8px (card).
- No `tracking-chart` class in any new chrome code. Reserve it for the carousel slide and platform mockup components.

## Spacing and layout

- **Base unit:** 4px (Tailwind default).
- **Density:** comfortable. Studio is for long sessions; cramped UI causes errors.
- **Max content width:** 1600px (matches current `max-w-[1600px]` in `app/page.tsx`).
- **Three-column workbench:** `220px / flex / 300px`. Right rail collapsible to `0` for full-width center.
- **Sticky region** = first 88px of case file (vital strip + Run All). Sticky relative to the scrollable center column, not the viewport.

## Motion

Minimal-functional. No entrance animations; no scroll-driven choreography. Allowed:

- Section collapse/expand: `transform`, 150ms ease-out.
- Toast slide-up: 200ms ease-out.
- Pills color-transition on rule re-check: 100ms ease-in-out.
- Modal fade-in: 100ms ease-out.

Anything else is slop on a localhost dev tool.

## AI engine

The studio supports three engines, picked in this order at request time:

```
1. ANTHROPIC_API_KEY set        →  Anthropic SDK direct       (paid, per-token)
2. `claude` binary on PATH       →  spawn `claude -p`          (subscription, $0)
3. neither                       →  deterministic fallbacks    ($0, no AI)
```

**Default for Palm's setup: #2.** Uses the Claude Max subscription — no API costs, no key in `.env.local`. Works because Claude Code authenticates via OAuth from `~/.claude/` and the CLI inherits that auth.

### Why not the Claude Agent SDK

The `@anthropic-ai/claude-agent-sdk` npm package **requires** `ANTHROPIC_API_KEY`. It does NOT support OAuth/subscription auth — Anthropic disallows this in its consumer ToS. Only the standalone `claude` CLI binary uses subscription auth. So when no API key is set, we spawn the CLI as a subprocess instead of importing the SDK.

### CLI invocation

```bash
claude -p "<user prompt>" \
  --system-prompt "<system prompt>" \
  --output-format json \
  --tools "" \
  --no-session-persistence \
  --setting-sources "" \
  --model claude-sonnet-4-6
```

Run from a temp working directory (`os.tmpdir()`) so Claude Code doesn't auto-discover the studio's CLAUDE.md / settings into the system prompt context. `ANTHROPIC_API_KEY` is explicitly cleared in the child env so subscription auth is forced.

### Latency

Cold first call (per-server-restart): ~60-90s, includes 79K-token system-prompt cache write.

Warm calls within the same hour: ~10-25s depending on output length.

A Run All chain (4 sequential calls: draft → variants → carousel → audit) takes ~3-4 min cold, ~60-90s warm. Acceptable for personal localhost workflow; significantly slower than direct API but $0 incremental cost on Max subscription.

### Rate limits

- **Pro:** ~5-hour rolling window, ~40-80 Sonnet messages depending on length. Run All burns 4 messages each.
- **Max 5x:** ~5x Pro.
- **Max 20x:** ~20x Pro. Effectively unlimited for personal studio use.

Palm runs Max — rate limits are not a concern.

### Implementation files

- `lib/claude.ts` — `resolveEngine()`, `callClaude()`, dispatches to `callViaSdk()` or `callViaCli()`.
- `app/api/status/route.ts` — exposes `integrations.anthropic.engine` (`api` / `cli` / `none`) so the masthead chip can show which backend is active.
- All `app/api/ai/*/route.ts` — gate on `(await resolveEngine()).engine === "none"` instead of `getClient()`.
- `components/Masthead.tsx` — `engineLabel()` and `engineHint()` render `AI · cli` / `AI · api` / `AI` accordingly.

## What changes in code

- `app/page.tsx` — `StageId` becomes `Mode = "intake" | "workbench" | "desk"` plus optional `focusedSection: 1-5`.
- `components/Masthead.tsx` — drop the 10-stage tab nav. Replace with three mode chips. Keep the integrations strip and date.
- New `components/Workbench.tsx` — composes existing `DraftPanel`, `PlatformPanel`, `CarouselPanel`, `FirewallPanel`, `SchedulePanel` as scrollable sections inside a three-column layout. Existing panels render unchanged.
- New `components/IntakePanel.tsx` — merges current `InboxPanel` + `TopicsPanel` into one screen.
- New `components/Desk.tsx` — composes `SchedulePanel` (calendar view), `MetricsPanel`, `ReviewPanel`.
- New `components/CaptureOverlay.tsx` — global modal triggered by `c`.
- New `components/VitalStrip.tsx` — sticky piece header with next-action pill + Run All.
- New hook `lib/useLiveAudit.ts` — debounced rule-based audit (slop / firewall / voice) on body text; updates pills in vital strip.
- New `app/api/status/route.ts` field: `last_edited_piece_id` + `last_edited_at`.
- Updated `app/api/pieces/[id]/route.ts` — server-stamps `updated_at` on every PATCH so resume-here works.

Zero changes to:
- All `app/api/*` routes except the two new ones above.
- Data layer (`../data/*.jsonl`).
- AI prompts (`lib/prompts.ts`).
- Rule libraries (`lib/slop.ts`, `lib/firewall.ts`, `lib/voice.ts`).
- The `lib/types.ts` schema.

## Decisions log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-27 | 10 stage tabs → 3 modes (Intake/Workbench/Desk) | Stages were navigation, but workflow is per-piece. Three modes maps to actual user states (capturing / crafting / reviewing). |
| 2026-04-27 | Long-scroll Workbench default, `1-5` collapses | User picked B — keeps cognitive continuity (whole piece visible) while preserving fast jumps for power use. |
| 2026-04-27 | Global capture hotkey `c` | Capture is a context-free action. Forcing user to navigate to Intake first wastes a click and breaks flow. |
| 2026-04-27 | "Run All" automation chain | Each AI step is currently a separate button click + wait. Chaining them turns a 5-click flow into 1. |
| 2026-04-27 | Live quality pills | Currently firewall/slop/voice run only on explicit Audit. Inline live-checking moves quality from end-gate to inline guardrail. |
| 2026-04-27 | Format-aware editor with OPD/IPD spines | Casefile is a post format, not a UI metaphor. OPD card = CC/PI/PH/PE/IX/TX, IPD card = SOAP. Editor renders the spine inline; body still saves as one markdown blob. |
| 2026-04-27 | Visual IP unchanged | `15-visual-ip-brief.md` is locked. This redesign is IA + interaction, not aesthetic. |
| 2026-04-27 | No light mode | Localhost-only, single user, dark-default per `feedback_dark_mode_html.md`. Toggle is dead weight. |
