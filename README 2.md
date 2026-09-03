# VibeStudio

A shared creative workspace where creators and the agents they already use turn inspiration, editable creator memory, and reusable production methods into consistent content.

VibeStudio was extended for [The WebMCP Challenge](https://webmcp.devpost.com/). Its challenge path uses contextual `document.modelContext.registerTool` tools so Codex and the creator can work on the same visible, versioned artifact.

## What this is

A localhost web app that runs the full Arutlee production pipeline against the JSONL data layer at `../data/`. Same files Claude Code reads; same firewall, voice, and slop rules from the planning docs, executable.

Two rooms:

- **Pieces** (default): the room you live in. Left rail, center scroll, right live preview.
- **Desk**: calendar, metrics, and weekly review.

Press `c` from anywhere to open the global capture overlay. There are no per-stage tabs.

Every gate enforces the rules from the parent project:

- **Slop test** (`17-no-slop-test.md`): em-dashes, banned vocab, embellishment, AI-creator structure, ChatGPT-default voice. Rule-based first pass + AI qualitative pass.
- **Cariva / Vein firewall** (`01-executive-summary.md`): hard keywords block, origin-context drift warns. Asymmetric (false negatives are cheap, false positives are expensive).
- **Voice register** (`03-content-pillars-and-series.md`): code-switched Thai-English, modesty markers, concrete numbers + caveats, no hype voice.

If any block-level rule fires, the piece does not advance to QA-passed.

## Stack

- Next.js 14 App Router + React 18 + Tailwind 3 + TypeScript
- Anthropic SDK (optional; deterministic fallbacks work without an API key)
- File-system JSONL at `../data/*.jsonl` (no DB)
- Localhost only (no auth)

Picked over alternatives: Next 14 instead of 16 (no Cache Components churn), React 18 instead of 19 RC (stable), Tailwind 3 instead of 4 (no PostCSS plugin migration), Anthropic SDK direct instead of Vercel AI SDK (TCREI prompts are bespoke).

## Setup

```bash
cd studio
cp .env.local.example .env.local
# fill in whatever you actually want to use; all values are optional
npm install
npm run dev
```

Then open http://localhost:4321.

### Public judge demo mode

The public build must never read Palm's private creator Brain. Demo mode uses only the generic records under `demo-seeds/`, writes into the ignored `.vibestudio-demo/` workspace, and disables server-side fetching, uploads, publishing integrations, and the embedded assistant route.

```bash
npm run dev:demo
```

Then open http://localhost:4323 in ChatGPT's in-app browser or a Chrome build with WebMCP enabled. The included `render.yaml` sets `VIBESTUDIO_DEMO_MODE=1` for the public judge service.

The studio reads/writes the existing `../data/*.jsonl` files. No data migration needed; existing inbox records and any future captures show up immediately.

## Environment variables

All optional. Each unlocks a feature; the studio is fully usable without any of them.

### `ANTHROPIC_API_KEY` (recommended)

Without this, every AI action uses a deterministic template. With it, you get:

- Real web research on capture: sources fetched, summarized, and ~5 reference photos pulled
- TCREI-shaped drafts (Field Note / Casefile / filter / anchor) in Palm's voice
- Per-section rewrite, inline selection popover (punchier / shorter / fix)
- EN/TH translation per section
- Per-platform variant packs on demand (LinkedIn / Facebook / Instagram / Threads / TikTok / YouTube)
- AI qualitative audit pass on top of rule-based slop / firewall / voice checks
- AI-prepped Sunday weekly review (Role 2 from `16-data-system.md`)

`ANTHROPIC_MODEL` defaults to `claude-sonnet-4-6`. System prompts use prompt caching for the large brief; re-runs of the same brief stay cheap.

### Auto-posting + analytics via Buffer (`BUFFER_ACCESS_TOKEN` + `BUFFER_PROFILES_JSON`)

Buffer covers LinkedIn, Facebook, Instagram, Threads, TikTok, X, YouTube, Pinterest, Bluesky, Mastodon from a single token. Buffer plans start at $6/mo per channel.

1. Create a Buffer app at https://buffer.com/developers/apps and grab a personal access token (paid plans only).
2. Fetch your profile IDs and build a JSON map: `curl -H "Authorization: Bearer $TOKEN" https://api.bufferapp.com/1/profiles.json | jq '[.[] | { (.service): .id }] | add'`.
3. Set `BUFFER_ACCESS_TOKEN` and `BUFFER_PROFILES_JSON`, e.g. `BUFFER_PROFILES_JSON='{"linkedin":"abc","facebook":"def","instagram":"ghi"}'`.

The map shape is required so each per-platform variant lands on the matching profile, not fanned out to every channel.

Note: personal API tokens expire every 30 days. Buffer emails you 7 days before; rotate the token then.

Legacy `BUFFER_PROFILE_IDS` (comma-separated) is rejected with a 501 because it would silently fan out to every profile regardless of platform.

### Auto-posting via webhook (`PUBLISH_WEBHOOK_URL` + `PUBLISH_WEBHOOK_SECRET`)

Generic outbound. The studio POSTs JSON; your scenario does the rest. Compatible with Make.com, n8n, Zapier, custom backends.

The payload looks like:
```json
{
  "piece_id": "field-note-20260427-001",
  "title": "...",
  "hook": "...",
  "format": "field_note",
  "lead_platform": "linkedin",
  "platforms": ["linkedin", "facebook", "instagram"],
  "body": "...",
  "platform_variants": { "linkedin": "...", "facebook": "..." },
  "hero_image_path": "pieces/foo/hero-linkedin.png",
  "visual_prompt": "...",
  "when": "queue|now|2026-04-28T09:00:00+07:00",
  "scheduled_for": "..."
}
```

Set `PUBLISH_WEBHOOK_SECRET` and the studio sends it as `X-Arutlee-Secret` so your scenario can verify the request.

### Pack mode (no env vars needed)

The "Pack" button bundles all platform variants plus the hero image filename and copies them to your clipboard. This is the default publish path; it works on day 1 with no configuration.

## Workflow

### Capture

Press `c` from anywhere (outside a text field) to open the global capture overlay. Drop a URL, a messy thought, a prepared draft, or a screenshot note. On submit it appends to `../data/inbox.jsonl`. Detected URLs are noted; the heavy research runs later, during Autopilot, so the inbox stays cheap and fast.

### Pieces room: the left rail

Captured items appear in the **Inbox** bucket. Each shows a "Turn into a piece" action that creates the `pieces/<slug>/` folder and moves the item to Drafting. From there, Autopilot is available.

Pieces are grouped by state: Inbox / Drafting / Ready / Scheduled / Live. Use `j`/`k` to move selection.

### Autopilot (`⌘R`)

One action runs the full content engine:

1. **Research** (Stage 0): web search + scrape real sources, produce `source.md` + `source-facts.json` + ~5 reference photos.
2. **Draft** (Stage 1): lead-platform copy in Palm's voice, grounded in source facts.
3. **Visuals** (Stage 2): render one hero image by default. Carousel is an opt-in output built after the draft is approved.
4. **Audit** (Stage 3): slop / firewall / voice checks; stops on any hard failure, shows the reason, does not mark the piece ready.

Live per-stage status appears in the VitalStrip while Autopilot runs. Each stage can also be run alone from its section.

### Pieces room: the five sections

The center scroll shows one selected piece as a vertical scroll with a sticky VitalStrip at the top. Five anchored sections (keys `1-5` collapse all but one; `Esc` expands all):

1. **Sources and research**: auto-built summary from `source.md` + reference photos, editable inline.
2. **Draft (lead platform)**: format-aware spine editor. Select text for an inline rewrite popover (punchier / shorter / fix). Each section has a sparkle (re-generate that section only) and an EN/TH toggle. Live slop / firewall / voice pills update while you type.
3. **Visuals**: choose Hero image or Carousel. The normal carousel path is Create carousel draft, review one slide at a time, then Finish carousel. Advanced controls for slide count, reordering, prompts, and manual rendering stay under More options. Final output is a set of 1080 x 1350 PNG files with clean Thai overlays.
4. **Quality audit**: slop / firewall / voice verdicts with reasons inline; click a red pill to jump to the offending spot.
5. **Pack and schedule**: copy the per-platform paste-pack to clipboard; set the schedule date; generate other-platform variants on demand.

The VitalStrip always shows the one computed "Next:" step. The Autopilot button is the primary action.

### Desk room

Switch to Desk for:

- **Calendar**: scheduled and published pieces with status badges. Click a card to open the verify gate (rendered image + final text + quality statuses; approval locked until checks pass).
- **Metrics**: lightweight engagement summary.
- **Weekly review**: AI-prepped Sunday review per `16-data-system.md` Role 2.

## Architecture

```
studio/
├── app/
│   ├── api/
│   │   ├── inbox/             GET POST   →  ../data/inbox.jsonl
│   │   ├── pieces/            GET POST   →  ../data/pieces.jsonl
│   │   ├── pieces/[id]/       GET PATCH  →  one row, in-place update
│   │   ├── metrics/           GET POST   →  ../data/metrics.jsonl
│   │   ├── decisions/         GET POST   →  ../data/decisions.jsonl
│   │   ├── experiments/       GET POST   →  ../data/experiments.jsonl
│   │   ├── topics/            GET        →  parsed from ../03-content-pillars...md
│   │   ├── ai/ideate/         POST       →  Claude or fallback
│   │   ├── ai/draft/          POST       →  Claude or fallback
│   │   ├── ai/rewrite/        POST       →  selection rewrite / translate / section regenerate
│   │   ├── ai/platform-pack/  POST       →  Claude or fallback
│   │   ├── ai/visual-prompt/  POST       →  Claude or fallback
│   │   ├── ai/firewall/       POST       →  rules-only or rules+Claude
│   │   ├── ai/weekly-review/  POST       →  Claude or fallback
│   │   ├── engine/run/        POST       →  content engine with live stage transitions
│   │   ├── publish/buffer/    POST       →  Buffer API (requires env)
│   │   ├── publish/webhook/   POST       →  generic webhook (requires env)
│   │   └── publish/pack/      POST       →  copy-to-clipboard payload
│   ├── layout.tsx
│   ├── page.tsx               thin shell: room routing + global hotkeys
│   └── globals.css            medical-chart palette in preview mockups; Apple-native chrome
├── components/
│   ├── TopBar.tsx             single chrome bar: room switch, engine chip, capture hint
│   ├── CaptureOverlay.tsx     global c capture overlay
│   ├── PiecesRoom.tsx         three-pane container (rail + scroll + preview)
│   ├── PieceRail.tsx          left list grouped by state
│   ├── PieceScroll.tsx        center; composes the five sections
│   ├── sections/
│   │   ├── SourcesSection.tsx research summary + reference photos
│   │   ├── DraftSection.tsx   format-aware editor + inline AI (rewrite / sparkle / EN-TH)
│   │   ├── SelectionPopover.tsx  selection rewrite popover
│   │   ├── ImageSection.tsx   hero render + provider visibility
│   │   ├── AuditSection.tsx   quality results with inline reasons + fix-jumps
│   │   └── ShipSection.tsx    pack + schedule + on-demand platform generation
│   ├── LivePreview.tsx        right pane: live platform mockup
│   ├── VitalStrip.tsx         sticky status + Autopilot button + computed next action
│   ├── DeskRoom.tsx           calendar + verify gate + metrics + weekly review
│   ├── CalendarStudio.tsx     calendar with verify-drawer quality gate (reused by DeskRoom)
│   └── ReviewPanel.tsx        weekly review (reused by DeskRoom)
└── lib/
    ├── types.ts               mirrors data/README.md schemas
    ├── paths.ts               parent-project file paths
    ├── jsonl.ts               read/append/patch helpers
    ├── claude.ts              Anthropic client + JSON-safe parser (allowedTools option for research)
    ├── prompts.ts             all prompts, distilled from the source docs
    ├── formatSpine.ts         format -> section spine; split/join body markdown
    ├── nextAction.ts          pure next-action computation (tested)
    ├── useStudio.ts           data + actions hook (all fetching + the ~12 actions)
    ├── slop.ts                rule-based slop test
    ├── firewall.ts            rule-based Cariva / Vein firewall
    ├── voice.ts               rule-based voice-register check
    ├── contentEngine/         the headless content engine (run.ts + providers)
    └── format.ts              UI helpers
```

## Design notes

- **Single source of truth.** The studio writes to `../data/*.jsonl`, the same files Claude Code reads. There is no separate "studio database" to drift.
- **Rule-based floor + AI ceiling.** Every block-level rule (em-dashes, banned vocab, hard firewall keywords, hype voice) is enforced deterministically before any AI call. The AI can confirm or add qualitative judgment but cannot pass a rule failure.
- **Fully working without API keys.** Deterministic fallbacks for all AI actions. Set `ANTHROPIC_API_KEY` to upgrade. Set `BUFFER_ACCESS_TOKEN` or `PUBLISH_WEBHOOK_URL` to add real auto-posting; until then, Pack mode copies everything to the clipboard.
- **Pack, not auto-post.** Publishing is copy-paste pack by default. The Buffer and webhook integrations are wired as a seam for later; they are not the default path.
- **Visual IP in previews, not in chrome.** The medical-chart aesthetic (Fraunces / IBM Plex / JetBrains Mono, monospace labels, dark default) is used only in the platform mockup previews, which show what public posts look like. The studio chrome uses Apple-native system fonts (macOS Tahoe / Liquid Glass, SF Pro).
- **No em-dashes anywhere.** All UI strings, fallback templates, prompts, and copy comply with `feedback_no_em_dash.md`. (Source code comments are exempt; not user-facing.)

## Add to the parent README

If you want the studio in the project root README, add this row to `00-README.md`:

```
21. `studio/`: localhost dashboard that runs the workflow end-to-end against the data/ JSONL files. Setup in `studio/README.md`.
```

## Testing the install

```bash
# from studio/
npm run dev
# in another terminal:
curl -s http://localhost:4321/api/inbox | jq '.records | length'
# should print the row count from your inbox.jsonl

curl -s -X POST http://localhost:4321/api/ai/firewall \
  -H "Content-Type: application/json" \
  -d '{"body":"This is a game changer—truly revolutionary."}' | jq '.overall'
# should print "fail"
```

## Where the metaphor breaks down

- **Buffer profile-to-platform mapping is 1:N**, not per-platform. The studio fans out to all configured profile IDs. If you want different copy per profile, run pack mode and post manually.
- **Hero image upload to Buffer is not wired.** Buffer needs a publicly hosted image URL, not a local file path. The integration attaches the local path as a description placeholder so you can swap in the URL after upload.
- **Pinning is not automated.** Per `04-platform-playbook.md`, the strongest foundational post per platform should be pinned. The studio does not trigger pin actions; do it manually after publish.
- **Metrics do not auto-sync.** The metrics view is a lightweight summary; pulling from Buffer requires setting `BUFFER_ACCESS_TOKEN` and manually triggering a sync.

## License

MIT. See `LICENSE`.
