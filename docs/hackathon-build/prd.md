# Product Requirements Document

## Product Summary

Arutlee Studio is a personal creator operating system that lets Palm work through Codex while Arutlee preserves everything that makes the output recognizably his.

General-purpose AI can already draft copy, generate images, and help make carousels. Arutlee does not compete by placing another chatbot beside those capabilities. Its value is the persistent system around them:

- an editable creator Brain that remembers brand identity, audience, voice, visual taste, feedback, prior work, and production rules;
- focused creative skills that turn those memories into repeatable production workflows;
- a visible workspace where the creator and agent act on the same pieces;
- clear lineage, reversible changes, and approval boundaries;
- contextual WebMCP actions that let Palm use the agent he already prefers.

The challenge proof is deliberately narrow: Palm chooses a saved inspiration, tells Codex what he likes and dislikes, and receives an original seven-slide carousel that reflects his Brain. He can then revise the piece through Codex, see the result update in Studio, and return later without losing the work or the learning.

## Product Promise

> ChatGPT can create content. Arutlee helps it create content that remains consistently yours, gets faster with every piece, and leaves you in control of what it remembers.

This promise depends on keeping three product responsibilities distinct:

### Brain

The Brain contains creator-specific knowledge: who Palm is, who he speaks to, how he sounds, what he likes, what he rejects, what has worked before, and which rules should persist. It is readable and editable by Palm. It grows through explicit feedback and accepted work, not through silent guessing.

### Skills

Skills contain repeatable ways of making things: carousel, hero image, post, video, overlays, and future formats. A skill describes the steps, checks, and output shape. It can be reused with another creator's Brain without carrying Palm's identity into their work.

### Workspace and WebMCP actions

The workspace holds inspiration, pieces, status, previews, and history. Contextual WebMCP actions let Codex read the relevant parts and safely change the same visible state. They are the bridge between the Brain, a selected skill, and the current artifact.

The product must never present these as one undifferentiated pile of tools or memory.

## Target User

### Primary user

Palm is a doctor, founder, AI builder, and aspiring internet personality with limited time. He is highly comfortable directing Codex and Claude, but does not want to learn another AI chat interface or repeatedly explain his brand and creative preferences.

Palm needs to be able to:

- start from an interesting reference instead of a blank prompt;
- explain taste in natural language;
- trust that the agent receives the right prior context without receiving his entire personal knowledge base;
- see what the agent is doing and what changed;
- judge a finished visual artifact quickly;
- correct the result once and have that correction improve future work;
- leave and return without losing the piece, its sources, or its state.

### Future user

A serious creator, founder, or small creative team that brings its own preferred agent and its own creator Brain. The challenge does not require general onboarding, but the product model must not hard-code Palm's identity into the reusable creative skills.

## Product Principles

1. **The work is the interface.** The selected inspiration or content artifact dominates the screen.
2. **Conversation stays in Codex.** Studio does not add a competing chat box.
3. **Memory is a first-class product.** Palm can see, edit, remove, and understand what Arutlee remembers.
4. **Learning requires evidence.** Likes, dislikes, explicit notes, and accepted revisions can become durable signals. Casual prompt wording does not silently become a permanent rule.
5. **Context is selective.** Codex receives the smallest useful Brain packet for the selected piece and skill.
6. **Skills are reusable procedures.** They remain separate from creator-specific identity and taste.
7. **Agent work is visible and reversible.** Studio shows the current operation, resulting changes, source lineage, and an undo path.
8. **Consequential actions require Palm.** Publishing, scheduling, destructive deletion, and other external changes remain approval-gated.
9. **Premium means calm.** The interface uses restraint, hierarchy, spacing, typography, and strong imagery instead of dashboard density.
10. **Palm first, reusable later.** The complete experience must solve Palm's real workflow before generic creator onboarding is added.

## Core User Journey

### 1. Return to a living workspace

