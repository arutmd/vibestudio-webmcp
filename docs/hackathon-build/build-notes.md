# Hackathon Build Notes

## 2026-08-30 - Guided build onboarding

### Working direction

- Build on the existing Arutlee Studio rather than replace it.
- Make bring-your-own-agent the WebMCP core.
- Optimize the challenge implementation and demo for Codex first. Preserve agent portability through clean WebMCP contracts, but do not spend challenge time proving multiple agents.
- Keep the Brain in Arutlee so brand identity, voice, taste, inspiration, and piece history persist independently of the chosen agent.
- Use a single challenge proof: Inspire -> discuss -> original carousel draft.
- Design for Palm first, then make the Brain profile and tool contracts reusable by another creator.

### Safety and autonomy

- The agent may inspect context, analyze inspiration, and create or revise drafts without repeated confirmation.
- Draft changes must be visible, logged, and reversible.
- Scheduling, publishing, destructive removal, and other consequential actions require explicit user approval.
- WebMCP tools should expose only the context required for the current creative task, not the entire personal Brain.

### Research reviewed

- OpenAI, "Build agent-ready sites with WebMCP": the agent is the customer of the tool interface; dogfood the tools, keep the set small, and make descriptions discoverable and precise.
- Google Cloud Tech, "Make your website agent ready with WebMCP": use page-contextual typed contracts so an agent can act efficiently while the person receives visual feedback.
- Greg Isenberg, "WebMCP: Let AI Agents pay you money": bring-your-own-agent preserves the user's preferred agent and context; browser-session state can determine which tools are available.
- Complete transcripts are stored under `docs/hackathon-build/research/youtube-transcripts/`.

### Active shaping

- Palm clarified that the product must work exceptionally well for him first while remaining structurally reusable by other creators.
- Palm accepted autonomous draft creation but asked for the safest recommended boundary.
- Palm delegated technical presentation depth and set the outcome bar: safe, working, meaningful, and beautiful.

### Open recommendation to confirm during Scope

- For the challenge, conversation should happen in ChatGPT or Codex beside the Studio. Arutlee does not need to implement a second chat box. A native in-app assistant can remain a later convenience.

## 2026-08-30 - Scope completed

### Product thesis

- Arutlee Studio is Palm's personal creator operating system, not a carousel generator or a replacement chat assistant.
- Arutlee owns the persistent creator Brain, content state, creative skills, visible workspace, and safety boundaries.
- Codex is the primary conversation and orchestration layer for the challenge.
- WebMCP connects Codex to small, page-contextual Studio capabilities.
- Each output type is backed by a reusable creative skill. Carousel is the first complete proof.

### Locked golden path

- Palm opens Codex beside Studio.
- He chooses one saved inspiration and states what he likes or dislikes.
- Codex records the taste signal, retrieves only relevant creator context, and creates a linked piece.
- Codex produces and revises an original seven-slide carousel in the visible Studio.
- The result persists as Draft or Ready, with visible and reversible changes.
- Publishing, scheduling, deletion, and other consequential actions remain approval-gated and outside the demo.

### Scope cuts

- No live monitoring or scraping across Instagram, Facebook, and TikTok for the challenge. Use a reliable prepared inspiration set.
- No complete hero-image, post, video, animation-overlay, or SVG skill implementation in this proof.
- No native in-app chat.
- No multi-user onboarding or account system.
- No broad agent-compatibility proof. Keep contracts portable but test Codex deeply.
- No real publishing or scheduling automation.
- No rebuild of the existing carousel engine or visual system.

### Time budget and acceptance

- Palm has no fixed number of available build hours and asked to be involved only for vital decisions and testing.
- The implementation must not depend on regular manual input from Palm.
- Essential checkpoints are taste direction, golden-path acceptance, and final demo approval.
- Definition of done: Codex completes the prepared Inspire to original carousel journey, visible Studio state updates correctly, the result persists after reload, and Palm can revise it without file editing or navigating the old pipeline.

### Interview record

- Mandatory scope beats completed: brain dump, reference reaction, time budget, ambiguity sharpening, and explicit scope cut.
- Deepening rounds: 0. Palm chose "write it" after the deepening-round offer.

### Active shaping

- Palm reframed the product around his real goal: becoming an internet personality without having to spend large amounts of time operating content tools.
- Palm said the product should become "this one page that the content creator needs to have" and should work through Codex or Claude rather than force a new interaction habit.
- Palm asked the agent to minimize questions while still bringing vital product decisions back to him because "we are really trying to win this."
- The earlier open recommendation is confirmed: Codex is the challenge interaction layer, while Studio remains the durable visible workspace.

