# VibeStudio Submission Handoff

## One-line story

ChatGPT can create content. VibeStudio gives the agent you already use an editable creator Template, reusable production skills, visible history, and a safe workspace so every new piece becomes faster and more consistently yours.

## What the challenge build proves

| Layer | Owns | Challenge proof |
| --- | --- | --- |
| Creator Template | Identity, audience, voice, taste, goals, examples, accepted learning | Visible, editable, source-linked memory and bounded receipts |
| Creative skill | Creator-independent method | `carousel-v1@1.0.0`, exactly seven 1080 × 1350 slides |
| WebMCP workspace | Contextual actions, versions, activity, undo, progress | Codex discovers only the tools for the current Inspire, Piece, or Brain view |
| General model | Reasoning, writing, and image generation | Codex transforms one saved inspiration into an original carousel and three text-free visual layers |

## 78-second narrated demo

1. Name the repeated-brief problem: capable AI still starts every piece from zero.
2. Define VibeStudio as inspiration, editable Template, and reusable skills in one shared workspace.
3. Show the real multimodal Inspire surface and explicit save, like, dislike, and note signals.
4. Show WebMCP discovering contextual tools, starting a Session, and connecting Codex to the visible artifact.
5. Contrast the bounded ten-rule task receipt with protected creator memory.
6. Show the real one-slide revision, version 2, Codex attribution, review state, and Undo.
7. Resolve on the finished carousel and VibeStudio promise: bring your agent; keep your creative system and final say.

## Existing foundation versus challenge work

Existing before the challenge: the local Next.js Studio, JSONL content records, the advanced carousel editor and renderer, and the Codex image-generation bridge.

Added for the challenge: creator and inspiration stores, curated real references, editable Template records, deterministic context selection and receipts, activity/version/idempotency/undo, the reusable carousel skill contract, current WebMCP registration with contextual tool sets, the VibeStudio shell, the new Inspire and Template experiences, artifact-first Session workspace, careful learning, and the end-to-end Codex demo.

## Proof package

- Product requirements: `docs/hackathon-build/prd.md`
- Technical architecture and safety boundaries: `docs/hackathon-build/spec.md`
- Selected visual target: `docs/hackathon-build/design/selected-visual-target.png`
- Target-versus-build comparison: `docs/hackathon-build/evidence/design-qa-comparison.png`
- Design QA: `design-qa.md`
- Golden-path acceptance: `docs/hackathon-build/evidence/acceptance.md`
- Finished carousel: `docs/hackathon-build/evidence/carousel-contact-sheet.png`
- Demo-video plan and source: `videos/vibestudio-webmcp-demo/`
- Demo-video contact sheet: `videos/vibestudio-webmcp-demo/snapshots-review/contact-sheet.jpg`
- Build record: `docs/hackathon-build/build-notes.md`

## Local setup

1. Install dependencies with `npm install`.
2. Start Studio with `npm run dev`.
3. Open `http://127.0.0.1:4321` beside Codex Desktop.
4. For new generated visual layers, keep the Codex CLI signed in with native image generation enabled.

This source package includes a sanitized judge mode for public hosting. It uses generic seed records in an isolated data root and disables private or outbound integrations. The production dependency audit is clean; public deployment acceptance is still required.

## Next workflow

Render and publish only after Palm's explicit approval. Do not send the final Devpost entry until Palm reviews the final copy, screenshots, video, repository URL, public demo, and privacy boundary and then says “yes, submit.”
