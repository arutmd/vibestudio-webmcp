# Project Scope

## Project Name Candidates

- **Arutlee Studio**: selected. It preserves the identity of the existing product and is broad enough for the long-term creator operating system.
- **Arutlee Creator OS**: useful as a category description, but too generic as the product name.
- **Inspire to Piece**: useful as the name of the challenge demo journey, not the whole product.

**Decision:** Keep **Arutlee Studio** and describe it as Palm's personal creator operating system.

## One-Line Summary

Arutlee Studio is a personal creator operating system where Codex uses WebMCP to turn chosen inspiration and a persistent creator Brain into original, on-brand content inside a visible, controllable workspace.

## Target User

### Primary user

Palm, a time-constrained doctor, founder, AI builder, and aspiring internet personality who already works comfortably through Codex and Claude. He does not want to learn another AI chat interface or repeatedly explain his brand, taste, prior work, and production process.

Palm needs one place that:

- remembers his brand, voice, taste, published work, feedback, and production rules;
- tracks inspiration and content pieces;
- gives his preferred agent the tools needed to do real creative work;
- makes every result visible enough for him to judge and steer quickly;
- protects consequential actions behind explicit approval.

### Future user

A serious creator, founder, or small creative team that already uses a preferred AI agent and wants a persistent, brand-aware production workspace. Each future user should be able to bring their own creator Brain while using the same creative skills and WebMCP contracts.

The challenge build is designed for Palm first. It will not spend time building generic onboarding or proving every creator and agent combination.

## Problem

Content creation is fragmented across chat histories, social feeds, notes, source material, image tools, editing tools, and publishing systems. A general-purpose LLM can help with one task, but it usually starts without the full creator context and loses the state of the work after the conversation ends.

Existing creator products often introduce another built-in assistant. That creates a second place to talk, a second memory to maintain, and a weaker version of the agent the creator already uses every day.

Arutlee Studio already contains powerful production capabilities, but the workflow has become tool-centric and complicated. The important creative path is buried beneath stages and controls. Inspiration is also disconnected from the actual production session, so a creator still has to manually explain why a reference matters and how to transform it without copying it.

The core gap is this:

> The agent understands the conversation, while the website understands the creator's content system. They need a safe, precise way to work together.

WebMCP closes that gap. Arutlee Studio can expose a small set of contextual creative actions to Codex while keeping the Brain, artifacts, state, and approval boundaries inside the product.

## Core Workflow

1. Palm opens Codex and Arutlee Studio side by side. Codex is the conversation and orchestration layer. Studio is the persistent visual workspace.
2. Palm opens **Inspire**, a calm view within the Pieces workspace. It contains saved references from creators he chooses to track across Instagram, Facebook, and TikTok.
3. Palm selects a reference and gives Codex a natural instruction such as: "I like this visual metaphor, but not the corporate tone. Make an original carousel for my audience in my style."
4. Codex uses the WebMCP tools available in that page context to inspect the selected reference, record Palm's reaction, and request only the relevant slice of the creator Brain.
5. The Brain supplies a focused creative context packet: brand identity, voice rules, relevant taste signals, prior examples, current content goals, and the instructions for the carousel skill. It does not expose the entire personal Brain.
6. Codex identifies what Palm likes about the reference, separates the reusable creative principle from the original creator's execution, and creates a new linked piece in **Draft**.
7. Codex runs the first complete creative skill: an original seven-slide carousel. The skill creates the story structure and copy, generates clean visual layers without embedded text, applies deterministic Arutlee typography and layout, and renders the finished slide sequence.
8. Studio updates visibly as work happens. Palm can see the source, the new piece, its status, the slide sequence, and an activity trail of the agent's changes.
9. Palm revises through Codex in normal language. For example: "The first slide is too generic. Make the visual stranger but keep the copy simple." Codex updates the relevant slide and Studio shows the result immediately.
10. The finished carousel remains a saved draft or moves to Ready. Changes are reversible. Scheduling, publishing, deleting, and other consequential actions require explicit approval and are not part of the challenge demo.

The key interaction is not a button-heavy production pipeline. It is a conversation with Codex that produces inspectable work in Studio.

## What We Are Building

### 1. A simple Inspire entry point

- A distinct Inspire view inside the existing Pieces room.
- A manageable list of tracked creators.
- Saved inspiration cards with creator, platform, source link, media or preview, caption or transcript when available, and why the item was saved.
- Like and dislike feedback, with an optional short note that captures what Palm likes or rejects.
- A reliable prepared inspiration set for the demo, so the golden path does not depend on live social-platform scraping.

### 2. A persistent, selective creator Brain