Palm opens Studio beside Codex. Studio restores the last useful view rather than showing a setup wizard. The left rail groups content sessions by Draft, Ready, Scheduled, and Live. A quiet readiness indicator says whether Codex can use the page's WebMCP actions.

The default challenge view is Inspire inside Pieces. Palm immediately sees a curated set of visual references from creators he chose to track.

### 2. Choose a reference and express taste

Palm opens one inspiration item. He can see its creator, platform, source link, image or video still, caption or transcript when available, and why it was saved.

He can mark it as `Like` or `Not for me` and add a short note. The explicit reaction becomes a visible taste signal. He can edit or undo it later.

Palm then tells Codex what to do in natural language, for example:

> I like the strange visual metaphor and the fast opening, but not the corporate tone. Make an original carousel for my audience in my style.

### 3. Let Codex assemble the right context

Codex inspects the selected inspiration through contextual WebMCP actions. It records Palm's reaction, requests the carousel skill, and requests only the relevant Brain context.

Studio makes this legible without exposing technical plumbing. The selected piece can show a short context receipt such as:

- audience and current content goal;
- voice and language rules;
- relevant visual preferences;
- recent accepted examples;
- the selected inspiration and Palm's reaction;
- carousel production rules.

Palm can open the receipt to see why the result was shaped that way. He can jump from a listed memory to the Brain and edit it.

### 4. Create an original piece

Codex separates the reusable creative principle from the source execution. It may borrow a hook pattern, emotional effect, pacing idea, or visual device, but must not copy the source's wording, exact composition, or identity.

A new piece appears immediately under Draft, linked to the inspiration. Studio shows progress against meaningful creative steps, not a technical pipeline. The carousel skill produces:

- a clear seven-slide story;
- slide titles and concise copy;
- a coherent visual direction;
- clean generated visual layers when needed;
- deterministic Arutlee typography and layout;
- seven ordered 1080 x 1350 previews and saved render assets.

The center canvas remains useful while work is happening. Completed slides appear as they become available, and the current operation is shown near the affected artifact.

### 5. Revise through Codex

Palm reviews the carousel visually, selects a slide if needed, and gives Codex a natural instruction such as:

> The first slide is too generic. Make the visual stranger but keep the copy simple.

Codex edits only the relevant part unless the instruction clearly asks for a broader change. Studio shows the updated slide, a concise change note, and the previous version in history. Palm can undo the change.

### 6. Keep useful learning

Explicit likes, dislikes, and edited feedback are durable immediately because Palm intentionally provided them.

When Palm accepts a revision or marks the piece Ready, Arutlee may add an evidence-backed taste observation, such as `Prefers surreal visual metaphors with plain-language hooks`. New observations appear in a `Recently learned` area with their source piece and an undo or edit action.

Arutlee must not convert every instruction into a permanent rule. A one-off constraint can remain attached only to that piece. Palm can promote it to the Brain if he wants it reused.

### 7. Leave safely and return

The piece remains Draft unless Palm marks it Ready. All visible content, source links, feedback, context receipt, revisions, and status persist after reload.

The challenge journey ends here. Studio can display existing Scheduled and Live pieces, but Codex cannot publish, schedule, or destructively delete through the challenge tools.

## Epics And User Stories

### Epic 1: Calm workspace and durable sessions

#### Story 1.1: Resume where I left off

As Palm, I want Studio to restore my recent work so that I do not have to reconstruct the session every time I return.

Acceptance criteria:

- Reloading Studio preserves the selected view, saved inspiration feedback, current piece, slide content, latest renders, and piece status.
- A newly created piece appears under Draft without a manual refresh.
- Draft, Ready, Scheduled, and Live groupings show only pieces in their corresponding states.
- Empty status groups remain collapsed or quiet rather than taking over the rail.
- Selecting a different session updates the center workspace without losing unsaved text silently.

#### Story 1.2: Understand agent readiness

As Palm, I want to know whether Codex can work with the current page so that I do not waste time issuing instructions that cannot complete.

Acceptance criteria:

- The interface shows one subtle state: `Codex ready`, `Working`, `Needs review`, `Saved`, or `Unavailable`.
- The state is visible without opening a technical tool list.
- If unavailable, Studio gives one plain-language recovery action and keeps normal manual viewing usable.
- Tool registration details and schema are not shown in the default human interface.

### Epic 2: Inspiration that feeds creation

#### Story 2.1: Browse a curated inspiration set

As Palm, I want an image-led view of selected creators so that I can find a strong starting point quickly.

Acceptance criteria:

- Each reference shows a real media preview or an honest unavailable-media state.
- Each reference identifies creator and platform and provides the original source link.
- The first screen prioritizes imagery and a small amount of useful context, not metrics or production controls.
- Palm can move between references without opening separate browser tabs unless he chooses the source link.
- The challenge demo works from prepared local references even when a social platform is unavailable.

#### Story 2.2: Manage who inspires me

As Palm, I want to add, pause, or remove tracked creators so that the inspiration source list stays intentional.

Acceptance criteria:

- A creator list shows active and paused sources separately.
- Palm can add a creator with platform, handle, and optional note.
- Pausing a creator keeps already saved references and prior taste signals.
- Removing a creator requires confirmation and does not silently delete pieces previously inspired by them.
- Invalid or duplicate handles receive a clear inline explanation.

#### Story 2.3: Record what I like and reject

As Palm, I want to react to a reference and explain why so that Arutlee learns taste rather than merely collecting links.

Acceptance criteria:

- `Like` and `Not for me` are mutually exclusive and can be cleared.
- An optional note can be added or edited without leaving the reference.
- The saved reaction is visibly confirmed and survives reload.
- The reaction records its source and date in the Brain's taste history.
- Changing or deleting the reaction updates the corresponding taste signal rather than leaving contradictory duplicates.

### Epic 3: An editable, growing creator Brain

#### Story 3.1: See what Arutlee remembers

As Palm, I want a readable Brain rather than a hidden memory system so that I can trust and shape future output.

Acceptance criteria:

- Brain information is grouped into understandable areas: Identity, Audience, Voice, Visual Taste, Content Goals, Production Rules, Examples, and Recent Learning.
- Each durable item shows its content, source or reason, and whether Palm wrote it directly or Arutlee learned it from feedback.
- Palm can search or filter the Brain without seeing raw storage formats.
- Empty categories explain what belongs there and offer one clear add action.
- The Brain does not expose unrelated personal or company knowledge.

#### Story 3.2: Correct the memory

As Palm, I want to edit and remove remembered items so that old or wrong preferences do not keep shaping new work.

Acceptance criteria:

- Palm can add, edit, archive, restore, and remove a Brain item.
- Every edit is saved visibly and persists after reload.
- Removing a Brain item warns only when the action affects future generation; it does not claim to rewrite completed pieces.
- Recent changes can be undone.
- Conflicting active rules are surfaced for review instead of being silently combined.

#### Story 3.3: Let the Brain grow carefully

As Palm, I want accepted feedback to improve future work without turning every sentence into a permanent preference.

Acceptance criteria:

- Explicit inspiration reactions are stored as durable taste evidence.
- Accepted revisions may create a proposed observation linked to the piece and revision that produced it.
- A proposed observation is visually distinct from a direct user-authored rule.
- Palm can edit, keep, archive, or remove the observation.
- A one-off piece instruction remains piece-specific unless it is explicitly promoted or reinforced by accepted behavior.
- Every learned observation has traceable evidence and can be reversed.

#### Story 3.4: Understand what influenced a piece

As Palm, I want to see the relevant memories used for a piece so that consistency is explainable rather than magical.

Acceptance criteria:

- Every generated piece stores a compact context receipt.
- The receipt lists only the Brain entries, examples, goal, source reaction, and skill version relevant to that piece.
- Palm can open a referenced Brain item from the receipt.
- Editing the Brain does not silently change an existing piece; it affects the next requested revision or generation.
- The receipt never contains the full personal Brain by default.

