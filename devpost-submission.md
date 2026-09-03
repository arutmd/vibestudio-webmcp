# Title

VibeStudio

## One-line Summary

VibeStudio is a shared creative workspace where a creator and the agent they already use turn inspiration, editable creator memory, and reusable production methods into consistent content together.

## Problem

General-purpose AI can generate copy and images, but creators repeatedly have to explain who they are, what their brand sounds like, what they like, and how each format should be produced. The context becomes scattered across chats, the agent cannot reliably act inside the creative workspace, and creators lose control over what the system remembers.

## Solution

VibeStudio gives the creator and Codex one visible, shared workspace. The creator curates multimodal inspiration, records explicit taste signals, edits a persistent Template of brand and production rules, and works in Sessions that retain their source, context receipt, version history, and status. Through page-contextual WebMCP tools, Codex can read only the context needed for the current task, create or revise a carousel inside the workspace, and leave every material change visible and reversible.

The challenge proof is one complete path: select an inspiration, state what is worth borrowing, retrieve a bounded creator context receipt, create an original seven-slide carousel, revise one slide, undo it, mark the piece Ready, and inspect the traceable learning that can shape the next piece.

## Why This Matters

Content creation is not a single generation step. It is an ongoing collaboration among taste, brand memory, source material, format rules, iteration, and publishing state. VibeStudio makes that system durable and inspectable while letting creators keep the conversational agent they already trust.

WebMCP is central to this experience because the agent and human work on the same live artifact. The agent does not have to infer the whole interface from pixels or receive an unrestricted export of the creator's memory. The page exposes a small typed tool set for the current view, while the creator sees the resulting session, version, status, and undo trail immediately.

## How We Used AI

- Codex transforms selected inspiration and a bounded creator-context receipt into an original seven-slide story.
- OpenAI image generation creates up to three text-free visual layers; VibeStudio's deterministic renderer owns typography, layout, and the final 1080 x 1350 slides.
- AI can propose focused revisions to a selected slide or Template slot without replacing the whole artifact.
- Accepted creator feedback can become source-linked learning, but one-off instructions do not silently become permanent rules.
- Existing optional Claude-backed routes remain in the broader local Studio, but the challenge's WebMCP collaboration path was tested with Codex.

## How We Used Codex

Codex Desktop was the primary design, implementation, debugging, and testing partner. It helped research current WebMCP interaction patterns, turn the product thesis into a scoped PRD and technical specification, implement typed contextual tools, iterate on the UI with the creator, and run the end-to-end acceptance journey.

For the product demo, Codex is also the user's agent. In ChatGPT's in-app browser it discovers VibeStudio's current page tools, reads the selected inspiration and bounded Template context, connects to the current Session, and creates or revises the artifact. This is not a simulated chat panel inside VibeStudio; it is the creator's existing agent operating the real workspace through WebMCP.

## Key Features

- Multimodal Inspire feed organized by YouTube, TikTok, Instagram, Facebook, news, and websites.
- One-field source intake that accepts a link, free text, or both.
- Explicit likes, dislikes, notes, saves, and source following that curate the creator's taste.
- Editable Template containing identity, audience, voice, visual taste, goals, examples, and production rules.
- Session-based work with Draft, Ready, Scheduled, and Live states.
- Page-contextual WebMCP tools rather than one large global tool catalog.
- Shared Attention: the creator can point, draw, and place multiple UI targets in a visible Talking about tray for the agent.
- Versioned agent changes, attribution, review state, and undo.
- Reusable carousel skill with exactly seven validated slides and deterministic final rendering.
- Bounded context receipts that show which creator memories and rules shaped an artifact.
- Safety boundary: no publishing, scheduling, permanent deletion, arbitrary URL fetch, filesystem path, shell, or unrestricted creator-memory tool is exposed through WebMCP.

## Architecture

VibeStudio is a Next.js 16, React 18, and TypeScript application. Its WebMCP adapter detects `document.modelContext`, registers typed tools for the current page, and unregisters stale tools when the view changes. The current challenge tool surface includes Session, Inspire, Template-context, carousel, status, review, and undo operations.

Local records use append-friendly JSONL files for creators, inspiration, Template memory, context receipts, Sessions, and activity. Mutations use version checks and idempotency keys. External inspiration is marked as untrusted content, reads are annotated as read-only, responses are bounded, and the final carousel renderer deterministically composes text and generated image layers.

The public judge build runs in a sanitized demo mode with generic seed data and an isolated writable root. It does not read the creator's adjacent private project data, reports local integrations as disconnected, and blocks server-side fetch, scraping, upload, publishing, metrics-sync, and embedded-assistant routes.

## Testing Instructions

### Local verified path

1. Install dependencies with `npm install`.
2. Start VibeStudio with `npm run dev`.
3. Open `http://127.0.0.1:4321/` in ChatGPT's in-app browser or Chrome with WebMCP enabled.
4. Open **Inspire** and select **A release visual that feels like a found artifact**.
5. Ask the agent to list the available VibeStudio Sessions. Confirm that the page exposes `session_list`.
6. Create a Session, connect the browser agent, then ask it to read the Session and its Template receipt.
7. Ask the agent to create or revise the seven-slide carousel. Confirm the artifact changes in VibeStudio, the activity trail attributes the change to Codex, and Undo restores the prior version.
8. Reload the page and confirm the Session, carousel, status, and context receipt persist.

Verified on September 3, 2026:

