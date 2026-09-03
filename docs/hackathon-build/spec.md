# Technical Spec

## Overview

Arutlee Studio will remain a local-first Next.js application backed by the existing JSONL content system. The challenge build adds a creator-memory layer, prepared inspiration data, contextual WebMCP tools, and a simplified artifact-first interface around the carousel engine that already works.

The key architecture decision is that Arutlee does not need a second hidden text model to prove its value. Codex is the reasoning and generation layer in the golden path. Arutlee gives Codex a compact, creator-specific context packet and a versioned carousel skill, accepts structured content back through WebMCP, persists it, generates visual layers where useful, and renders the branded artifact.

This keeps the responsibilities honest:

- **Codex:** conversation, interpretation, planning, and draft generation.
- **Arutlee Brain:** durable creator identity, voice, taste, goals, examples, and rules.
- **Arutlee skills:** reusable output procedures and validation contracts.
- **Arutlee workspace:** inspiration, pieces, previews, activity, history, and state.
- **WebMCP:** a contextual bridge that lets Codex read and safely change that workspace.

The existing Studio remains the implementation foundation. The build extends it rather than creating a second prototype or replacing the carousel system.

## Technical Decisions

### Stack

Keep the existing stack:

- Next.js 14 App Router
- React 18
- TypeScript 5.6 in strict mode
- Tailwind CSS 3.4 plus the existing semantic design tokens
- Node.js route handlers for local persistence and generation jobs
- JSONL files under the parent project's `data/` directory
- existing atomic rewrite and per-file serialization in `lib/jsonl.ts`
- existing Codex CLI and image-generation bridge
- existing HTML-to-PNG carousel renderer

Add only one small development dependency if needed:

- [`webmcp-types`](https://www.npmjs.com/package/webmcp-types) for current WebMCP TypeScript declarations, as recommended by the Chrome WebMCP documentation.

Do not add a database, authentication framework, state library, vector database, component framework, or separate agent SDK for the challenge proof.

### Runtime and deployment

The complete challenge path runs locally on Palm's Mac at port 4321. This is the safest fit for the current filesystem data, Codex CLI authentication, generated assets, and personal Brain.

The application progressively enhances when WebMCP is available:

- normal viewing and manual Brain editing work in any modern browser;
- contextual agent actions register when `document.modelContext` is available;
- a dated legacy adapter may check `navigator.modelContext` only for compatibility with earlier preview builds;
- no polyfill should pretend that WebMCP is active when it is not.

The current WebMCP Community Group draft and Chrome documentation use `document.modelContext.registerTool`. The API is experimental and must be isolated behind one adapter so a standards change does not spread across the product.

Primary references:

- [WebMCP Community Group draft](https://webmachinelearning.github.io/webmcp/)
- [Chrome WebMCP Imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [Chrome WebMCP tool security](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
- [Chrome workflow design guidance](https://developer.chrome.com/docs/ai/webmcp/build-tools)
- [OpenAI WebMCP showcase](https://developers.openai.com/showcase?view=webmcp-apps)

A public multi-user deployment is not part of this build. It would require replacing local filesystem access and local CLI auth with a hosted data store, user authentication, per-user asset storage, and hosted generation credentials. A later safe demo deployment can use a separate synthetic dataset, never Palm's personal Brain.

## Architecture

### 1. Existing content foundation

Implements: `prd.md > Epic 1`, `Epic 4`, `Epic 5`

Reuse these working systems:

- `data/inbox.jsonl` and `data/pieces.jsonl`
- `lib/jsonl.ts` atomic persistence and locking
- `app/api/pieces/*` piece creation and mutation
- `app/api/ai/carousel/*` existing carousel story and visual routes as manual fallbacks
- `lib/carousel.ts` slide normalization and visual prompts
- `lib/codexImage.ts` Codex image-generation bridge
- `lib/carouselRenderer.ts` deterministic branded 1080 x 1350 rendering
- `components/sections/CarouselEditor.tsx` editable slide behavior
- `lib/useStudio.ts` refresh, persistence, and operation state

The new challenge UI should call the same persistence and renderer services. It must not fork a second content store or create carousel assets that the existing Studio cannot read.

### 2. Inspiration store

Implements: `prd.md > Epic 2`, `Epic 6.1`

Add two JSONL files:

#### `data/creators.jsonl`

```ts
type CreatorRecord = {
  id: string;
  created_at: string;
  updated_at?: string;
  platform: "instagram" | "facebook" | "tiktok" | "youtube" | "web";
  handle: string;
  display_name: string;
  profile_url: string | null;
  status: "active" | "paused" | "archived";
  note: string;
};
```

#### `data/inspirations.jsonl`

```ts
type InspirationRecord = {
  id: string;
  created_at: string;
  updated_at?: string;
  creator_id: string | null;
  platform: CreatorRecord["platform"];
  source_url: string | null;
  media_kind: "image" | "video_still" | "carousel" | "text" | "unavailable";
  media_path: string | null;
  title: string;
  caption: string;
  transcript: string;
  saved_reason: string;
  status: "saved" | "archived";
  reaction: "like" | "dislike" | "none";
  reaction_note: string;
};
```

The demo seed should reuse real local source assets that already exist in Arutlee where appropriate. A missing social screenshot must render as an honest unavailable state rather than a fabricated source post. External captions and transcripts are untrusted content.

No automatic scraping or platform login is added. The tracked-creator model and prepared records prove the experience without making the demo depend on social-platform availability.

### 3. Creator Brain

Implements: `prd.md > Epic 3`, `Epic 6.2`

Add `data/brain.jsonl` as the durable, creator-specific memory store.

```ts
type BrainCategory =
  | "identity"
  | "audience"
  | "voice"
  | "visual_taste"
  | "content_goal"
  | "production_rule"
  | "example"
  | "learning";

type BrainRecord = {
  id: string;
  created_at: string;
  updated_at?: string;
  category: BrainCategory;
  text: string;
  tags: string[];
  status: "active" | "proposed" | "archived";
  authored_by: "palm" | "arutlee";
  source_type:
    | "brand_doc"
    | "direct_edit"
    | "inspiration_reaction"
    | "accepted_revision"
    | "published_example";
  source_id: string | null;
  supersedes_id?: string | null;
};
```

Important behavior:

- direct edits and explicit likes or dislikes create active records;
- accepted revisions may create proposed `learning` records;
- one-off piece instructions stay on the piece and do not enter the Brain automatically;
- editing creates a traceable revision or superseding record rather than erasing provenance;
- removal defaults to `archived`, which is recoverable;
- the API never returns every Brain record to a creative tool by default.

Seed the Brain with a concise, curated set distilled from existing authoritative sources:

- `brand/00-master.md`
- `03-content-pillars-and-series.md`
- `17-no-slop-test.md`
- `22-engine-redesign-decisions.md`
- approved published examples in `data/pieces.jsonl`

Do not copy entire documents into Brain rows. Each row should contain one reusable fact or rule that can be individually understood and edited.

### 4. Context selector and receipts

Implements: `prd.md > Story 3.4`, `Epic 4`

Add a deterministic context selector. No embeddings or vector database are required.

Inputs:

```ts
type ContextRequest = {
  purpose: "carousel_create" | "carousel_revise";
  inspiration_id?: string;
  piece_id?: string;
  skill_id: "carousel-v1";
};
```

Selection rules:

1. Always include active identity, audience, and current content-goal entries.
2. Include voice and production rules tagged for the requested skill or platform.
3. Include visual-taste entries that share tags with the selected inspiration or piece.
4. Include at most two approved examples relevant to the output.
5. Include the selected inspiration reaction and transformation note.
6. Exclude archived items, unrelated personal knowledge, and external source instructions.
7. Cap the tool response at roughly 1,500 characters.

Add `data/context-receipts.jsonl`:

```ts
type ContextReceipt = {
  id: string;
  created_at: string;
  purpose: ContextRequest["purpose"];
  inspiration_id: string | null;
  piece_id: string | null;
  skill_id: string;
  skill_version: string;
  brain_ids: string[];
  example_piece_ids: string[];
  summary: string;
};
```

The WebMCP response returns the concise summary plus referenced IDs. The full receipt remains in Studio for inspection. This keeps agent context small while making generation explainable.

### 5. Carousel skill

Implements: `prd.md > Epic 4`

Move the reusable procedure into an explicit skill definition while reusing existing code.

```ts
type CreativeSkill = {
  id: "carousel-v1";
  version: "1.0.0";
  title: "Original seven-slide carousel";
  purpose: string;
  input_contract: string[];
  output_contract: {
    slide_count: 7;
    dimensions: "1080x1350";
    fields: string[];
  };
  quality_rules: string[];
};
```

The skill specifies:

- exactly seven slides for the challenge journey;
- cover, five interior beats, and takeaway;
- one idea per slide;
- source transformation instead of imitation;
- Arutlee voice and firewall checks;
- no embedded text in generated visual layers;
- deterministic typography and layout in the renderer;
- a maximum of three freshly generated visual layers by default, with typography, source artifacts, or deterministic treatment for remaining slides;
- one coherent visual world across the deck.

The external Codex agent writes the structured story after receiving the context packet and skill contract. The `carousel_create` tool validates and saves that structured output. It should not secretly ask a second model to rewrite the same content.

The existing Claude-backed carousel route remains available to the old manual workbench but is not the challenge's proof of bring-your-own-agent behavior.

### 6. Piece extensions

Implements: `prd.md > Epic 1`, `Epic 5`, `Epic 6`

Extend `PieceRecord` with optional fields so old JSONL rows remain valid:

```ts
type PieceRecord = ExistingPieceRecord & {
  inspiration_id?: string;
  skill_id?: "carousel-v1";
  skill_version?: string;
  context_receipt_id?: string;
  transformation_note?: string;
  current_version?: number;
  operation?: {
    name: string;
    status: "working" | "needs_review" | "saved" | "error";
    progress?: { completed: number; total: number };
    message?: string;
    updated_at: string;
  };
};
```

Do not rename existing status values on disk. The UI maps:

- `idea` and `draft` to Draft
- `qa_passed` to Ready
- `scheduled` to Scheduled
- `published` to Live

The challenge WebMCP tool may only set `draft` or `qa_passed`.

### 7. Activity and undo

Implements: `prd.md > Epic 5`, `Epic 6.2`

Add `data/activity.jsonl`:

```ts
type ActivityRecord = {
  id: string;
  created_at: string;
  actor: "palm" | "codex" | "system";
  entity_type: "piece" | "slide" | "brain" | "inspiration";
  entity_id: string;
  action: string;
  summary: string;
  before: unknown | null;
  after: unknown | null;
  idempotency_key: string | null;
  reversible: boolean;
  undone_at?: string | null;
};
```

Rules:

- every mutating WebMCP action creates one concise activity record;
- `before` and `after` contain only the changed entity slice, not the entire dataset;
- duplicate idempotency keys return the existing result rather than creating another piece;
- undo applies the saved `before` value through the same validation layer;
- failed operations create a visible error state but no misleading success record;
- publishing, scheduling, and permanent deletion never enter this action surface.

### 8. WebMCP adapter and contextual registration

Implements: `prd.md > WebMCP Action Model`

Create a single client adapter around the experimental API. It owns feature detection, TypeScript compatibility, registration cleanup, cancellation, annotations, and UI refresh events.

The current standard shape is:

```ts
const controller = new AbortController();

await document.modelContext.registerTool(
  {
    name: "inspire_list",
    title: "List inspiration",
    description: "List saved inspiration visible in Arutlee's current Inspire view.",
    inputSchema: { type: "object", properties: {} },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: true,
    },
    execute: async (_input, { signal }) => {
      return fetchBoundedResult("/api/inspirations", { signal });
    },
  },
  { signal: controller.signal },
);
```

Use `AbortController` cleanup whenever the room, selected inspiration, selected piece, or Brain view changes. The tool set must match the current human context.

#### Inspire context tools

1. `inspire_list`
   - read-only
   - returns compact IDs, creators, titles, reactions, and selection state
   - marks output as untrusted because it contains external-source text

2. `inspire_open`
   - changes only the visible selected inspiration
   - rejects IDs not present in the prepared dataset

3. `inspire_react`
   - inputs: inspiration ID, `like | dislike | none`, optional note, idempotency key
   - persists the reaction and corresponding Brain evidence

4. `brain_context`
   - read-only
   - inputs: purpose, inspiration ID, skill ID
   - returns the bounded context summary and receipt ID

5. `carousel_create`
   - inputs: inspiration ID, receipt ID, title, body, exactly seven structured slides, transformation note, idempotency key
   - validates, creates a Draft, logs activity, selects the new piece, and returns its ID

#### Piece context tools

1. `carousel_read`
   - read-only
   - returns current slide copy, visual state, receipt ID, and source lineage

2. `brain_context`
   - read-only
   - inputs: `carousel_revise`, current piece ID, skill ID

3. `carousel_update`
   - inputs: piece ID, slide index, optional title, body, visual cue, reason, idempotency key
   - changes only the named slide and logs a reversible activity record

4. `carousel_finish`
   - inputs: piece ID and idempotency key
   - generates only missing required visual layers, then renders the seven final slides
   - reports progress in the visible piece operation state
   - respects cancellation signals where the underlying request supports them

5. `piece_status`
   - inputs: piece ID and `draft | ready`
   - maps safely to `draft | qa_passed`

6. `piece_undo`
   - inputs: activity ID
   - restores the last reversible change for the selected piece

#### Brain context tools

1. `brain_list`
   - read-only
   - filters by category, status, or search term

2. `brain_edit`
   - inputs: action `add | edit | archive | restore`, record ID when required, category, text, tags, idempotency key
   - never accepts arbitrary file paths or unrestricted document access

The default human UI shows only a readiness state, not these schemas or a tool counter.

### 9. UI synchronization

Implements: `prd.md > Story 5.1`

WebMCP executions run in the same page but may sit outside React component callbacks. After a successful mutation, the adapter dispatches a typed browser event:

```ts
window.dispatchEvent(
  new CustomEvent("arutlee:data-changed", {
    detail: { entity: "piece", id: pieceId },
  }),
);
```

`useStudio` listens for this event and runs a targeted refresh or `refreshAll`. The newly created or changed entity becomes selected when appropriate. This ensures Codex and Palm always see the same persisted state.

Do not maintain a hidden WebMCP-only state store.

### 10. Interface architecture

Implements: `prd.md > Epic 1`, `Epic 2`, `Epic 3`, `Epic 7`

Keep the existing top-level rooms:

- Pieces
- Desk

Within Pieces, add three view states:

- Inspire
- selected Piece
- Brain drawer or focused Brain view

The selected visual direction will determine exact layout, spacing, imagery, and control placement. The technical component boundaries should support:

- `StudioShell`: application frame, current room, agent readiness
- `SessionRail`: Draft, Ready, Scheduled, and Live groups
- `InspireView`: curated visual feed and creator management
- `InspirationDetail`: source, reaction, note, and start-piece affordance
- `PieceWorkspace`: artifact-first carousel review and slide selection
- `ContextReceipt`: why the piece looks and sounds this way
- `ActivityTrail`: visible actions and undo
- `BrainPanel`: readable and editable memory categories
- existing `CarouselEditor` and renderer services beneath the simplified experience

The old pipeline components remain available during migration but must not appear in the normal challenge path.

## File Structure

Existing files are marked `reuse`; new or materially changed files are marked `add` or `change`.

```text
studio/
├── app/
│   ├── page.tsx                              # change: view routing and selected context
│   ├── globals.css                           # change after a visual target is selected
│   └── api/
│       ├── inspirations/
│       │   ├── route.ts                      # add: list and create prepared inspiration
│       │   └── [id]/route.ts                 # add: inspect, react, archive
│       ├── creators/
│       │   ├── route.ts                      # add: list and add tracked creators
│       │   └── [id]/route.ts                 # add: pause, restore, archive
│       ├── brain/
│       │   ├── route.ts                      # add: list and add Brain records
│       │   ├── [id]/route.ts                 # add: edit, archive, restore
│       │   └── context/route.ts              # add: bounded selection and receipt
│       ├── activity/
│       │   ├── route.ts                      # add: list activity for current entity
│       │   └── [id]/undo/route.ts            # add: validated undo
│       ├── pieces/route.ts                    # change: accept lineage and skill fields
│       ├── pieces/[id]/route.ts               # change: validate new optional fields
│       ├── carousel/render/route.ts            # reuse
│       └── ai/carousel-background/route.ts     # reuse, add operation/activity hooks
├── components/
│   ├── StudioShell.tsx                       # add
│   ├── SessionRail.tsx                       # add or replace PieceRail
│   ├── InspireView.tsx                       # add
│   ├── InspirationDetail.tsx                 # add
│   ├── CreatorManager.tsx                    # add
│   ├── PieceWorkspace.tsx                    # add
│   ├── CarouselCanvas.tsx                    # add, reuses carousel data and previews
│   ├── ContextReceipt.tsx                    # add
│   ├── ActivityTrail.tsx                     # add
│   ├── BrainPanel.tsx                        # add
│   ├── AgentStatus.tsx                       # add
│   ├── PieceRail.tsx                         # reuse during migration
│   └── sections/CarouselEditor.tsx           # reuse production controls under details
├── lib/
│   ├── types.ts                              # change: new records and Piece extensions
│   ├── paths.ts                              # change: register new JSONL files
│   ├── jsonl.ts                              # reuse atomic persistence
│   ├── inspiration.ts                        # add: validation and prepared seed logic
│   ├── brain.ts                              # add: validation and revision behavior
│   ├── contextSelector.ts                    # add: deterministic bounded retrieval
│   ├── activity.ts                           # add: mutation log, idempotency, undo
│   ├── skills/
│   │   └── carouselSkill.ts                  # add: creator-independent skill contract
│   ├── webmcp/
│   │   ├── types.ts                          # add: current plus dated legacy adapter types
│   │   ├── adapter.ts                        # add: feature detection and registration
│   │   ├── tools.ts                          # add: schemas and bounded response helpers
│   │   └── useArutleeWebMCP.ts               # add: contextual React lifecycle
│   ├── useStudio.ts                          # change: new data and refresh event listener
│   ├── carousel.ts                           # reuse normalization and visual prompts
│   ├── codexImage.ts                         # reuse Codex image generation
│   └── carouselRenderer.ts                   # reuse deterministic branded rendering
├── data-seeds/
│   ├── creators.jsonl                        # add: challenge creator list
│   ├── inspirations.jsonl                    # add: prepared reliable references
│   └── brain.jsonl                           # add: curated Palm Brain seed
├── docs/hackathon-build/                     # existing planning and evidence
└── package.json                              # change only if adding webmcp-types

../data/
├── inbox.jsonl                               # existing
├── pieces.jsonl                              # existing and extended compatibly
├── feedback.jsonl                            # existing revision evidence
├── creators.jsonl                            # add
├── inspirations.jsonl                        # add
├── brain.jsonl                               # add
├── context-receipts.jsonl                    # add
└── activity.jsonl                            # add
```

## API Contracts

### `GET /api/inspirations`

Query:

- optional `status=saved|archived`
- optional `creator_id`
- optional `reaction=like|dislike|none`

Response:

```json
{"records": [{"id":"inspiration-...","title":"...","creator":{},"reaction":"like"}]}
```

The WebMCP adapter further compresses this response before returning it to Codex.

### `PATCH /api/inspirations/:id`

Allowed fields:

- `reaction`
- `reaction_note`
- `status`

Server behavior:

- validates enum and string lengths;
- updates the corresponding inspiration reaction Brain record;
- records one activity entry;
- returns the updated record and activity ID.

### `GET /api/brain`

Query:

- optional `category`
- optional `status`
- optional `q`

Response contains readable Brain records only. It never includes arbitrary source-document contents.

### `POST /api/brain/context`

Request:

```json
{
  "purpose": "carousel_create",
  "inspiration_id": "inspiration-20260830-001",
  "skill_id": "carousel-v1"
}
```

Response:

```json
{
  "receipt_id": "context-20260830-001",
  "summary": "Audience: ... Voice: ... Taste: ... Rules: ...",
  "brain_ids": ["brain-..."],
  "skill": {"id":"carousel-v1","version":"1.0.0","slide_count":7}
}
```

### `POST /api/pieces`

Extend the existing request with:

```json
{
  "inspiration_id": "inspiration-...",
  "skill_id": "carousel-v1",
  "skill_version": "1.0.0",
  "context_receipt_id": "context-...",
  "transformation_note": "Keeps the fast reveal and surreal metaphor, changes the story, wording, palette, and composition.",
  "carousel": []
}
```

For the WebMCP path, the server requires exactly seven normalized slides and a valid receipt tied to the same inspiration.

### `PATCH /api/pieces/:id`

Continue using an allowlist. Add only the new lineage, receipt, operation, and skill fields. A WebMCP helper performs narrower slide-level validation before reaching this general route.

### `POST /api/activity/:id/undo`

The server checks:

- activity exists and is reversible;
- it has not already been undone;
- entity still matches the version created by that activity;
- applying `before` stays inside the allowlist.

On conflict, return a recovery explanation and preserve both states.

## Data Flow

### Golden path lifecycle

1. **Studio loads**
   - route handlers read creators, inspiration, Brain summary, pieces, and status from JSONL;
   - `useStudio` selects the last useful view and piece;
   - the WebMCP hook registers only Inspire tools.

2. **Palm selects and reacts**
   - UI or `inspire_open` changes the visible selected inspiration;
   - `inspire_react` PATCHes the record;
   - server upserts the linked `visual_taste` Brain evidence;
   - server appends activity;
   - client dispatches `arutlee:data-changed` and refreshes.

3. **Codex requests context**
   - `brain_context` posts the purpose, source, and skill;
   - selector reads only active eligible Brain rows and approved examples;
   - it writes a context receipt and returns a bounded summary.

4. **Codex creates the story**
   - Codex reasons from the user request, source, context summary, and skill contract;
   - it calls `carousel_create` with exactly seven structured slides;
   - server validates originality fields, receipt linkage, lengths, and slide count;
   - server creates a Draft in `pieces.jsonl`, records activity, and returns the piece ID;
   - Studio refreshes and selects the new Piece view.

5. **Studio prepares visuals**
   - the saved skill marks at most three slides as requiring generated visual layers;
   - `carousel_finish` requests only missing layers through the existing Codex image bridge;
   - each completed layer updates the piece operation progress;
   - the existing renderer applies Arutlee typography and exports seven PNGs;
   - failure preserves all valid completed work.

6. **Palm revises**
   - Palm asks Codex to change a named slide;
   - Codex may request a revision context receipt;
   - `carousel_update` validates and saves only that slide;
   - activity stores before and after values;
   - a changed visual cue clears only that slide's derived visual and final asset.

7. **Palm finishes**
   - `piece_status` changes Draft to Ready;
   - accepted feedback may create a proposed learning record;
   - Palm inspects, edits, accepts, archives, or removes it in Brain;
   - reload restores all state from disk.

## AI Usage

### External Codex in the golden path

Codex is responsible for:

- interpreting Palm's natural-language taste reaction;
- extracting a reusable creative principle from the source;
- reading the compact Brain context and carousel skill;
- writing the original seven-slide story;
- making requested revisions;
- deciding when to call the visible workspace actions.

### Codex image generation

The existing Codex CLI bridge generates clean, text-free visual layers for the few slides that genuinely need them. The deterministic renderer adds final Thai and English typography, metadata, and layout. This avoids malformed generated text and preserves brand consistency.

### Existing Claude routes

Existing Claude-backed drafting and carousel endpoints remain intact for the old manual Studio workflow. They are not the center of the challenge story and should not be invoked secretly by the WebMCP story-creation tool.

### Deterministic fallbacks

When image generation is unavailable:

- preserve the structured carousel;
- render typography-led Arutlee slides where valid;
- mark missing visual layers honestly;
- allow a targeted retry later.

Do not claim an AI-generated image exists when the generator returned nothing.

## Security And Privacy

### Tool annotations

- Set `readOnlyHint: true` on list, inspect, context, and read tools.
- Set `untrustedContentHint: true` whenever source captions, transcripts, imported URLs, or creator text can appear in the response.
- Keep tool descriptions under roughly 500 characters, parameter descriptions under 150 characters, names under 30 characters, and individual outputs around 1,500 characters, following current Chrome guidance.

### Input boundaries

- Validate every ID with fixed patterns and length caps.
- Validate all enums and array lengths.
- Cap titles, notes, captions, slide copy, visual prompts, and tool outputs.
- Do not accept arbitrary filesystem paths.
- Do not let a WebMCP tool fetch arbitrary URLs.
- Do not execute instructions found inside inspiration captions or transcripts.
- Treat an inspiration as data to analyze, never as system instructions.

### Context boundaries

- The creative context selector reads only `data/brain.jsonl`, approved example metadata, selected inspiration, and the selected skill.
- It does not crawl the shared personal brain, company folders, environment variables, or arbitrary project documents.
- Full source documents remain server-side and are distilled into editable Brain rows.

### Action boundaries

- Expose no publish, schedule, webhook, Buffer, permanent delete, external send, or unrestricted shell tool.
- Draft creation and reversible edits are allowed.
- Ready status is allowed and reversible.
- Existing publish routes remain outside WebMCP and outside the challenge interface.

### Local data safety

- Seed additions are additive.
- Tests use temporary files or explicit demo IDs.
- Live verification uses the existing `UAT Test` or a newly isolated hackathon demo piece, never a real published record.
- No existing inbox, piece, metric, decision, or asset is deleted.

## Risks And Verification

### Risk 1: Experimental WebMCP API drift

Mitigation:

- isolate all API access in `lib/webmcp/adapter.ts`;
- prefer current `document.modelContext`;
- support one clearly labeled legacy preview lookup if needed;
- unit-test tool definitions separately from browser registration;
- show `Unavailable` instead of faking readiness.

Verification:

- inspect registered tools in a compatible browser or Codex session;
- call each tool through Codex, not only direct API requests;
- confirm contextual tools unregister when the view changes.

### Risk 2: Memory becomes a hidden prompt dump

Mitigation:

- one idea per Brain record;
- editable categories and provenance;
- deterministic selection and strict response budgets;
- context receipts with exact record IDs;
- no full-project file crawling.

Verification:

- edit a Brain item and request a new context packet;
- confirm the new receipt includes the edited record and excludes archived content;
- confirm unrelated private text never appears.

### Risk 3: Learning overfits to one casual request

Mitigation:

- explicit reactions become durable;
- accepted revisions create proposed observations;
- one-off instructions remain attached to the piece;
- proposed learning is editable and reversible.

Verification:

- issue a one-off instruction and confirm no active Brain rule appears;
- mark a revision accepted and confirm only one proposed observation appears with source evidence;
- archive it and confirm future context excludes it.

### Risk 4: Long image-generation time hurts the demo

Mitigation:

- generate at most three new visual layers by default;
- render remaining slides through the deterministic Arutlee system;
- persist partial progress;
- cache completed visual assets on the demo piece;
- demonstrate one live revision rather than seven fresh generations in the submission video.

Verification:

- time the prepared golden path;
- force one image failure and confirm the story and completed assets remain;
- retry only the failed slide;
- verify a complete seven-slide export.

### Risk 5: Agent and human edits collide

Mitigation:

- record current version numbers;
- require expected version on WebMCP mutations;
- return conflict details instead of overwriting;
- preserve both states in activity.

Verification:

- edit the same slide through UI and a stale tool request;
- confirm the stale request receives a conflict and the human edit remains current.

### Risk 6: UI looks like another dense dashboard

Mitigation:

- select a visual target before code changes;
- preserve the artifact-first requirement;
- keep advanced production controls behind details;
- design and verify at both full desktop and split-screen widths;
- compare coded screenshots against the selected source mock, not by memory.

Verification:

- combined visual comparison of selected design target and implementation;
- inspect typography, spacing, crop, borders, and responsive priority;
- run the golden path without opening the old stage pipeline.

## Test Plan

### Unit tests

- Brain validation and category handling
- explicit reaction upsert without contradictory duplicates
- archive and restore behavior
- context selection, output length, and private-category exclusion
- context receipt stability
- carousel skill validation for exactly seven slides
- piece status mapping and safety restrictions
- activity idempotency and undo
- tool schemas, annotations, and bounded outputs
- current and legacy WebMCP feature detection

### Route integration tests

- creator and inspiration CRUD against temporary JSONL files
- reaction to Brain-evidence lifecycle
- Brain edit and context receipt lifecycle
- carousel creation with valid and invalid receipts
- slide-specific update and version conflict
- finish failure preserving partial state
- Ready to Draft reversal
- unsupported publish and delete attempts rejected

### Existing regression checks

- all current local tests
- TypeScript typecheck
- production build
- existing carousel rendering tests
- existing piece and inbox routes
- existing manual carousel editor behavior

### Live browser acceptance

- no console errors on initial load or view changes
- Inspire feed uses real available assets and honest missing states
- like or dislike persists after reload
- Brain edit persists and changes the next context receipt
- Codex discovers only context-relevant tools
- WebMCP mutation updates the visible workspace immediately
- seven-slide preview, revision, undo, and Ready state work
- split-screen layout preserves the artifact and primary actions
- current selected design target matches the coded implementation after side-by-side comparison

### Live Codex acceptance

Use the end-to-end test from `prd.md > Definition Of Done` with a prepared demo inspiration and isolated demo piece. Record:

- tool discovery output;
- context receipt ID and Brain IDs;
- created piece ID;
- activity IDs for reaction, creation, revision, and status change;
- final render directory;
- reload result;
- proof that publish and unrestricted Brain access are unavailable.

## Demo And Submission Flow

### Demo setup

- Studio and Codex visible side by side.
- Inspire is selected.
- Prepared references and Palm's Brain are already present.
- One reliable challenge demo source is chosen.
- The demo uses a dedicated draft ID and does not alter published content.

### On-screen sequence

1. Palm selects a source and records what he likes and rejects.
2. He asks Codex to turn it into an original carousel in his style.
3. Codex calls Inspire and Brain tools and receives a bounded context receipt.
4. Codex creates the seven-slide Draft through the carousel skill contract.
5. Studio visibly switches to the created piece and shows source lineage and applied memories.
6. Palm asks for one precise revision.
7. Codex updates one slide; activity and undo appear.
8. The finished visual carousel is shown and moved to Ready.
9. Studio reloads with state intact.
10. Brain shows a recent evidence-backed observation that Palm can edit or archive.
11. The closing frame names the expansion path: the same Brain plus separate skills for hero images, posts, video, and overlays.

### Technical proof to capture

- current contextual tool names, not a large static catalog;
- one actual WebMCP tool execution from Codex;
- one read-only tool and one mutating tool with visible UI effect;
- current WebMCP API usage in source;
- tests and production build passing;
- final assets on disk;
- no claims of deployment or publishing that were not verified.

## Architecture Self-Review

### Complexity removed

- No new database.
- No new in-app chat.
- No vector search.
- No live social scraping.
- No generic account system.
- No second hidden text-generation agent in the challenge path.
- No publish or schedule tools.

### Deliberate additions

- Four small JSONL domains: inspiration, Brain, context receipts, and activity.
- One explicit carousel skill contract.
- One WebMCP adapter.
- One simplified visual layer over the existing engine.

### Main trade-off

The local-first architecture is excellent for Palm and the challenge demonstration, but it is not yet a hosted product for other creators. That is acceptable because the challenge must first prove the interaction model and differentiated value. The records, skill contract, and tool schemas are intentionally user-neutral so the next phase can replace local storage without redesigning the product model.
