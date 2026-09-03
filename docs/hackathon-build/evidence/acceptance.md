# VibeStudio WebMCP Acceptance Evidence

## Public judge-mode acceptance — September 3, 2026

- Demo mode ran at `http://127.0.0.1:4323` using only `demo-seeds/` and the ignored `.vibestudio-demo/` data root.
- Next.js initially blocked its client runtime on the `127.0.0.1` judge origin. Adding the explicit development origin fixed hydration; the real inspiration feed and WebMCP tools then appeared.
- ChatGPT's in-app browser discovered 12 contextual tools on Inspire. A live `inspire_list` call returned four generic references.
- Codex called `session_start` and created connected Session `field-note-20260903-001` with context receipt `context-20260903-001`.
- A live `template_context` call returned a bounded receipt with 10 relevant rules and `carousel-v1` rather than the unrestricted Template store.
- Codex called `carousel_update` for slide 1 only. The Session moved from version 1 to 2 and immediately showed the connected collaborator, exact reason, review handoff, and Undo.
- Screenshot: `webmcp-live-collaboration-clean.png`.
- The demo tool surface contained no publish, schedule, delete, arbitrary fetch, filesystem, shell, or unrestricted-memory tool.
- Demo mode reported local AI integrations as disconnected and returned HTTP 403 for its blocked server-side fetch route.
- Demo mode now also returns HTTP 403 for the live AI-engine ping, while `/api/status` reports Anthropic, Codex, Buffer, and webhook integrations as disconnected.
- All 36 test files, TypeScript checking, and the Next.js 16.3.4 production build passed. `npm audit --omit=dev` reported zero vulnerabilities.

## Golden path

- Inspiration: `inspiration-20260831-001` from Anthropic.
- Explicit taste memory: `brain-20260831-017`; like, dislike, clear, and restored-like states were exercised without producing a duplicate Brain item.
- Original demo piece: `field-note-20260831-001`, exactly seven slides, linked to `carousel-v1@1.0.0` and context receipt `context-20260831-001`.
- Precise revision: activity `activity-20260831-003` changed only slide 4. Activity `activity-20260831-004` restored it. A second undo was refused.
- Stale edit proof: an update at expected version 1 was refused while current version was 2, and the newer saved text remained intact.
- Status proof: Draft → Ready → Draft → Ready persisted. Repeated Ready transitions produced one learned record, `brain-20260831-018`, rather than duplicates.
- Memory growth proof: `brain-20260831-018` was accepted and edited through the live `brain_edit` WebMCP tool. The next piece-specific context receipt, `context-20260831-006`, includes the edited learning before the bounded 1,500-character cutoff.
- Finish proof: activity `activity-20260831-015` generated three text-free visual layers and rendered seven final slides in `pieces/field-note-20260831-001/carousel/20260831-100900`.

## Recovery and persistence

The in-app browser stopped waiting for the long `carousel_finish` call after its 30-second CDP limit. Studio retained the working operation and the saved story. Each generated layer then appeared independently at versions 7, 8, and 9 before the deterministic seven-slide render completed at version 10. Reload showed the final 4/4 state and all seven PNGs. This proves that a client-side interruption does not erase the story or completed layers.

## WebMCP proof

- Inspire view: `inspire_list`, `inspire_open`, `inspire_react`, `brain_context`, `carousel_create`.
- Piece view: `carousel_read`, `brain_context`, `carousel_update`, `carousel_finish`, `piece_status`, `piece_undo`.
- Brain view: `brain_list`, `brain_edit`.
- Changing views replaced the contextual set without duplicates.
- Read tools carry `readOnlyHint`; external inspiration results carry `untrustedContentHint`.
- `publish_piece` was refused because it is not registered. No publish, schedule, delete, arbitrary URL, path, or shell tool is exposed.

## Data and regression proof