### Epic 4: Reusable creative skills

#### Story 4.1: Keep identity separate from production method

As a future creator, I want Arutlee's carousel method to work with my Brain so that I can use the same reliable workflow without inheriting Palm's voice.

Acceptance criteria:

- The carousel skill has its own visible name and purpose separate from Brain categories.
- The skill describes the expected seven-slide output and quality checks without embedding Palm-specific preferences.
- A piece records which skill and version produced it.
- Updating a skill does not overwrite older outputs.
- The interface can later list hero image, post, video, and overlay skills as future capabilities without pretending they are complete today.

#### Story 4.2: Run the carousel skill from Codex

As Palm, I want Codex to invoke a complete carousel workflow so that I receive a reviewable artifact rather than disconnected suggestions.

Acceptance criteria:

- Codex can create a new carousel piece from the selected inspiration and current relevant Brain context.
- The result contains exactly seven ordered slides in the challenge flow.
- Each slide has editable copy and visual direction.
- Rendered previews use the configured Arutlee typography and dimensions.
- If an image is still missing, the affected slide shows an honest recoverable state rather than a fake finished preview.
- A generation failure leaves the piece and completed work intact and offers a retry for the failed part.

### Epic 5: Visible agent collaboration

#### Story 5.1: Watch Codex work in the same artifact

As Palm, I want agent actions to land in the workspace I am viewing so that I can follow progress without reading logs.

Acceptance criteria:

- Creating a piece, updating copy, changing visual direction, generating a slide visual, rendering, and changing Draft to Ready all update the current Studio state.
- The interface shows the current operation near the affected piece or slide.
- Completed changes appear without a full-page reload.
- A concise activity trail states what changed, when, and whether Codex or Palm made the change.
- Technical request payloads remain outside the default activity view.

#### Story 5.2: Revise precisely

As Palm, I want Codex to change only what I asked for so that revision stays fast and predictable.

Acceptance criteria:

- A slide-specific request preserves all other slides unless the request explicitly affects the whole story.
- The new and previous versions are both recoverable.
- Copy and visual direction can be revised independently.
- Studio clearly marks the latest result and does not show two versions as simultaneously current.
- Failed revisions do not erase the last valid version.

### Epic 6: Originality, control, and safety

#### Story 6.1: Preserve source lineage without copying

As Palm, I want every inspired piece linked to its source and transformed into an original execution so that I can borrow ideas responsibly.

Acceptance criteria:

- The piece retains a visible link to the inspiration item.
- A short transformation note states which high-level principle was carried forward and what changed.
- The generated copy does not reproduce distinctive source wording beyond unavoidable generic phrases.
- The generated visual does not intentionally replicate the source's exact composition, identity, logo, or watermark.
- Palm can remove a source from future use without deleting the resulting piece.

#### Story 6.2: Keep consequential actions gated

As Palm, I want Codex to work autonomously on drafts but stop before external or destructive actions so that I remain in control.

Acceptance criteria:

- Draft creation, draft revision, Brain retrieval, and reversible feedback updates can happen without repeated confirmation.
- Marking a piece Ready is available and reversible.
- Publishing, scheduling, permanent deletion, and changes outside Studio are not exposed through the challenge WebMCP actions.
- Any future consequential action must show the exact target and require explicit approval.
- An agent cannot retrieve the unrestricted personal Brain through a creative context request.

### Epic 7: Premium split-screen experience

#### Story 7.1: Keep the artifact dominant

As Palm, I want the carousel or selected inspiration to remain visually dominant so that I can judge the creative work quickly.

Acceptance criteria:

- In the main piece view, the artifact occupies more visual attention than navigation, metadata, and controls.
- The normal challenge journey does not expose the old multi-stage production pipeline.
- Advanced controls remain collapsed until requested.
- Status, lineage, and Brain context are available without permanently competing with the artifact.
- The interface uses no fake metrics or decorative feature cards.

