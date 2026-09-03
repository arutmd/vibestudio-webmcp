# Build Checklist

## Build Preferences

- **Plan ownership:** Handed off to Codex. Palm asked to minimize dependency on him and make safe technical choices autonomously.
- **Build mode:** Autonomous after the visual target is selected.
- **Comprehension checks:** N/A. Record decisions and evidence in `build-notes.md` instead of pausing to teach each implementation detail.
- **Git:** No Git repository is present in `studio/` or its parent. Do not initialize one without Palm's request. Use atomic file edits, additive data changes, existing test fixtures, and checklist checkpoints. Never delete or rewrite real published content.
- **Verification:** One required visual-selection pause before UI implementation, then no interim look-at-it pauses. Complete unit, route, browser, visual-comparison, and Codex acceptance before the final handoff.
- **Check-in cadence:** Speed-run with concise progress updates. Stop only for a genuinely consequential user decision, new authority, or a blocker that cannot be resolved safely.
- **Build data:** Use prepared seed records and an isolated hackathon demo piece. Do not modify real published Arutlee pieces.

## Wow Moment

Palm gives Codex one saved inspiration and one natural-language taste reaction. Codex retrieves only the relevant creator Brain and carousel skill, then creates an original seven-slide carousel inside the same visible Studio. Palm revises one slide through Codex, sees the change and undo history immediately, reloads the page, and then edits the new memory Arutlee learned from the work.

The submission must make the distinction unmistakable: general models generate content, while Arutlee provides the editable memory, repeatable skills, consistency, persistence, lineage, and safety that make generation useful over time.

## Checklist

- [x] **1. Select and lock the visual target**
  Spec ref: `spec.md > Architecture > Interface architecture`
  What to build: Capture the existing Studio and the selected OpenAI, Margin, Modeling Studio, Paperie, and WanderNote references. Generate exactly three grounded desktop design directions at 1440 x 1024. Palm selects one. Save the chosen image and a short implementation note as the visual source of truth. Do not change interface code before the selection.
  Acceptance: The chosen direction preserves the Quiet Creative OS, makes the inspiration or carousel artifact dominant, keeps WebMCP visually quiet, supports a split desktop view, and retains Arutlee's public visual identity inside content previews.
  Verify: Display all three generated directions exactly once, record Palm's selection, and confirm the selected source image can be opened at full size.

- [x] **2. Add compatible creator, inspiration, Brain, receipt, and activity records**
  Spec ref: `spec.md > Architecture > Inspiration store`, `Creator Brain`, `Context selector and receipts`, `Activity and undo`
  What to build: Extend `lib/types.ts` and `lib/paths.ts` with the new optional domains. Add validation helpers and additive JSONL seed files. Curate concise Palm Brain entries from the existing brand, voice, slop, engine-decision, and published-example sources. Seed the known tracked-creator list and a reliable prepared inspiration set using real available assets or honest missing-media states.
  Acceptance: Existing inbox and piece rows still parse; every Brain item contains one editable idea with provenance; no source document is dumped wholesale; seed installation is idempotent; no published content is changed.
  Verify: Run focused schema and seed tests, compare line counts before and after a second seed run, and inspect one record from each new domain.

- [x] **3. Build Inspiration and creator APIs**
  Spec ref: `spec.md > API Contracts > GET /api/inspirations`, `PATCH /api/inspirations/:id`
  What to build: Add list, inspect, add, react, pause, restore, and archive routes with strict allowlists, enum checks, length caps, and clear errors. A reaction must upsert its linked Brain taste evidence without creating contradictory duplicates.
  Acceptance: Like, dislike, clear, and note edits persist after reload; creators can be active or paused without deleting saved references; invalid and duplicate records receive actionable errors; missing media remains honest.
  Verify: Run route tests against temporary JSONL files, then exercise like, dislike, clear, pause, and restore through the running Studio API.

- [x] **4. Build the editable Brain and bounded context receipts**
  Spec ref: `spec.md > Architecture > Creator Brain`, `Context selector and receipts`
  What to build: Add Brain list, add, edit, archive, restore, and context routes. Implement deterministic selection for identity, audience, goals, voice, relevant taste, rules, and at most two examples. Persist exact context receipts and bound the agent-facing summary to roughly 1,500 characters.
  Acceptance: Palm can understand and edit every visible memory; archived records disappear from new context; direct feedback and proposed learning are visually and structurally distinct; a creative request never returns the unrestricted personal Brain.
  Verify: Unit-test selection and exclusion rules, edit one demo Brain item, create a new receipt, and confirm the receipt references the changed item and excludes archived or unrelated items.

- [x] **5. Add activity history, idempotency, versions, and undo**
  Spec ref: `spec.md > Architecture > Activity and undo`
  What to build: Create activity helpers and APIs that wrap every mutating WebMCP action. Store concise before and after slices, expected versions, idempotency keys, actor, and reversible state. Add safe undo with conflict detection.
  Acceptance: Retrying a mutating tool with the same idempotency key does not duplicate a piece or reaction; stale agent edits cannot overwrite newer human work; every reversible action can be inspected and undone once.
  Verify: Unit-test duplicate requests, stale versions, successful undo, repeated undo, and a deliberate conflict that preserves the current human edit.