- Seed line counts remained 11 creators, 6 inspirations, and 18 Brain items after two installation requests.
- Retrying the original carousel-create idempotency key returned `field-note-20260831-001`; the piece count remained one.
- Full local suite: 24 test files passed.
- Typecheck: passed.
- Production build: passed.
- Browser console: zero warnings and zero errors after the full live journey.
- Full-width and split-width document checks: no horizontal overflow.
- Real published pieces were not changed; all acceptance mutations belong to the isolated hackathon demo records.

## Human-agent collaboration proof

- Visible Studio edits now send human attribution; WebMCP slide and status actions default to Codex attribution. Brain edits also preserve whether You or Codex made the change.
- `activity-20260831-018` created a Codex-attributed slide revision and moved the workspace to `needs_review`. The Studio showed `Your turn`, the exact revision, and a working Undo control.
- The latest Codex revision was undone from the visible activity trail. Version 13 restored the prior slide content and clearly handed control back to Codex.
- A human `Mark Ready` action produced version 14, remained attributed to You, and left the final seven-slide piece Ready.
- A human-only review endpoint records explicit acceptance of pending Codex work and changes the shared state to `In sync`. It refuses when no agent change is waiting.
- The inspector shows both collaborators, the bounded context/read/revise/render scope, and the safety boundary: Codex cannot publish on Palm's behalf.
- Visual comparison evidence: `design-qa-collaboration-comparison.png`. Full and split layout measurements show no horizontal overflow; browser console remained clean.

## Release boundary

The application has been upgraded to Next.js 16.3.4 and the dependency audit is clean. Public demo mode is deliberately separate from the creator's private local workspace: it seeds only generic records, writes only to `.vibestudio-demo/`, hides local integration status, and blocks external fetch, scraping, uploads, publishing, metrics sync, and the embedded assistant. A clean public deployment and signed-out acceptance test remain required before submission.

## Demo-video readiness — September 3, 2026

- Seven narrated scenes total 78.057 seconds, below the official three-minute limit.
- The composition includes English voice audio, word-timed captions, six scene transitions, three real VibeStudio proof images, and a final creator-control lockup.
- `npx hyperframes lint` passed with zero errors and zero warnings.
- `npx hyperframes check` passed with zero runtime, layout, or motion issues; 45/45 text checks passed WCAG AA.
- Midpoint snapshots and the final hold were inspected together in `videos/vibestudio-webmcp-demo/snapshots-review/contact-sheet.jpg`.
- The organizer-aligned opening now shows the real connected VibeStudio workspace at 7.3 seconds; its early proof sheet is `videos/vibestudio-webmcp-demo/snapshots-review/early-proof/contact-sheet.jpg`.
- The refreshed 14-frame whole-film review is in `videos/vibestudio-webmcp-demo/snapshots-review/final-v2/contact-sheet-1.jpg` and `contact-sheet-2.jpg`.
- The final MP4 was rendered after Palm requested to see the video: `videos/vibestudio-webmcp-demo/renders/video.mp4`.
- `ffprobe` verifies a 78.067-second 1920 × 1080 H.264 stream at 30 fps plus 48 kHz stereo AAC audio. Public YouTube upload remains approval-gated.

## Public-build boundary — September 3, 2026

- The production build completes without dynamic-filesystem tracing warnings.
- Local Codex, Chrome, and optional profile-image paths are excluded from automatic deployment tracing.
- All 36 local test files still pass after this release-boundary hardening.
- The judge server was rechecked live: it cannot probe the local Claude/Codex environment and exposes no configured private integration.
- The public-repository ignore boundary excludes `.env.local`, Palm's private `data-seeds/`, the local Devpost state, generated demo data, build caches, voice files, and rendered videos; only the generic `demo-seeds/` remain publishable.
- Machine-specific launch helpers and generated absolute-path receipts are also excluded or rewritten as repository-relative provenance.
- A publishable-file scan found zero local home/work paths and zero high-confidence API key, GitHub token, Slack token, AWS key, or private-key patterns.
- A local production-mode rehearsal booted successfully with `VIBESTUDIO_DEMO_MODE=1`: the home page and generic inspiration records loaded, `/api/status` reported every private integration disconnected, and both `/api/status/ping` and `/api/fetch` returned HTTP 403.