- Brand identity, audience, voice, visual system, content goals, past work, taste signals, and production rules remain owned by Arutlee Studio.
- Codex can request the smallest relevant context packet for the current piece.
- Explicit reactions and accepted revisions can become future taste signals.
- Source lineage remains visible so inspiration can be transformed thoughtfully rather than copied.

### 3. A focused Codex-first WebMCP surface

- A deliberately small set of contextual tools for inspecting inspiration, recording feedback, retrieving relevant creative context, creating a piece, editing a carousel, and changing safe draft state.
- Inspire tools are available in the inspiration context. Piece-editing tools are available in the selected piece context.
- Tool descriptions and typed inputs are designed for Codex as the direct user of the interface.
- Tool actions update the same visible state Palm sees, rather than operating in a hidden parallel system.
- The contracts remain clean enough for other WebMCP-compatible agents later, but only the Codex path must be proven for the challenge.

### 4. One complete creative skill

- The carousel is the first reusable production skill.
- It produces an original seven-slide story, coherent visual direction, generated image layers where useful, branded typography, editable slide content, and final rendered assets.
- The normal path remains simple: create the draft, inspect the slide strip, revise, and finish the carousel.
- Existing carousel production and rendering capabilities are reused rather than rebuilt.

### 5. Visible control and safety

- New agent-created work appears as a session or piece in the existing left rail.
- Piece state remains visible through Draft, Ready, Scheduled, and Live groupings.
- Draft creation and revision can happen autonomously.
- Agent changes are visible, logged, and reversible.
- Publishing, scheduling, destructive removal, and other consequential actions require explicit user approval.

### 6. A premium visual experience

- The design bar is comparable to OpenAI's current web experiences: restrained, confident, spacious, and artifact-first.
- Arutlee borrows OpenAI's visual principles without copying its brand identity.
- The application shell stays near-monochrome and quiet. Source imagery, carousel work, and Arutlee's public visual identity provide the richness.
- Inspire is an image-led curated view rather than a dense social feed or analytics grid.
- The selected piece or carousel dominates the workspace. Agent state, source lineage, and controls remain secondary.
- WebMCP readiness appears as a subtle status, not a visible catalog of technical tools.
- The interface is designed for the real demo posture: Codex and Studio open side by side in a split desktop view.
- At narrower widths, secondary context collapses before the creative artifact shrinks.
- The intended feeling is a quiet private editorial studio, not a SaaS dashboard and not a chatbot wrapped around production tools.

### Scope ruler and definition of done

Palm has no fixed build-hour commitment and wants to be involved only for essential taste decisions and acceptance checks. The build must therefore minimize dependency on him.

The scoped product is done when Codex can reliably complete the prepared Inspire to original carousel journey, the Studio visibly reflects every important action, the result persists after reload, and Palm can revise and approve the draft without manually editing files or navigating the old production pipeline.

## What We Are Not Building

- **Automatic monitoring of Instagram, Facebook, and TikTok:** platform authentication, scraping, polling, and freshness are fragile and would consume the challenge. The demo uses saved or manually imported references while preserving the tracked-creator model for later.
- **Every creative output:** hero images, standalone posts, videos, animation overlays, SVG packs, captions, and other production skills remain in the product vision. The challenge proves the skill architecture with one excellent carousel workflow.
- **A native in-app chat:** Codex is the primary conversational interface. Studio should not build a weaker duplicate assistant for the demo.
- **Broad agent compatibility testing:** Claude and other agents are part of the future portability story, but challenge testing and polish focus on Codex.
- **Generic creator onboarding and accounts:** Palm's Brain and brand are preconfigured. A future onboarding flow can help another creator construct their own Brain.
- **Real social publishing or scheduling automation:** the demo ends at a durable draft or Ready state. Any future publish action must retain an explicit approval gate.
- **A full redesign of the existing engine:** the current data layer, content history, quality rules, carousel generation, rendering, and visual identity are foundations to simplify and expose, not features to rebuild.
- **Unrestricted Brain access:** the agent never receives the whole personal knowledge system when a small creative context packet is sufficient.
- **A large global tool catalog:** tools remain few, precise, and contextual. The goal is task completion, not tool-count theater.

These cuts protect the one thing judges must be able to see working end to end.

## Inspiration And References

### Product interaction references