- 36 local test files passed.
- TypeScript checking passed.
- The Next.js 16.3.4 production build passed.
- The production build completes without dynamic-filesystem tracing warnings, keeping local agent and renderer paths out of the public deployment trace.
- `npm audit --omit=dev` reported zero vulnerabilities.
- ChatGPT's in-app browser discovered VibeStudio's contextual WebMCP tools.
- A live `inspire_list` WebMCP call returned four generic references.
- Codex started connected Session `field-note-20260903-001`, received a bounded 10-rule Template receipt, and revised only slide 1 through WebMCP.
- VibeStudio immediately showed version 2, Codex attribution, review handoff, and Undo.
- Demo mode returned HTTP 403 for blocked external fetching and did not expose unsafe WebMCP tools.
- Demo mode also blocks live local-engine probing and reports Anthropic, Codex, Buffer, and webhook integrations as disconnected.

### Public judge path

Open `https://vibestudio-webmcp.vercel.app/` in ChatGPT's in-app browser or Google Chrome with WebMCP enabled, then follow the same path above. No credentials are required. The public build was verified live with contextual WebMCP tool discovery, generic inspiration data, a real `session_start` call, visible Session selection, and an immediate `session_read` continuity receipt.

## Public Demo Link

https://vibestudio-webmcp.vercel.app/

## Public Repository Link

https://github.com/arutmd/vibestudio-webmcp

The repository must contain the application source, assets required to run the judge demo, setup instructions, the visible `document.modelContext.registerTool` implementation, and an open-source license that Devpost can detect on the repository page.

## Demo Video

The complete local video composition is 78.057 seconds with English narration, timed captions, six intentional scene transitions, and no background music. It shows the real connected VibeStudio workspace at 7.3 seconds, then multimodal taste curation, WebMCP tool discovery, the connected Codex Session, bounded Template context, a visible one-slide revision with attribution and Undo, and the finished carousel.

The composition passed HyperFrames lint, runtime, layout, motion, and WCAG AA contrast checks. The final 1920 × 1080 MP4 is rendered locally with H.264 video and 48 kHz stereo AAC audio. Public YouTube upload remains TODO pending explicit publishing approval.

**Public YouTube URL:** https://youtu.be/kABJvG4_BBU

## Screenshot Shot List

1. Inspire feed with the selected source and saved taste note: `docs/hackathon-build/evidence/inspire-final-cropped.png`.
2. Human-agent Session and visible change review: `docs/hackathon-build/evidence/piece-collaboration-final.png`.
3. Finished Session with all creation stages complete: `docs/hackathon-build/evidence/piece-final-complete.png`.
4. Final seven-slide output: `docs/hackathon-build/evidence/carousel-contact-sheet.png`.
5. Live judge-mode WebMCP collaboration: `docs/hackathon-build/evidence/webmcp-live-collaboration-clean.png`.

## Submission Readiness Notes

### Verified

- Devpost account access works.
- Palm is registered for The WebMCP Challenge.
- VibeStudio's contextual WebMCP tools are discoverable and callable in ChatGPT's in-app browser.
- The sanitized public demo mode works with isolated generic data.
- A real Codex-to-VibeStudio Session start, bounded context read, and one-slide revision passed through WebMCP.
- Local tests, type-checking, the production build, and the dependency audit pass.
- Release tracing is explicitly bounded around local Codex, Chrome, and profile-image paths so the deployment does not sweep in the whole workspace.
- Existing screenshots and a concise demo outline are available.
- The 78.057-second narrated demo composition is complete, timed, captioned, and passes its full render-readiness gate.
- An MIT license and public deployment configuration are present.
- The local scan found no high-confidence API-key, GitHub-token, Slack-token, AWS-key, or private-key pattern.

### Final submission gate

- The public repository, live demo, and public YouTube video are live.
- The MIT license is detected by GitHub.
- The public app returns HTTP 200, serves only generic judge data, exposes contextual WebMCP tools, and blocks external fetch routes with HTTP 403.
- `.env.local`, Palm's private `data-seeds/`, local Devpost state, generated caches, and machine-specific paths remain excluded from the public repository and deployment bundle.
- The only remaining action is creating and submitting the Devpost project after Palm's explicit final confirmation.

## Known Limitations

- The creator workspace remains local-first and filesystem-backed; the judge build uses an isolated ephemeral demo store.
- Carousel is the complete challenge output; hero image, standalone post, video, overlay, and SVG production are future skills rather than completed challenge flows.
- Live source monitoring, multi-user authentication, and automated publishing are outside the challenge scope.
- Image generation may outlast an in-app browser call timeout, but the Session preserves progress and completed layers.
- The serverless judge build keeps newly-created Session receipts in the active browser workspace for immediate agent continuity; the local build remains the durable filesystem-backed reference implementation.

## TODO Official Form Fields

- **Submitter Type:** Individual
- **Country of residence:** Thailand
- **Organization name:** Not applicable
- **App Status:** Existing
- **What changed during the submission period:** The existing local content Studio was extended after August 25 with the VibeStudio creator and inspiration stores, editable Template memory, bounded context receipts, versioned Sessions, shared attention, contextual WebMCP tool registration, safe agent mutations and undo, the carousel skill contract, the new Inspire and Template experiences, and the tested Codex-to-carousel golden path. The repository history or equivalent dated evidence must make this boundary visible.
- **Live URL:** https://vibestudio-webmcp.vercel.app/
- **Testing instructions / credentials:** Use the public judge-path instructions above. No credentials planned for the sanitized demo.
- **Public code repository:** https://github.com/arutmd/vibestudio-webmcp
- **Agents or clients tested:** Codex Desktop with ChatGPT's in-app browser and its native WebMCP support.
- **AI tools leveraged:** Codex Desktop for research, product design, implementation, debugging, testing, and the live WebMCP collaboration flow; OpenAI image generation for visual exploration and text-free carousel layers. Optional Anthropic-backed routes exist in the pre-existing local Studio but are not the core challenge proof.
- **Learning derived:** Significant
- **AI value applicable to career:** Yes
