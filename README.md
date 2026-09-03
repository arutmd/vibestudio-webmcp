# VibeStudio

VibeStudio is a shared creative workspace where a creator and the agent they already use turn inspiration, editable creator memory, and reusable production methods into consistent content together.

Built for [The WebMCP Challenge](https://webmcp.devpost.com/), it uses contextual `document.modelContext.registerTool` capabilities so Codex and the creator can work on the same visible, versioned artifact. VibeStudio does not replace the agent with another chat box. It gives the agent a safe place to collaborate.

## The demo in one minute

1. Open **Inspire** and choose a saved reference.
2. Ask Codex to start a carousel Session from it.
3. VibeStudio gives Codex a bounded receipt containing only the relevant Template rules.
4. Codex revises one slide; the canvas updates immediately with attribution, version history, and Undo.
5. The creator reviews the change and decides whether the piece becomes Ready.

The model supplies intelligence; VibeStudio supplies continuity, visible memory, reusable methods, and control.

## Challenge features

- **Bring your own agent.** Collaboration happens through the user's existing Codex or ChatGPT session.
- **Contextual WebMCP tools.** Inspire, Session, Template, and carousel tools appear only when relevant and stale registrations are removed.
- **Editable Template memory.** Identity, audience, voice, visual taste, goals, examples, and production rules stay inspectable and editable.
- **Bounded context receipts.** The agent gets the minimum useful memory for the current task, not an unrestricted personal-memory dump.
- **Shared Attention.** The creator can point, draw, or place multiple exact UI targets in a visible “Talking about” tray.
- **Versioned collaboration.** Agent changes record who changed what and why, support optimistic version checks, and can be undone.
- **Reusable carousel skill.** One creator-independent contract validates an original seven-slide story and deterministic 1080 × 1350 output.
- **Human control.** WebMCP exposes no publish, schedule, delete, arbitrary URL, filesystem, shell, or unrestricted-memory tool.

## WebMCP implementation

The current browser API is detected from `document.modelContext`. A temporary `navigator.modelContext` fallback is isolated for older preview clients. Tools are registered with an `AbortController`, and changing the current VibeStudio surface unregisters the obsolete set.

Key files:

- [`lib/webmcp/useArutleeWebMCP.ts`](lib/webmcp/useArutleeWebMCP.ts) — page-aware registration lifecycle
- [`lib/webmcp/adapter.ts`](lib/webmcp/adapter.ts) — current API detection and safe registration
- [`lib/webmcp/tools.ts`](lib/webmcp/tools.ts) — typed, bounded tool contracts
- [`lib/webmcp/preferences.ts`](lib/webmcp/preferences.ts) — creator-controlled capability toggles
- [`lib/contextSelector.ts`](lib/contextSelector.ts) — bounded Template selection and receipts
- [`lib/skills/carouselSkill.ts`](lib/skills/carouselSkill.ts) — reusable carousel method

Representative registration:

```ts
const documentHost = document as Document & { modelContext?: unknown };
const detected = detectModelContext(documentHost, navigator);

if (detected.context) {
  await detected.context.registerTool(tool, {
    signal: controller.signal,
  });
}
```

## Run the sanitized judge demo

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev:demo
```

Open [http://127.0.0.1:4323](http://127.0.0.1:4323) in ChatGPT's in-app browser or a compatible Chrome WebMCP client.

Demo mode:

- reads only the generic records in `demo-seeds/`;
- writes to the ignored `.vibestudio-demo/` directory;
- never reads the creator's adjacent private project data;
- reports local AI integrations as disconnected;
- blocks live local-engine probing, server-side fetching, scraping, uploads, publishing, metrics sync, and the embedded assistant route.

No API key or login is required for the judge path.

## Verify

```bash
npm test
npm run typecheck
npm run build
npm audit --omit=dev
```

The local acceptance journey also verifies WebMCP discovery and real calls in ChatGPT's in-app browser. A judge can ask the agent:

1. “List the inspiration saved in VibeStudio.”
2. “Start a carousel Session from **A release visual that feels like a found artifact**. Make the hook direct and keep the found-artifact restraint.”
3. “Show me the bounded Template context used for this Session.”
4. “Change only slide 1 to make the hook shorter. Keep everything else.”
5. Confirm that the canvas, collaborator receipt, version, activity entry, and Undo update immediately.

The corresponding contextual tools are `inspire_list`, `session_start`, `template_context`, and `carousel_update`. The agent discovers them from the current page; the creator does not need to paste an API schema or use a second chat box.

## Existing foundation and challenge-period work

VibeStudio extends a pre-existing local Next.js content Studio. Before the submission period, that foundation already had JSONL content records, an advanced carousel editor and renderer, and a Codex image-generation bridge.

During the WebMCP Challenge submission period beginning August 25, 2026, the project added:

- the sanitized VibeStudio creator workspace and generic judge data;
- editable creator Template memory, source-linked taste signals, bounded context selection, and visible receipts;
- Session records with collaborator presence, versions, activity, idempotency, review handoff, and Undo;
- page-contextual `document.modelContext.registerTool` registration and creator-controlled capability toggles;
- Shared Attention pointing and multi-target context;
- the reusable `carousel-v1` skill contract and complete Codex-to-carousel WebMCP journey;
- public-demo privacy boundaries, regression tests, acceptance evidence, and the narrated demo composition.

The dated implementation record and before/after boundary are documented in [`docs/hackathon-build/build-notes.md`](docs/hackathon-build/build-notes.md), [`docs/hackathon-build/evidence/acceptance.md`](docs/hackathon-build/evidence/acceptance.md), and [`docs/hackathon-build/submission-handoff.md`](docs/hackathon-build/submission-handoff.md).

## Architecture

- Next.js 16 App Router, React 18, and TypeScript
- local append-friendly JSONL stores for creator, inspiration, Template, Session, receipt, and activity records
- strict input allowlists, length limits, idempotency keys, and optimistic version checks
- bounded WebMCP text results and annotations for read-only or untrusted external content
- deterministic carousel composition with optional generated text-free image layers

`render.yaml` contains a public demo service configuration with `VIBESTUDIO_DEMO_MODE=1`.

## Current scope

Carousel is the complete challenge workflow. Hero image, standalone post, video, overlay, and SVG production are planned as additional reusable skills. Automated publishing, live source monitoring, and multi-user accounts are intentionally outside this submission.

## License

[MIT](LICENSE)