- **Codex desktop and Claude Cowork:** the user stays in the agent they already know, with sessions on the left and durable work beside the conversation.
- **OpenAI's Codex Modeling Studio WebMCP demo:** people and Codex collaborate on the same visible canvas through different channels. This is the primary experience reference.
- **Google Cloud Tech's WebMCP demo:** contextual typed tools let an agent act faster and more reliably than screenshot or DOM guessing while the person receives visual feedback.
- **Greg Isenberg and Vinny's WebMCP discussion:** users bring their preferred agent and its existing context into a product. The practical test is whether the agent can finish the important job.
- **OpenAI WebMCP showcase:** the strongest current examples keep WebMCP visually quiet and make the shared human artifact the dominant interface.
- **Margin Editor:** calm left-rail navigation, generous typography, and feedback attached directly to the work.
- **Paperie and WanderNote:** editorial warmth, strong imagery, and visibly labeled agent suggestions inside a polished creative workspace.
- **Webroom:** one clear empty-state action, sparse dark chrome, and plain-language local privacy.

A dated visual comparison is stored in `docs/hackathon-build/research/webmcp-visual-market-scan.md`.

### Creative references currently identified by Palm

- @Fatherphi
- @Josesiles.data
- @AgenticMatt
- @JoeysDayintheLifee
- @jeffsu
- @realchasko
- @marcus_aiverse
- @nomadatoast

The system should learn what Palm responds to across these creators without copying their words, exact compositions, or identity. A reference is a starting point for extracting a hook, structure, visual device, or emotional effect. The output must remain original and visibly grounded in Palm's brand.

### Existing Arutlee foundation

- The existing two-room Studio architecture: Pieces and Desk.
- Persistent JSONL content records and piece history.
- Drafting, research, visual generation, quality audit, and pack or schedule stages.
- The opt-in carousel pipeline with editable slides, generated clean visual layers, deterministic Thai typography overlays, and 1080 x 1350 rendering.
- Arutlee's established public visual identity and content quality rules.

## Demo Path

The target demo should fit comfortably inside the required short submission video and make the WebMCP contribution obvious.

1. **Set the problem:** Palm wants to build an internet presence but has little time. His content knowledge is scattered and generic AI starts over every time.
2. **Show the two surfaces:** Codex is open beside Arutlee Studio. Studio is already on Inspire with a prepared feed and tracked creators.
3. **Choose taste, not a template:** Palm selects one reference and tells Codex what he likes and dislikes about it.
4. **Show WebMCP leverage:** Codex discovers the contextual Studio actions, records the reaction in the visible Inspire card, reads the selected reference, and retrieves only the relevant creator context.
5. **Create the piece:** Codex creates a new Draft session linked to the reference and runs the carousel skill. The seven-slide story and its branded visual previews appear in Studio.
6. **Collaborate visibly:** Palm gives one natural-language revision to Codex. Codex changes the specific slide, and the updated preview and activity trail appear immediately.
7. **Finish safely:** the rendered carousel persists as a draft or Ready piece. Studio shows that publish and other consequential actions still require approval.
8. **Reveal the larger vision:** carousel is the first skill. The same Brain and agent-native workspace can later support hero images, posts, videos, overlays, scheduling, and other creator workflows.

The moment judges should remember is:

> Palm gives Codex one inspiration. Codex understands what he likes, understands his brand, and creates an original carousel inside the visible Studio without Palm leaving the agent he already uses.

## Submission Story

### Product thesis

Creators should not have to abandon their preferred agent to use a creative product. Arutlee Studio turns the website itself into an agent-ready creator workspace. The Studio owns durable identity, taste, content state, production skills, and safety boundaries. Codex brings conversational intelligence and orchestration. WebMCP is the bridge between them.

### What existed before the challenge

- A local Arutlee Studio with persistent content records.
- A Pieces and Desk workspace.
- Research, drafting, visual, audit, and packaging workflows.
- An opt-in carousel editor, image generation path, branded rendering, and export.

### What the challenge adds

- A simpler Inspire-first creative entry point.
- Tracked inspiration and explicit taste feedback connected to piece creation.
- A selective creator Brain contract that gives an agent task-relevant context without exposing everything.
- Page-contextual WebMCP tools designed and tested for Codex.
- A complete external-agent collaboration loop where Codex creates and revises work in the visible Studio.
- Observable, reversible draft actions and clear approval boundaries.
- A focused demonstration that an agent can finish a meaningful creative job rather than merely navigate the interface.

### Why it matters

The project reframes creator software from a collection of AI buttons into a persistent operating environment for the creator and their chosen agent. It reduces repeated briefing, preserves creative memory, turns inspiration into accountable original work, and lets one time-constrained person operate a much richer content practice.

The broader ambition is one creator workspace that contains everything an agent needs to help produce carousels, hero images, posts, videos, and supporting production assets. The challenge submission earns that vision by first making one narrow workflow safe, working, meaningful, and beautiful.
