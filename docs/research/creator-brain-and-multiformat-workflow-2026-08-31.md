# Creator brain and multi-format workflow research

**Date:** 2026-08-31  
**Question:** What is the best interaction model for helping a creator (1) build and maintain a durable personal/brand brain and (2) turn ideas into native text, image, carousel, short-video, and long-video outputs?

## Executive answer

The strongest product model is **not a chat box plus a brand kit**. It is a creator-controlled operating system with three simple human-facing destinations:

1. **Brain** — an explicit, editable model of identity, audience, voice, visual language, boundaries, proven patterns, and current experiments.
2. **Studio** — a session for each idea where a human and their chosen agent turn one “idea nucleus” into a family of platform-native outputs.
3. **Inspire** — a living source radar that saves *mechanisms* worth learning from while preserving provenance and preventing copying.

Under those destinations, Arutlee should keep four product primitives separate:

1. **Library** — raw posts, links, notes, footage, transcripts, images, references, claims, and analytics. This is evidence and material, not memory.
2. **Brain** — concise, editable knowledge about this creator: identity, audience, voice, taste, boundaries, goals, and approved learning.
3. **Skills** — creator-independent ways of making a carousel, hero image, text post, short video, long video, or overlay pack.
4. **Workspace** — the current sessions, idea nuclei, drafts, versions, approvals, status, and publishing state.

`Inspire` is a curated view over the Library; `Create` is the human-facing view over the Workspace and Skills. This keeps the interface simple without contaminating identity with raw source material or temporary production instructions.

The Brain should grow progressively from creator behavior, but it should never silently convert an observation into a permanent rule. The system should propose learning, show where it came from, ask how broadly it applies, and let the creator approve, edit, reject, or retire it. Every generated artifact should record the Brain version, inspiration sources, claims, agent actions, and human approvals that produced it.

The market already contains pieces of this idea: platform-specific coaching and analytics, brand kits, templates and controls, and general-purpose model memory. The gap is a **portable, cross-platform, creator-owned memory and collaboration layer that any agent can use through WebMCP**.

## How creators appear to think

### Evidence