## 2026-08-30 - Visual market scan and design bar

### New requirement

- Palm made beauty an explicit product requirement and referenced the OpenAI website as the quality bar.
- Design quality is part of the challenge proof, not a final polish pass.

### Current market findings

- The Devpost project gallery is not yet published, so there is no reliable view of competing challenge submissions.
- The strongest current references are OpenAI's hosted WebMCP showcase apps, Cloudflare's developer preview, commerce examples, and community demos.
- Across the best examples, the WebMCP layer stays visually quiet. One human artifact dominates, agent state is subtle, and edits land in the same visible workspace.
- A detailed comparison is saved in `docs/hackathon-build/research/webmcp-visual-market-scan.md`.

### Design decision

- Arutlee will pursue a **Quiet Creative OS** direction.
- Borrow OpenAI's restraint and near-monochrome shell, Margin's calm rail, Modeling Studio's artifact-first collaboration, and Paperie or WanderNote's editorial warmth.
- Do not clone OpenAI's brand identity.
- Keep Inspire image-led and curated.
- Keep the carousel or selected piece visually dominant.
- Keep WebMCP status subtle and hide the global tool catalog from normal use.
- Optimize the core experience for Codex and Studio side by side in a split desktop view.

## 2026-08-30 - PRD completed and product moat sharpened

### Product promise

- General-purpose models already generate copy and images. Arutlee's differentiated value is the persistent creator system around that capability.
- The challenge promise is: ChatGPT can create content; Arutlee helps it create content that remains consistently yours, gets faster with every piece, and leaves you in control of what it remembers.
- The PRD separates three responsibilities that must not collapse into one tool catalog:
  - **Brain:** creator-specific identity, audience, voice, taste, goals, examples, feedback, and rules.
  - **Skills:** creator-independent production methods such as carousel, hero image, post, video, and overlays.
  - **Workspace and WebMCP actions:** the visible artifacts, state, history, and contextual operations that connect an external agent to the Brain and skills.

### Memory behavior

- Palm must be able to see, add, edit, archive, restore, and remove durable Brain items.
- Explicit likes, dislikes, and notes become durable taste evidence because Palm intentionally provided them.
- Accepted revisions may create evidence-backed learned observations, but casual wording and one-off constraints must not silently become permanent rules.
- Every learned observation stays linked to its source piece or reaction and remains editable and reversible.
- Every generated piece stores a compact context receipt showing which memories, examples, goals, reaction, and skill version shaped it.
- Creative context requests expose only the smallest relevant Brain packet, never the unrestricted personal Brain.

### Golden-path behavior

- The PRD specifies the full Inspire -> reaction -> selective context -> original seven-slide carousel -> precise revision -> Ready -> reload -> memory review journey.
- It includes testable behaviors for agent readiness, tracked creators, source lineage, originality, persistence, failed generation, concurrent edits, duplicate requests, and safe refusal of unsupported actions.
- The product stops at Draft or Ready for the challenge. Publishing, scheduling, permanent deletion, and other consequential actions remain outside the exposed action surface.

### Interview record

- Mandatory PRD beats were already answered through the scope discussion and Palm's final product clarification, so no questions were repeated.
- Deepening rounds: 0 additional interview rounds. Palm explicitly asked the agent to minimize dependency on him and finish everything safe to finish while he was away.
- The complete requirements are stored in `docs/hackathon-build/prd.md`.

### Active shaping

- Palm clarified that memory cannot be merely hidden context. Memory editing and ongoing growth are central user-facing functions.
- Palm emphasized that individual creation tools are reproducible with ChatGPT, while Arutlee wins by making the overall experience faster, easier, and consistently personal over time.

## 2026-08-30 - Technical spec completed

### Architecture decisions

- Keep the existing Next.js, React, TypeScript, Tailwind, local JSONL, Codex CLI, image generation, and deterministic carousel renderer.
- Keep the challenge local-first. A public multi-user deployment would require a hosted data and authentication redesign and must never expose Palm's personal Brain.
- Use the current `document.modelContext.registerTool` WebMCP shape behind one isolated adapter, with progressive enhancement and an explicitly dated fallback for older preview builds if needed.
- Add creator, inspiration, Brain, context-receipt, and activity JSONL records without changing or deleting existing content data.
- Use deterministic, bounded context selection instead of embeddings or a vector database.
- Store one idea per Brain record with category, provenance, status, and source evidence.

