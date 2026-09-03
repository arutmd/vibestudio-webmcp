# Arutlee WebMCP collaboration differentiation

**Date:** 2026-08-31  
**Question:** How can Arutlee make creator-plus-agent collaboration feel meaningfully better than ordinary chat, embedded AI assistants, and current WebMCP demos?

## Executive decision

Arutlee should not compete on the number of tools or on having another chat panel. Its signature should be **shared attention, visible agency, and durable creative continuity**.

The creator should feel that their agent:

1. sees exactly what they are looking at or selecting;
2. understands why those objects belong together;
3. proposes a direction before making expensive or broad changes;
4. works visibly on the same artifact;
5. returns atomic changes for review;
6. learns only what the creator deliberately approves; and
7. can hand the session to another agent without losing state.

The product can express this as five collaboration promises:

- **Shared attention** — point at it instead of explaining it.
- **Shared intent** — agree on the job before producing.
- **Shared work** — watch changes land on the artifact.
- **Shared control** — keep, edit, undo, interrupt, or restrict.
- **Shared continuity** — Brain, decisions, and state survive the agent session.

## What the current market proves

The [WebMCP draft](https://webmachinelearning.github.io/webmcp/) explicitly describes users and agents collaborating through the same web interface with shared context and user control. The [OpenAI WebMCP showcase](https://developers.openai.com/showcase?view=webmcp-apps) demonstrates shared creative artifacts across note editing, trip planning, greeting cards, photo editing, music, 3D modeling, and games.

Current examples mostly demonstrate that an agent can operate a page. Arutlee can differentiate by showing a longitudinal relationship: a creator's identity, taste, revisions, sources, and learning accumulate across many pieces and formats.

Adjacent products cover only parts of the thesis:

- Descript's official API can import media, run multi-step Underlord edits, track long-running jobs, create clips and captions, and publish projects. This is powerful execution inside video production, but it is not a portable cross-format creator Brain. ([Descript API](https://help.descript.com/hc/en-us/articles/43370311322509-Descript-Zapier-Integration))
- Canva AI 2.0 is the closest strategic competitor: Canva officially describes layered editable outputs, a living Memory Library, brand intelligence, connectors, background tasks, and an agent that steps back when the person edits manually. Canva also exposes brand-aware design actions in Claude. Arutlee therefore cannot credibly differentiate on “AI + memory + brand” alone. Its wedge must be inspectable, evidence-backed creator memory; explicit learning scope; cross-format decision lineage; and portability across the creator's chosen agents. ([Canva AI 2.0](https://www.canva.com/newsroom/news/canva-create-2026-ai/), [Canva connector for Claude](https://www.canva.com/newsroom/news/claude-ai-connector/), [Canva Brand](https://www.canva.com/business/features/brand/))
- Adobe Firefly Style Kits can preserve and share approved generation settings, while Firefly Design Intelligence Style IDs encode brand attributes for reuse. Adobe Content Credentials can record creator, AI, and editing information as durable provenance. Arutlee's opportunity is not to claim stronger style control or a new provenance standard; it is to connect creator decisions, Brain evidence, agent actions, and human approval in one operational record, with a future path to export standard credentials. ([Firefly Style Kits](https://helpx.adobe.com/firefly/web/work-with-enterprise-features/collaborate-using-style-kits/style-kits-overview.html), [Firefly Design Intelligence](https://helpx.adobe.com/firefly/web/firefly-design-intelligence/firefly-design-intelligence-overview.html), [Adobe Content Credentials](https://helpx.adobe.com/creative-cloud/apps/adobe-content-authenticity/content-credentials/overview.html))
- Meta's official Creator Assistant uses a creator's presence, audience, engagement, performance, and goals to explain performance and suggest ideas. Edits combines saved Reels, audio, notes, feedback, and personalized ideas; Trial Reels lets creators test content with non-followers before broader distribution. Arutlee's wedge is creator-owned, cross-platform continuity and auditable memory—not simply inspiration, recommendations, or performance feedback. ([Meta Creator Assistant](https://about.fb.com/news/2026/06/creator-assistant-more-languages-for-ai-translations-on-facebook/), [Edits](https://about.fb.com/news/2026/04/one-year-of-edits-built-for-and-with-creators/amp/), [Trial Reels](https://about.fb.com/news/2024/12/trial-reels-try-content-non-followers-first-see-what-perfoms-best/))

## Current Arutlee strengths

The current implementation already has unusually sound WebMCP foundations:

- Tools register contextually for Inspire, Piece, or Brain rather than exposing one global catalog.
- External inspiration is marked as untrusted content.
- Tool results are bounded to approximately 1.5K characters.
- Mutations use expected versions and idempotency keys.
- Carousel edits are granular and recoverable.
- Undo exists.
- Brain context is selective and receipt-backed.
- Publishing is not exposed to the agent.

These choices align with Chrome's current guidance to use `readOnlyHint` and `untrustedContentHint`, keep descriptions and outputs short, restrict exposure, and support cancellation. ([Chrome WebMCP security](https://developer.chrome.com/docs/ai/webmcp/secure-tools), [Chrome imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api))

The main gap is experiential. `Codex ready` proves connectivity, but does not show what Codex sees, is doing, changed, or needs from the person.

## Signature interaction: Shared Attention

### Human experience

A creator can select any meaningful combination of objects across Arutlee:

- one or several carousel slides;
- a text span;
- an image or region;
- one or more video scenes or a time range;
- an inspiration post or exact video frame range;
- a Brain memory;
- a source excerpt or claim;
- an asset, comment, revision, or prior version.

Selections collect into a persistent **Talking about** tray. Example:

> Talking about · Slides 2 and 6 · Voice rule · Inspiration 00:04–00:08

The creator can then tell Codex:

> Make these feel more connected, but keep slide 6 visually quiet.

No IDs, filenames, prompt packing, or explanation of what “these” means should be required.

### Selection roles

Every selected object can have one of four simple roles:

- **Change** — the agent may propose a modification.
- **Use as reference** — learn from it without changing it.
- **Compare** — explain differences or align selected objects.
- **Keep unchanged** — treat it as a constraint.

Defaults can be inferred from object type, but the roles remain visible and editable. This allows one instruction to combine targets, references, and constraints without ambiguity.

### Selection model

Each selection needs a stable semantic anchor rather than screen coordinates:

- entity type and ID;
- exact subrange: slide, field, text range, image region, scene, or timecode;
- object version when selected;
- role and order;
- originating view and session;
- visibility/privacy classification.

The agent first receives a bounded manifest, not the content of the entire workspace. It can request the allowed selected content through contextual tools.

### Selection lifecycle

1. Selection is visible to the human before the agent reads it.
2. A tool execution snapshots the selected object versions.
3. If the human changes the selection, that affects the next instruction unless they explicitly update the running task.
4. If the human edits a targeted object while the agent is working, expected-version checks prevent silent overwrites.
5. The result records the exact selection manifest in its context receipt.
6. Selection can be cleared, pinned for the session, or saved as a reusable context set.

### Contextual tool behavior

The default tool set should remain tiny:

- `selection_read` — list selected objects and roles.
- `selection_context` — return bounded content for allowed selected objects.
- `change_propose` — create a reviewable patch against selected targets.
- `change_apply_approved` — apply an accepted patch with version checks.

Arutlee can then register additional tools dynamically:

- multiple slides: compare or revise narrative continuity;
- inspiration plus slide: transform a mechanism without copying expression;
- Brain rule plus output: apply or test that rule;
- video range: revise script, overlays, pacing, or shot plan;
- source excerpt plus claim: verify or attach evidence.

## Visible collaboration choreography

### 1. Agent joins with a contract

Show a small presence capsule:

> Codex joined · Can read this session · Can edit drafts · Cannot publish · Learning requires approval

The creator can switch among three understandable modes:

- **Observe** — read and advise only.
- **Collaborate** — create reversible drafts and proposals.
- **Execute** — run approved production jobs, still without publishing or permanent learning.

### 2. Agent shows what it understood

Before broad generation, Arutlee displays a short direction card:

- goal;
- selected targets;
- Brain memories chosen;
- source mechanism;
- intended outputs;
- important exclusions;
- decisions still needed.

This is not a long chain-of-thought display. It is an inspectable work contract.

### 3. Agent presence attaches to the work

Do not rely only on a global spinner. Show local state:

- `Codex is revising slide 2` beside slide 2;
- an agent avatar on the affected scene;
- `Generating background art · 2 of 4` near the visual;
- partial outputs as they become available;
- Pause or Cancel for long-running operations.

Chrome's imperative API supplies cancellation signals for tool execution, so cancellation should propagate into network and generation jobs rather than merely hiding a spinner. ([Chrome imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api))

### 4. Every mutation becomes a review moment

Agent work should land as a patch, not silent replacement:

- changed-object marker;
- concise reason;
- before/after or visual diff;
- memories and sources used;
- Keep, Edit, Undo;
- `Teach Brain?` with scope selection.

For a batch change, the human can accept some objects and reject others.

### 5. Decisions happen in the artifact

When the agent needs a creator decision, it should create an in-page decision card rather than asking the person to describe their choice in another interface. The WebMCP execution may return `awaiting_human`, or a short async execution can wait for the local decision with cancellation and timeout safeguards.

The emerging WebMCP work is exploring asynchronous user-interaction requests; until support is stable, Arutlee should implement a visible decision queue and an explicit resume action. ([Chrome WebMCP security](https://developer.chrome.com/docs/ai/webmcp/secure-tools))

## Durable collaboration across agents

Arutlee, not the agent chat, should remain the source of truth. Every session should maintain a compact **resume packet**:

- goal and current stage;
- selected idea nucleus;
- approved direction;
- relevant Brain receipt;
- completed and pending actions;
- open decisions;
- latest artifact versions;
- permissions and exclusions.

Codex can leave and Claude or ChatGPT can resume from the same packet. The new agent does not inherit unrestricted history; it receives only the current bounded context. This makes “bring your own agent” a real product capability rather than a tagline.

## Trust as a visible product advantage

The WebMCP draft warns that ambiguous tool semantics can cause unintended high-privilege actions and that over-parameterized tools can extract agent-held personalization data. ([WebMCP security considerations](https://webmachinelearning.github.io/webmcp/))

Arutlee should make the safer behavior legible:

- Rename ambiguous actions. `carousel_finish` should become `carousel_render_missing_assets`; `piece_status` should become `piece_mark_ready`.
- Never ask the agent to send creator attributes as parameters when Arutlee already owns the data.
- Return references to selected Brain records rather than the unrestricted Brain.
- Keep inspiration and fetched sources marked untrusted.
- Separate propose, apply, learn, schedule, and publish operations.
- Require explicit human confirmation for publishing and permanent memory approval.
- Show agent identity and operation ownership in every activity record.

## Product sentence

> Arutlee is where creators and their chosen agents share attention, memory, and creative work—so you can point instead of prompt, review instead of trust blindly, and keep becoming more yourself with every piece.

## Evidence limits

- The WebMCP API and consent mechanisms remain experimental and can change.
- Official product documentation demonstrates current capabilities, not comparative user satisfaction.
- The proposed Shared Attention protocol is a product inference and should be tested with creators.
- Long-running in-page decision handshakes need timeout testing across actual agent clients; a durable decision queue is the safer fallback.
- “Official material reviewed here does not describe a capability” should not be read as proof that the product lacks it.

## Prioritized winning demo

1. Palm opens an inspiration and selects a specific moment.
2. Palm also selects two Brain memories and two existing slides; the Talking about tray makes the set explicit.
3. In Codex, Palm says: “Use this mechanism, make these slides feel connected, and keep this rule.”
4. Codex calls `selection_read`; Arutlee visibly shows exactly what Codex sees and its permissions.
5. Codex proposes three direction cards inside Arutlee. Palm taps one without restating it in chat.
6. Codex works on the selected slides; progress and agent presence appear locally on the canvas.
7. Two atomic patches arrive with before/after diffs and context receipts. Palm keeps one and edits the other.
8. Arutlee asks whether the correction applies only here, to this series, or globally. Palm chooses a scope; the Brain stores a proposal, not an automatic rule.
9. Codex adapts the same idea into a short-video plan, visibly applying the accepted correction while changing the structure for video.
10. The closing view shows source mechanism → selected Brain → agent actions → human decisions → two native outputs, with publishing still human-owned.

## Competitor comparison

| Product | Officially documented strength | Arutlee's defensible wedge | Honest product implication |
|---|---|---|---|
| OpenAI WebMCP showcase apps | Agents and people work on the same live artifact; examples include separate agent comments, editable suggestions, and preserving human changes. ([Showcase](https://developers.openai.com/showcase?view=webmcp-apps), [Margin Editor](https://developers.openai.com/showcase/margin-editor), [WanderNote](https://developers.openai.com/showcase/wandernote), [Sunday Table](https://developers.openai.com/showcase/sunday-table)) | Longitudinal creator identity, evidence-backed learning, and cross-format lineage | Same-page agent action is table stakes; Arutlee must show how the relationship compounds. |
| Canva AI 2.0 + Brand + connectors | Layered editable output, living memory, brand intelligence, approvals, background work, and agent actions from external assistants. ([Canva AI 2.0](https://www.canva.com/newsroom/news/canva-create-2026-ai/), [Canva Brand](https://www.canva.com/business/features/brand/), [Claude connector](https://www.canva.com/newsroom/news/claude-ai-connector/)) | Inspectable creator memory with sources, per-change receipts, scoped learning, cross-format decision history, and agent portability | Do not pitch “memory and brand consistency” by itself; Canva already makes that claim. |
| Descript API/MCP + Underlord | Deep video/audio execution, long-running job status, transcript-native editing, AI editing, and integration tooling. ([Descript API](https://help.descript.com/hc/en-us/articles/43370311322509-Descript-Zapier-Integration), [Ask AI](https://help.descript.com/hc/en-us/articles/20531819066509-Ask-AI-Actions)) | Idea and creator continuity before and after the media editor, spanning carousel, image, text, and video | Treat Descript as a possible execution engine, not a competitor to rebuild feature-for-feature. |
| Adobe Firefly | Reusable style governance plus durable Content Credentials for provenance. ([Style Kits](https://helpx.adobe.com/firefly/web/work-with-enterprise-features/collaborate-using-style-kits/style-kits-overview.html), [Content Credentials](https://helpx.adobe.com/creative-cloud/apps/adobe-content-authenticity/content-credentials/overview.html)) | Human-agent decision provenance and evolving creator taste across sessions | Keep Arutlee's internal receipts; plan interoperability with standard credentials instead of inventing a competing authenticity standard. |
| Meta Creator Assistant + Edits | First-party audience/performance context, personalized ideas, saved inspiration, editing, and real-audience trials. ([Creator Assistant](https://about.fb.com/news/2026/06/creator-assistant-more-languages-for-ai-translations-on-facebook/), [Edits](https://about.fb.com/news/2026/04/one-year-of-edits-built-for-and-with-creators/amp/), [Trial Reels](https://about.fb.com/news/2024/12/trial-reels-try-content-non-followers-first-see-what-perfoms-best/)) | Creator-owned, cross-platform goals and memory, available to the creator's preferred agent | Integrate platform feedback later, but keep the creator model independent of any single feed. |
| Arutlee target | Shared Attention, bounded Brain receipts, reversible patches, skills, provenance, and bring-your-own-agent continuity | The complete collaboration protocol: point, agree, watch, review, teach, resume | The demo must make the protocol visible; a tool list or chat panel will not communicate it. |