- An interview study with 21 multi-platform creators found that creators do not treat platforms equally. They dynamically prioritize platforms, synchronize and tailor content across them, and manage audiences across a “creator ecology.” The paper explicitly distinguishes this from ordinary cross-posting: creators adapt to each platform’s affordances and audience. ([Ma, Gui & Kou, CHI 2023](https://doi.org/10.1145/3544548.3581106))
- A 15-participant study of smaller TikTok creators describes creative work as **preparation, production, and presentation**, with tasks including topic research, material preparation, writing and rehearsal, filming, internal or external editing, trend research, captions, series linkage, and maintaining consistency of form, subject, communication style, and persona. It also found that pressure to repeat a successful niche can create burnout and alienate creators from their own creative intentions. ([Simpson & Semaan, CHI 2023](https://doi.org/10.1145/3544548.3580649); [author-hosted PDF](https://ellensimpson.github.io/assets/pdf/rethinkingcreativelabor.pdf))
- A 2026 interview study of 16 creators using GenAI found use across planning, production, editing, and post-management. Creators used models for ideation, research, scripts, and narrative structures, but performed substantial “responsibility work”: fact-checking, source verification, bias review, privacy protection, disclosure, and preservation of audience trust. ([Kim et al., CSCW 2026](https://doi.org/10.1145/3788080))
- In interviews with 19 professional writers, authenticity was not merely a surface writing style. Writers connected authenticity to the source of ideas, lived experience, values, voice, and who took action during the creative process. They liked personalization but wanted it to support growth, feedback, inspiration, and anticipated audience reaction—not only imitate prose. ([Hwang et al., 2024/CSCW](https://arxiv.org/abs/2411.13032))
- YouTube’s own guidance recommends grouping content by format, series, style/tone, intended audience, longevity, and production cost; comparing groups over a wide date range; checking outliers; and balancing analytics with what a creator genuinely wants to make. ([YouTube, “Tips to learn what content to create”](https://support.google.com/youtube/answer/13616340?hl=en))

### Product inference

Creators do not fundamentally think “make me an asset.” They move through a loop:

> **Who am I trying to be? → What do I want to say? → Who is this for? → What form will carry it best here? → What must I make? → Is this still mine? → What did I learn?**

The creator’s identity is both an anchor and an evolving practice. A useful system must protect stable commitments without trapping the creator in the niche or aesthetic that most recently performed well.

That suggests five kinds of knowledge rather than one undifferentiated memory:

| Layer | What belongs here | Change rate |
|---|---|---|
| **Foundation** | purpose, worldview, values, trust boundaries, recurring audiences, non-negotiables | slow |
| **Expression** | voice, vocabulary, visual grammar, image treatment, pacing, on-camera presence, examples and counterexamples | gradual |
| **Format playbooks** | carousel rhythm, Reel structure, long-video storytelling, hero-image rules, platform constraints | medium |
| **Strategy and experiments** | current goals, hypotheses, series, campaigns, what the creator is testing | fast |
| **Piece context** | the brief, sources, constraints, selected memories, footage, claims, and decisions for one artifact family | temporary |

## 1. The best way to create and maintain the Brain

### 1.1 Progressive onboarding, not a brand questionnaire

**Evidence:** Current brand systems centralize logos, colors, fonts, imagery, guidelines, templates, controls, and approvals. Canva places contextual guidance inside the editor and supports templates plus locked elements; Adobe Express can start manually or extract colors, fonts, and logos from uploaded work. ([Canva Brand Hub](https://www.canva.com/newsroom/news/home-for-every-brand/); [Adobe Express brands](https://helpx.adobe.com/express/web/brands-libraries-projects/create-manage-brands/create-brand.html))

**Inference for Arutlee:** A creator’s personal brand is richer and less settled than a corporate brand kit. Do not begin with 30 empty fields. Begin with high-signal material:

1. Import or link existing posts, images, videos, writing, and profiles.
2. Ask the creator to select **three pieces that feel most like me** and **three that do not**.
3. Ask five conversational questions: desired identity, core audiences, themes they want to own, lines they will not cross, and what success currently means.
4. Generate a **draft Brain** with evidence attached to every inference.
5. Ask the human to approve or correct the draft before any inferred rule becomes active.

The cold-start promise should be: **“Give us your work, not a branding homework assignment.”**

### 1.2 Make every memory atomic, scoped, and attributable

General-purpose memory systems already demonstrate useful interaction patterns: an editable summary, automatic synthesis, source inspection, corrections, deletion, and temporary sessions. OpenAI’s current Memory documentation also acknowledges that older item-by-item memories could become stale or contradictory and now exposes sources used for personalization. ([OpenAI Memory FAQ](https://help.openai.com/en/articles/8590148))

Arutlee should go further because creator memory affects public work. Every Brain item should contain:

- **Statement:** “Open with a surprising tension, not a generic question.”
- **Type:** foundation, expression, format rule, strategy hypothesis, safety boundary.
- **Scope:** always / this audience / this platform / this series / this piece.
- **Status:** observed / proposed / approved / disputed / retired.
- **Provenance:** explicit user statement, source sample, edit, like/dislike reason, performance pattern, or agent inference.
- **Evidence:** linked pieces, before/after edits, audience comments, or analytics cohort.
- **Exceptions and counterexamples:** when not to use it.
- **Last used / outputs affected:** a trace from memory to artifact.
- **Owner and version:** who changed it and when.

### 1.3 Learning must be proposed, not silently committed

The safest learning loop is:

> **Observe → propose → explain → scope → approve → apply → evaluate → keep or retire**

Examples:

- After Palm repeatedly replaces abstract openings with concrete observations, Arutlee proposes: “You usually prefer a concrete lived observation before the thesis.”
- After a disliked inspiration item, Arutlee asks an optional one-tap reason—“too corporate,” “too generic,” “visual style,” “wrong topic,” or free text—then proposes an inspiration preference rather than a global brand rule.
- After a successful post, Arutlee does **not** declare the visual style universally superior. It proposes an experiment or a scoped hypothesis.

The critical scope control is a simple question when corrections matter:

> **Learn this for:** this piece / this series / TikTok / all future work

This protects creators from accidental overfitting and from the niche pressure documented in the TikTok creator study. ([Simpson & Semaan, CHI 2023](https://doi.org/10.1145/3544548.3580649))

### 1.4 The Brain screen should feel alive, not like a database

The Brain home should answer four questions:

1. **What does Arutlee understand about me now?**
2. **What did it use in my latest piece?**
3. **What has it recently learned or become uncertain about?**
4. **What needs my decision?**

Recommended sections:

- **Your foundation** — small, calm, mostly stable.
- **How you create** — voice, visuals, storytelling, production preferences.
- **Learning inbox** — proposed memories, contradictions, stale rules, and experiments.
- **Used recently** — memory-to-output trace.
- **Do not learn from this** — explicit exclusions for private, client, experimental, or one-off sessions.

The maintenance habit should be a five-minute weekly review, not continuous configuration.

### 1.5 Analytics should create hypotheses, not commandments

YouTube advises creators to compare meaningful content groups over broad time periods, inspect outliers, and look for patterns in topic, title/thumbnail, length, retention, style, and format. It also warns that audiences differ by format and that different formats support different goals. ([YouTube content planning](https://support.google.com/youtube/answer/13616340?hl=en); [YouTube Content tab](https://support.google.com/youtube/answer/12340301?hl=en-GB))

Meta’s 2026 Creator Assistant announcement identifies “understanding why” as a major creator difficulty and combines performance, timing, audience consumption, content style, community, and goals into conversational recommendations. This is first-party product positioning, not independent proof, but it confirms the direction major platforms are taking. ([Meta Creator Assistant](https://about.fb.com/news/2026/06/creator-assistant-more-languages-for-ai-translations-on-facebook/))

Arutlee should therefore:

- Compare within the same creator, platform, format, audience, and goal where possible.
- Attach metrics to the exact published version and Brain snapshot.
- Separate observed correlation from an approved lesson.
- Detect viral outliers rather than allowing one hit to redefine the Brain.
- Include qualitative signals—comments, shares, saves, user reports—not only reach.
- Propose a next experiment with one main variable.
- Let the creator say, “This performed, but I do not want to become this.”

## 2. The best way to generate many kinds of content

### 2.1 Start with an “idea nucleus,” not a format

Every creation session needs one canonical source of truth:

- creator’s core point of view;
- audience and desired change;
- content job: teach, persuade, entertain, document, sell, or connect;
- proof, sources, and claims;
- emotional promise;
- desired call to action;
- inspiration mechanism;
- available materials: footage, images, links, quotes, notes, voice memo;
- time and production budget;
- selected Brain memories and exceptions.

The agent can propose missing fields instead of interrogating the creator. The human approves this nucleus before expensive production begins.

### 2.2 Generate a content family, not resized copies

The cross-platform creator study found both synchronization and tailoring. YouTube exposes viewer overlap across videos, Shorts, and live specifically because audiences may or may not cross formats. TikTok’s first-party guidance is strongly format-native: 9:16 composition, safe zones, sound, trend awareness, dynamic stimulation, and a hook–body–close structure. ([Ma, Gui & Kou, CHI 2023](https://doi.org/10.1145/3544548.3581106); [YouTube Content tab](https://support.google.com/youtube/answer/12340301?hl=en-GB); [TikTok Creative Codes](https://ads.tiktok.com/business/en/blog/creative-best-practices-top-performing-ads))

**Inference:** The reusable object is the idea and its evidence—not a single master layout. Arutlee should produce a family tree:

```text
Idea nucleus
├── Hero image: one promise + one focal visual
├── Text post: thesis + proof + creator stance + conversation prompt
├── Carousel: cover tension + progressive argument + payoff + CTA
├── Short video: hook + beats + footage/overlays + sound + close
└── Long video: story arc + chapters + retention beats + evidence + derivatives
```

Each child inherits identity and facts but receives its own native structure, pacing, aspect ratio, density, audio plan, and call to action.

### 2.3 Format-specific production contracts

| Output | Agent should produce | Human should decide |
|---|---|---|
| **Text post/caption** | angle options, structure, draft, proof links, platform length variants | point of view, truth, vulnerable/personal boundaries, final wording |
| **Hero image/thumbnail** | promise hierarchy, focal concept, image direction, title-safe composition, variants | which idea represents them, likeness, final claim and visual |
| **Carousel** | slide-level narrative, cover hooks, copy density, image directions, continuity, CTA | story order, claims, examples, strongest cover, final sequence |
| **Short video/Reel/TikTok** | hook options, beat sheet, script or talking points, shot list, overlays, captions, sound direction, safe zones | performance style, what to film, authenticity, final cut |
| **Long video** | premise, outline, chapters, retention beats, research packet, script/talking points, B-roll and graphics, title/thumbnail tests, clip map | depth, argument, lived stories, pacing, final edit |

Meta already supports repurposing existing videos and livestreams into Reels with finishing touches, and A/B testing captions and thumbnails. The useful pattern is “reuse the source, then adapt and test,” not “publish the same artifact everywhere.” ([Meta creator testing and reuse](https://about.fb.com/news/2023/11/helping-creators-test-content-and-earn-rewards/amp/))

### 2.4 The human–agent collaboration should happen at decision boundaries

Recommended piece stages:

> **Seed → Direction → Plan → Draft → Review → Ready → Published → Learning**

The agent should work autonomously within an approved stage and stop at meaningful decisions:

1. **Direction approval:** Is this the right point of view and audience promise?
2. **Plan approval:** Is this the right narrative and format family?
3. **Artifact review:** Keep, edit, regenerate a part, or undo.
4. **Truth/safety review:** Are claims sourced, people represented appropriately, privacy protected, and AI involvement handled correctly?
5. **Publish approval:** Always human-owned in the contest MVP.
6. **Learning approval:** What, if anything, should change in the Brain?

This is supported by provenance research: HaLLMark captured and visualized writer–LLM interaction, and its evaluation with 13 creative writers found that provenance visualization helped retain control and ownership. ([Hoque et al., CHI 2024](https://doi.org/10.1145/3613904.3641895); [institutional record](https://iro.uiowa.edu/esploro/outputs/conferenceProceeding/The-HaLLMark-Effect-Supporting-Provenance-and/9984787459302771))

For Arutlee, the review moment should visibly show:

- what changed;
- why the agent changed it;
- which memories and sources it used;
- before/after or diff;
- keep / edit / undo;
- whether accepting this should teach the Brain.

### 2.5 Inspiration should save mechanisms, not copies

TikTok describes trends as templates for creativity and directs creators toward live trend and top-ad discovery. Meanwhile, Meta’s current Facebook originality guidance distinguishes substantial new analysis, information, or storyline improvement from duplicative content and minor edits; minor changes to another creator’s work are deprioritized. ([TikTok Creative Codes](https://ads.tiktok.com/business/en/blog/creative-best-practices-top-performing-ads); [Meta original-content guidance](https://about.fb.com/news/2026/03/rewarding-original-creators-on-facebook/amp/))

**Inference for Inspire:** A saved source should contain:

- original URL, creator, platform, capture date, and media snapshot;
- what specifically worked: hook mechanism, narrative device, visual grammar, pacing, proof pattern, CTA, or audience interaction;
- why it fits this creator;
- what must not be copied: wording, composition, identity, footage, or proprietary claim;
- license/permission status where relevant;
- like/dislike plus reason;
- “Create from this” should start a new idea nucleus containing the mechanism and provenance, not clone the source.

The UI phrase should be: **“Borrow the mechanism. Keep your identity.”**

## 3. Bring-your-own-agent and WebMCP collaboration

The WebMCP draft describes web applications exposing structured JavaScript tools to agents and explicitly frames the result as users and agents working in the same interface with shared context and user control. It also warns about ambiguous tool semantics, privacy leakage through over-parameterization, and high-privilege authenticated actions. It is a Community Group draft, not a W3C Standard. ([WebMCP draft, 26 Aug 2026](https://webmachinelearning.github.io/webmcp/))

### Recommended division of responsibility

- **Creator:** intention, identity, truth, personal disclosure, final approval, publishing.
- **Chosen agent (Codex, Claude, ChatGPT, etc.):** reasoning, orchestration, drafting, transformation, critique.
- **Arutlee:** durable creator context, source and asset custody, format skills, workflow state, provenance, validation, approvals, and learning.

This means Arutlee does not need to compete as another general-purpose chat product. The web interface is the shared workspace; the external agent is the conversational cockpit.

### Recommended WebMCP tool families

| Class | Example tools | Permission |
|---|---|---|
| **Read context** | `brain_context`, `piece_read`, `inspiration_open`, `format_requirements`, `analytics_summary` | read-only |
| **Draft work** | `piece_create`, `direction_propose`, `format_plan_create`, `draft_update`, `visual_request` | reversible; receipt shown |
| **Review** | `piece_diff`, `source_lineage`, `quality_check`, `piece_undo` | reversible/read-only |
| **Learning** | `memory_propose`, `memory_evidence`, `memory_scope` | proposal only |
| **Human-gated** | `memory_approve`, `piece_mark_ready`, `publish` | explicit human confirmation; publishing can remain UI-only |

Every tool response should return the changed object/version, effect, warnings, and next allowed actions. Names must be unambiguous—`piece_mark_ready` is safer than `finish`; `publish_to_instagram` is safer than `finalize`.

## 4. Market gap and positioning

### What already exists

- **Platform coaching:** Instagram Best Practices covers creation, engagement, reach, monetization, and guidelines with personalized tips. Meta Creator Assistant connects Facebook-specific style, performance, community, trends, and goals. ([Instagram Best Practices](https://about.fb.com/news/2024/10/best-practices-education-hub-creators-instagram/amp/); [Meta Creator Assistant](https://about.fb.com/news/2026/06/creator-assistant-more-languages-for-ai-translations-on-facebook/))
- **Analytics:** YouTube compares performance and audience overlap across formats; Meta offers retention, audience and distribution insights and testing. ([YouTube Content tab](https://support.google.com/youtube/answer/12340301?hl=en-GB); [Meta creator testing](https://about.fb.com/news/2023/11/helping-creators-test-content-and-earn-rewards/amp/))
- **Brand governance:** Canva and Adobe centralize visual assets, templates, rules, and approvals. ([Canva Brand Hub](https://www.canva.com/newsroom/news/home-for-every-brand/); [Adobe Express brands](https://helpx.adobe.com/express/web/brands-libraries-projects/create-manage-brands/create-brand.html))
- **General memory:** ChatGPT provides evolving memory, source visibility, correction, deletion, and project scoping, but it is not a creator production ledger or cross-agent brand system. ([OpenAI Memory](https://help.openai.com/en/articles/8590148); [OpenAI Projects](https://help.openai.com/en/articles/10169521-using-projects-in-chatgpt))

### The defendable Arutlee gap

> **Arutlee is the creator-owned memory and workflow layer that makes any agent consistently “you” across every format and platform—without taking away your control.**

The differentiated bundle is:

1. Cross-platform rather than owned by one distribution platform.
2. Identity plus creative process, not only colors/fonts or analytics.
3. Explicit editable memory with provenance, scope, and learning approval.
4. One idea transformed into native format families with lineage.
5. Inspiration mechanisms preserved without copying expression.
6. Bring-your-own-agent through WebMCP rather than a locked assistant.
7. Human decision points, reversible changes, and a visible audit trail.

## 5. Recommended MVP sequence

### Must prove in the hackathon demo

1. **Connect the Brain:** show a concise approved creator foundation plus a learning inbox.
2. **Choose inspiration:** save a source and extract a mechanism with provenance.
3. **Ask any agent:** through WebMCP, create an idea nucleus and a carousel or short-video plan.
4. **See the agent use memory:** expose the exact memories and source mechanism selected.
5. **Review one meaningful change:** show before/after, keep/edit/undo, and human control.
6. **Learn deliberately:** propose one scoped memory from the accepted correction; human approves it.
7. **Adapt natively:** create at least one second format from the same nucleus, visibly changed for the format rather than merely resized.

### Build priority

1. Brain item model: scope, status, provenance, evidence, versioning.
2. Piece idea nucleus and stage machine.
3. Carousel production plus one credible short-video plan/asset pack.
4. Memory selection and visible “why this is yours” receipt.
5. Inspiration mechanism extraction and originality guardrail.
6. WebMCP read, draft, review, and memory-proposal tools.
7. Manual analytics import or seeded learning demo; live platform integrations can follow.

## Evidence limits

- The academic creator studies are qualitative and use small samples; they reveal practices and tensions but do not establish a single universal creator workflow.
- Platform guidance is authoritative about each platform’s product and stated recommendations, but it also reflects platform incentives and in several cases concerns advertising, not all organic creator work.
- Meta’s 2026 Creator Assistant announcement is competitor/product evidence, not independent evidence of effectiveness.
- Product documentation shows useful interaction patterns but does not prove that those exact patterns should be copied into Arutlee.
- The WebMCP specification is a current Community Group draft and may change; it is explicitly not yet a W3C Standard.
- All Arutlee recommendations labeled “inference” are product synthesis from the evidence above and should be tested with creators.

## Primary sources used

1. Renkai Ma, Xinning Gui, and Yubo Kou. [“Multi-Platform Content Creation: The Configuration of Creator Ecology through Platform Prioritization, Content Synchronization, and Audience Management.”](https://doi.org/10.1145/3544548.3581106) CHI 2023.
2. Ellen Simpson and Bryan Semaan. [“Rethinking Creative Labor: A Sociotechnical Examination of Creativity & Creative Work on TikTok.”](https://doi.org/10.1145/3544548.3580649) CHI 2023. [Author PDF](https://ellensimpson.github.io/assets/pdf/rethinkingcreativelabor.pdf).
3. Jini Kim et al. [“Content Creation with Generative AI: How Do Content Creators Responsibly Use Generative AI Tools?”](https://doi.org/10.1145/3788080) CSCW 2026.
4. Angel Hsing-Chi Hwang et al. [“It was 80% me, 20% AI: Seeking Authenticity in Co-Writing with Large Language Models.”](https://arxiv.org/abs/2411.13032)
5. Md Naimul Hoque et al. [“The HaLLMark Effect: Supporting Provenance and Transparent Use of Large Language Models in Writing with Interactive Visualization.”](https://doi.org/10.1145/3613904.3641895) CHI 2024.
6. YouTube Help. [“Tips to learn what content to create.”](https://support.google.com/youtube/answer/13616340?hl=en)
7. YouTube Help. [“Posts and channel performance: Content tab tips.”](https://support.google.com/youtube/answer/12340301?hl=en-GB)
8. TikTok for Business. [“Creative Codes: 6 principles for creating on TikTok.”](https://ads.tiktok.com/business/en/blog/creative-best-practices-top-performing-ads)
9. Meta. [“Introducing Best Practices, an Education Hub for Creators on Instagram.”](https://about.fb.com/news/2024/10/best-practices-education-hub-creators-instagram/amp/)
10. Meta. [“Introducing Creator Assistant, Plus More Languages For AI Translations on Facebook.”](https://about.fb.com/news/2026/06/creator-assistant-more-languages-for-ai-translations-on-facebook/)
11. Meta. [“Helping Creators Test Content and Earn Rewards.”](https://about.fb.com/news/2023/11/helping-creators-test-content-and-earn-rewards/amp/)
12. Meta. [“Rewarding Original Creators on Facebook.”](https://about.fb.com/news/2026/03/rewarding-original-creators-on-facebook/amp/)
13. OpenAI Help Center. [“Memory FAQ.”](https://help.openai.com/en/articles/8590148) and [“Projects in ChatGPT.”](https://help.openai.com/en/articles/10169521-using-projects-in-chatgpt)
14. Canva. [“Introducing the home for every brand.”](https://www.canva.com/newsroom/news/home-for-every-brand/)
15. Adobe Express. [“Create brands.”](https://helpx.adobe.com/express/web/brands-libraries-projects/create-manage-brands/create-brand.html)
16. Web Machine Learning Community Group. [WebMCP Draft Community Group Report, 26 August 2026.](https://webmachinelearning.github.io/webmcp/)