### Bring-your-own-agent decision

- Codex, not a hidden second model, creates the structured carousel story in the challenge path.
- Arutlee returns a compact creator context packet and explicit carousel skill contract.
- Codex sends the seven-slide result back through `carousel_create`, and Arutlee validates, persists, visualizes, and renders it.
- Existing Claude-backed manual routes remain intact for the old Studio but do not prove the challenge thesis.
- Codex image generation remains available for text-free visual layers. The renderer owns final typography and brand layout.

### WebMCP tool design

- Register tools contextually for Inspire, Piece, or Brain views rather than exposing one global catalog.
- Bound descriptions, parameters, and outputs using current Chrome guidance.
- Mark external inspiration content untrusted and read operations read-only.
- Expose no publishing, scheduling, permanent deletion, arbitrary URL fetch, arbitrary filesystem path, or unrestricted Brain tool.
- Use idempotency keys, version checks, activity records, and undo for mutating actions.

### Demo reliability

- Generate at most three new visual layers by default and render the remaining slides deterministically.
- Preserve partial work and retry only failed slides.
- Use a dedicated challenge demo piece and never modify published records.
- The complete architecture, file map, API contracts, data lifecycle, security boundaries, tests, and demo proof are stored in `docs/hackathon-build/spec.md`.

### Interview record

- Mandatory technical questions were resolved from the existing codebase, Palm's Codex-first preference, the local-first product constraints, and Palm's request to own safe technical choices.
- Deepening rounds: 0 additional user rounds. The agent performed the architecture self-review directly and removed unnecessary database, vector-search, agent-SDK, hosted-auth, and second-chat complexity.

## 2026-08-30 - Autonomous build checklist completed

### Build preferences

- Palm handed plan ownership to Codex and asked to minimize dependency on him.
- Build mode is autonomous after the required visual target selection.
- The selected Product Design workflow requires one visual-choice pause before UI code changes. After that choice, run straight through the checklist and return for final acceptance.
- No Git repository was detected in Studio or its parent, so the build must use atomic edits, additive data, test fixtures, and documented checkpoints. Do not initialize Git without Palm's request.
- Real published content remains out of scope for mutation. Use an isolated challenge demo piece.

### Sequencing

- Design target first because interface code cannot begin without one.
- Data and memory foundations before APIs.
- Activity, idempotency, and undo before WebMCP mutations.
- Skill and piece contracts before tool registration.
- Contextual WebMCP before the final UI so the interface reflects real agent state.
- Inspire and Brain before the artifact workspace.
- Generation and persistence before final regression and submission evidence.

### Locked wow moment

- Palm gives Codex one inspiration and one taste reaction.
- Codex receives a bounded creator context packet and separate carousel skill.
- An original seven-slide carousel appears in the same visible Studio.
- One precise Codex revision updates one slide with visible undo.
- Reload proves persistence, then Palm inspects or edits what Arutlee learned.

### Checklist shape

- Twelve verifiable items cover visual selection, data, APIs, Brain, history, skill, WebMCP, Inspire, Piece workspace, generation, full acceptance, and Devpost handoff.
- Deepening rounds: 0. Palm chose autonomous ownership and straight-through execution, with only the visual-selection checkpoint retained because it materially determines the product.
- The complete contract is stored in `docs/hackathon-build/checklist.md`.

## 2026-08-31 - Visual target selected and locked

### Selection

- Palm selected `1+2`: combine the curated, usable inspiration gallery from direction 1 with the artifact-first source-to-memory-to-skill clarity from direction 2.
- A single merged ImageGen target was generated from both selected references and the current Studio.
- The authoritative source is `docs/hackathon-build/design/selected-visual-target.png` with its implementation lock in `docs/hackathon-build/design/selected-visual-target.md`.

### Verification

- The merged image was opened at full size from its project path.
- It preserves the Quiet Creative OS, makes the selected source dominant, keeps WebMCP visually quiet, shows editable memory separately from the carousel skill, and remains structured for a split desktop view.
- No interface code changed before Palm's selection.

## 2026-08-31 - Build completed and accepted

### Implemented product