#### Story 7.2: Work beside Codex

As Palm, I want Studio to remain usable in a split desktop view so that I can talk in Codex and inspect work at the same time.

Acceptance criteria:

- The golden path is usable at a Studio viewport around half of a laptop screen.
- Secondary inspectors collapse before the main preview becomes unreadable.
- The left rail can collapse to a compact session control.
- No primary action is lost behind horizontal scrolling.
- The full-width view expands the artifact rather than adding unnecessary panels.

## WebMCP Action Model

The human interface should not become a tool catalog, but the product behavior must be organized into small contextual action families.

### Inspiration actions

- inspect the currently selected inspiration;
- list prepared inspiration relevant to the current view;
- record, edit, or clear Palm's reaction;
- read or update the tracked-creator list through safe reversible changes.

### Brain actions

- retrieve a focused context packet for a stated piece and skill;
- list the Brain entries that influenced a piece;
- propose an evidence-backed learned observation;
- add, edit, archive, or restore a specific Brain item through an inspectable change.

Brain actions remain distinct from content-generation actions. Retrieving or editing memory does not create a piece automatically.

### Piece actions

- create a Draft linked to a selected inspiration;
- inspect the current piece and its slide sequence;
- update story or slide copy;
- update a slide's visual direction;
- request or retry a slide visual;
- render the carousel;
- move Draft to Ready or Ready back to Draft;
- inspect activity and restore a previous version.

### Skill actions

- inspect the available carousel skill and its output contract;
- run the carousel skill for a specified piece using an explicit context receipt;
- report which skill version produced a result.

The challenge should expose only actions required for the current page and selected artifact. Codex is the customer of these action descriptions, while Palm sees their effects.

## Edge Cases

### Before any inspiration exists

- Show one clear action to add a reference or load the prepared demo set.
- Do not show an empty analytics dashboard.
- Codex should receive an honest `no inspiration selected` response rather than guessing a source.

### Before the Brain is complete

- Creation may continue using the confirmed context that exists.
- Studio identifies which important area is missing without blocking the whole workflow.
- Missing information must not be fabricated and saved as memory.

### Media or source unavailable

- Keep the saved source URL, creator, platform, reaction, and any cached description.
- Show that the original media is unavailable.
- Do not substitute unrelated stock imagery and imply it is the source.

### Codex is not connected

- Studio remains fully viewable.
- The readiness state explains that agent actions are unavailable.
- Manual inspection and Brain editing continue to work.

### Generation or rendering fails midway

- Preserve the Draft, completed slides, copy, visual direction, and activity history.
- Identify the failed slide or operation.
- Allow a targeted retry instead of restarting the whole carousel.

### Palm reloads while Codex is working

- The page restores the durable last-known state.
- If work is still running, the operation state resumes or resolves to a clear recoverable outcome.
- Studio never displays a permanent `Working` state after the operation has ended.

### Palm and Codex edit the same item

- The latest accepted version must not silently overwrite an active human edit.
- Studio preserves both versions and asks Palm which to keep when it cannot merge safely.

### Feedback conflicts with an existing rule

- Store the new evidence without silently deleting the older rule.
- Surface the conflict in Recent Learning and let Palm edit, archive, or clarify the rule.

### Too many tracked creators or references

- The challenge view prioritizes recent, liked, and not-yet-reviewed references.
- Search and simple creator filtering are sufficient; complex recommendation analytics are not required.
- The first screen should remain curated even if the stored collection grows.

### Duplicate piece request

- Repeating the same create request should not silently create multiple identical Drafts.
- Codex receives the existing piece identifier and can continue or explicitly create a new version.

### Unsafe or unsupported action

- The action is refused in plain language.
- The response explains the safe available alternative, such as keeping the piece Ready instead of publishing it.
- No partial external action occurs.

## What We Are Building