- [x] **6. Make the carousel a creator-independent skill and extend pieces safely**
  Spec ref: `spec.md > Architecture > Carousel skill`, `Piece extensions`
  What to build: Add the versioned `carousel-v1` contract for exactly seven slides, source transformation, voice, originality, visual strategy, and 1080 x 1350 output. Extend piece creation and patch allowlists with inspiration lineage, skill version, context receipt, transformation note, operation progress, and version. Reuse existing carousel normalization and renderer code.
  Acceptance: The skill contains no Palm-specific identity; a valid external-agent result creates one linked Draft with exactly seven slides; invalid receipt, slide count, field length, or status is rejected; old pieces remain compatible.
  Verify: Add skill and route tests for valid creation, malformed slides, mismatched receipt, duplicate creation, old-row compatibility, and Draft or Ready status mapping.

- [x] **7. Register small contextual WebMCP tool sets**
  Spec ref: `spec.md > Architecture > WebMCP adapter and contextual registration`
  What to build: Add a single current-API adapter using `document.modelContext.registerTool`, AbortController cleanup, cancellation propagation, bounded string results, annotations, and an explicitly isolated legacy preview fallback. Register only the Inspire, Piece, or Brain tools relevant to the current view.
  Acceptance: Read tools use `readOnlyHint`; external-source results use `untrustedContentHint`; tool names and descriptions stay within current guidance; changing views unregisters obsolete tools; no publishing, scheduling, delete, arbitrary URL, path, shell, or full-Brain tool exists.
  Verify: Unit-test definitions and feature detection, inspect current registrations in a compatible session, switch between Inspire, Piece, and Brain, and confirm the tool set changes without duplicates.

- [x] **8. Build the selected Inspire and Brain experience**
  Spec ref: `spec.md > Architecture > Interface architecture`, `prd.md > Epic 2`, `Epic 3`, `Epic 7`
  What to build: Implement the selected design's calm shell, session rail, image-led Inspire view, reference detail, reaction controls, creator manager, Brain categories, Recent Learning, and subtle Codex readiness. Use real icons and available source assets. Keep technical schemas out of normal use.
  Acceptance: The source image dominates Inspire; like or dislike and a short note are local and obvious; creator pause and restore are understandable; Brain entries are readable and editable; the interface remains usable beside Codex without horizontal scrolling.
  Verify: Compare a running screenshot with the chosen design target at the same viewport, fix visible hierarchy, spacing, typography, crop, border, and responsive differences, then repeat the combined comparison.

- [x] **9. Build the artifact-first carousel workspace**
  Spec ref: `spec.md > Architecture > UI synchronization`, `Interface architecture`, `prd.md > Epic 5`, `Epic 7`
  What to build: Add the selected design's carousel canvas, compact slide navigation, source lineage, context receipt, activity trail, undo, Draft or Ready state, and operation progress. Reuse the existing advanced carousel editor under a collapsed details area rather than exposing the old pipeline.
  Acceptance: A WebMCP-created piece becomes selected immediately; the carousel is visually dominant; a slide-specific change affects only that slide; prior versions remain recoverable; source, applied memories, agent action, and current status are inspectable without permanently competing with the artifact.
  Verify: Create a demo piece through the API, update one slide, undo it, switch status twice, reload, and compare full and split-width screenshots against the chosen target.

- [x] **10. Complete visual generation, rendering, and careful learning**
  Spec ref: `spec.md > Data Flow > Golden path lifecycle`, `AI Usage`, `Risks And Verification > Long image-generation time`
  What to build: Connect `carousel_finish` to the existing Codex image-generation bridge and renderer. Generate at most three required visual layers by default, update visible progress, preserve partial work, retry only failed slides, and produce seven final PNGs. On Ready or accepted revision, create at most one evidence-backed proposed learning item linked to its source.
  Acceptance: A complete deck exports seven ordered 1080 x 1350 slides; generated layers contain no embedded text; a failed visual does not erase the story or successful slides; proposed learning is traceable, editable, archivable, and excluded when archived.
  Verify: Render the isolated demo piece, inspect all seven actual PNGs, force one targeted failure and recovery, reload, and confirm the final paths, Ready state, receipt, activity, and proposed learning persist.

- [x] **11. Run full regression, WebMCP, visual, and safety acceptance**
  Spec ref: `spec.md > Test Plan`, `prd.md > Definition Of Done`
  What to build: Finish missing tests and run the complete existing and new verification suite. Execute the golden path through Codex in a compatible in-app browser, not only through direct requests. Test the current browser state at full and split widths and compare the implementation with the selected design source.
  Acceptance: Local tests, typecheck, and production build pass; the browser console is clean; Codex discovers and calls contextual tools; visible state updates and persists; memory editing changes future context; unsafe actions and unrestricted Brain access are absent; no real published content changed.
  Verify: Run `npm test`, `npm run typecheck`, and `npm run build`; save test evidence, final screenshots, tool-discovery proof, activity IDs, receipt ID, piece ID, render directory, reload result, and the explicit unsafe-action refusal.

- [x] **12. Prepare Devpost handoff**
  Spec ref: `prd.md > Submission Proof Points`, `spec.md > Demo And Submission Flow`
  What to build: Gather the product story, before and after screenshots, selected visual target, current market comparison, architecture explanation, WebMCP source excerpts, test evidence, final carousel assets, demo script, setup instructions, repo or source-package status, and clear list of what existed before versus what the challenge added.
  Acceptance: The handoff proves bring-your-own-agent, contextual tools, editable memory, separate reusable skill, original transformation, visible revision, persistence, safety, and finished product quality without claiming unverified deployment or submission.
  Verify: Review every submission proof point against captured evidence, confirm no secret or personal Brain data is included, and confirm the next command is `prepare-submission`.