- Added additive creator, inspiration, Brain, context-receipt, activity, and seed records without changing existing published content.
- Added the reusable `carousel-v1@1.0.0` contract, seven-slide challenge piece path, versioned single-slide revision, Draft or Ready state, careful learning, finish, and safe undo.
- Registered contextual current-API WebMCP sets for Inspire, Piece, and Brain with bounded output, read and untrusted annotations, cleanup, and no publish, scheduling, delete, arbitrary URL, path, shell, or unrestricted Brain access.
- Replaced the exposed pipeline with the selected Quiet Creative OS: session rail, curated Inspiration, creator manager, editable Brain, and artifact-first carousel workspace. The advanced legacy editor remains collapsed below the new primary experience.

### Live Codex proof

- Explicit taste reaction produced one editable record, `brain-20260831-017`.
- Codex created `field-note-20260831-001` from `context-20260831-001` and inspiration `inspiration-20260831-001`.
- Codex revised only slide 4; the visible undo restored it. A stale edit and a repeated undo were refused.
- Draft or Ready changes persisted, and repeated Ready transitions produced one source-linked learning: `brain-20260831-018`.
- The learned memory was accepted and edited through WebMCP. `context-20260831-006` proves the edited, piece-specific learning reaches the next bounded context packet.
- The actual `carousel_finish` WebMCP action generated three text-free layers and rendered seven 1080 × 1350 PNGs under `pieces/field-note-20260831-001/carousel/20260831-100900`.

### Verification result

- Seed installation stayed idempotent at 11 creators, 6 inspirations, and 18 Brain records.
- Duplicate carousel creation returned the existing piece; no duplicate was written.
- All 24 test files passed, TypeScript passed, and the production build passed.
- Browser verification passed at 1439 × 1024 and 909 × 1024 with no horizontal document overflow and a clean console.
- The selected visual target and final Inspire capture were judged together in `docs/hackathon-build/evidence/design-qa-comparison.png`; `design-qa.md` records `final result: passed`.
- `npm audit --omit=dev` reports four high-severity upstream dependency advisories whose complete Next.js fix is a breaking major upgrade. The challenge build remains local-only until that upgrade and a fresh regression pass.

## 2026-09-03 - Public judge package and dependency blocker resolved

### Naming and submission boundary

- The public product name is VibeStudio. User-facing Brain and Piece terminology became editable Template and Session terminology while the underlying record names remain stable for compatibility.
- The README and submission handoff now separate the pre-existing local Studio foundation from the WebMCP, memory, collaboration, demo-safety, and evidence work added during the submission period.
- The public-repository boundary excludes Palm's private `data-seeds/`, `.env.local`, local Devpost/workflow state, generated demo data, build caches, voice files, rendered videos, and machine-specific launch helpers. Only generic `demo-seeds/` are part of the judge path.

### Public demo hardening

- Added isolated demo-mode data and blocked external fetching, scraping, uploads, publishing, metrics sync, embedded-assistant calls, and live local-engine probing.
- Demo `/api/status` reports Anthropic, Codex, Buffer, and webhook integrations disconnected even when the local machine has them configured.
- Bounded dynamic filesystem tracing around local Codex, Chrome, and optional profile-image paths; the production build now completes without the previous whole-workspace tracing warnings.
- A production-mode rehearsal loaded the app and generic inspiration data, while `/api/status/ping` and `/api/fetch` returned HTTP 403.

### Verification

- Upgraded to Next.js 16.3.4. The earlier dependency-audit blocker recorded above is resolved: `npm audit --omit=dev` now reports zero vulnerabilities.
- All 36 local test files pass, TypeScript checking passes, and the production build passes.
- ChatGPT's in-app browser discovered and called VibeStudio's contextual WebMCP tools, started a connected Session, read a bounded ten-rule Template receipt, changed only slide 1, and showed Codex attribution, review state, version 2, and Undo.
- The 78.057-second narrated demo composition passes HyperFrames lint, runtime, layout, motion, and 45/45 WCAG AA contrast checks. The real connected workspace now appears at 7.3 seconds, within the organizers' recommended first 10–15 seconds.

### Remaining approval-gated release work

- Render and inspect the final MP4.
- Create and verify the public repository and live demo.
- Upload the video publicly to YouTube.
- Create the Devpost project and draft, then wait for Palm's explicit final submission approval.

### Handoff

- Acceptance evidence: `docs/hackathon-build/evidence/acceptance.md`.
- Submission story and demo: `docs/hackathon-build/submission-handoff.md`.
- Next workflow: `prepare-submission`. Submission itself still requires Palm's explicit review and approval.