- A visually redesigned, simplified Pieces experience with a distinct Inspire view.
- A prepared, image-led inspiration set and manageable tracked-creator list.
- Like, dislike, and short-note feedback that becomes traceable taste evidence.
- A visible Brain with separate identity, audience, voice, taste, goals, rules, examples, and recent learning.
- Brain editing, archiving, restoration, source evidence, and selective context receipts.
- A small contextual Codex-first WebMCP surface divided into inspiration, Brain, skill, and piece actions.
- One complete original seven-slide carousel skill using the existing generation and rendering foundation.
- Visible piece creation, revision, history, status, persistence, and source lineage.
- Draft and Ready transitions with publishing, scheduling, and destructive actions withheld.
- A premium near-monochrome shell with editorial content richness, optimized for Codex and Studio side by side.
- A repeatable demo that works without live social scraping.

## What We Would Add With More Time

- Automatic monitoring and import from approved Instagram, Facebook, and TikTok accounts.
- Creator onboarding that builds a new Brain from interviews, existing posts, brand assets, and feedback.
- Complete hero image, standalone post, video, animation overlay, and SVG production skills.
- Cross-piece performance learning using real platform analytics.
- Native scheduling and publishing with explicit per-action approval.
- Team roles, shared approval, and branch-specific creator Brains.
- Broader Claude and other compatible-agent testing.
- A native assistant for users who do not bring their own agent.
- More advanced originality comparison and source-rights checks.
- Cloud synchronization, accounts, and multi-device access.

## Non-Goals

- Replacing Codex with an in-app chatbot.
- Claiming that Arutlee's language model is uniquely capable of generating text or images.
- Competing on the number of exposed tools.
- Giving Codex unrestricted access to Palm's personal knowledge system.
- Rebuilding the existing content engine, carousel renderer, or visual identity from zero.
- Depending on live social scraping during the challenge demo.
- Publishing or scheduling real content during the proof.
- Proving every future content format or every agent integration.

## Submission Proof Points

The submission should visibly prove each of these claims:

1. **Bring your own agent:** Palm gives the instruction in Codex, not an Arutlee chatbot.
2. **Contextual WebMCP:** Codex discovers a small set of relevant actions from the current Studio view.
3. **Memory is the differentiator:** Studio shows the Brain entries and explicit taste signal that informed the piece.
4. **Memory is editable:** Palm changes or removes a learned preference and the next action uses the corrected context.
5. **Skills are separate:** the carousel method is shown as a reusable production skill, not as part of Palm's personal identity.
6. **Visible collaboration:** Codex creates and revises the same carousel Palm sees in Studio.
7. **Original transformation:** the source, Palm's reaction, and the transformed creative principle remain visible without copying the source execution.
8. **Persistence:** the carousel, its history, and its context receipt remain after reload.
9. **Safety:** the result stops at Draft or Ready, and consequential actions remain unavailable or approval-gated.
10. **Product quality:** the experience feels like a finished private editorial studio rather than a protocol demonstration.

## Definition Of Done

The scoped product is complete when the following end-to-end acceptance test passes without manual file editing:

1. Open Studio in a split desktop view beside Codex.
2. Select a prepared inspiration and record a like or dislike with a reason.
3. Ask Codex to create an original carousel from that inspiration.
4. Confirm Codex receives only the relevant Brain context and carousel skill.
5. Watch a new Draft and seven-slide carousel appear in Studio.
6. Ask Codex for one slide-specific copy or visual revision.
7. Confirm only the intended part changes and the previous version remains recoverable.
8. Inspect the context receipt, source lineage, and activity trail.
9. Mark the piece Ready, reload the page, and confirm the state and assets persist.
10. Open Recently Learned, inspect the new evidence-backed taste observation, and edit or undo it.
11. Confirm publishing, scheduling, destructive deletion, and unrestricted Brain retrieval are not available in the challenge surface.

Passing this test demonstrates the product thesis: Arutlee makes general-purpose AI meaningfully more consistent, faster, and easier for a creator because memory, skills, state, and control grow together around the agent they already use.
