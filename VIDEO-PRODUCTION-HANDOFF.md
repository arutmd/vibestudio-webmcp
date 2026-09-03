# Arutlee Studio Video Production Handoff

Use this brief when another Codex session is working on video support in the
Arutlee Studio dashboard.

## Why This Exists

Palm wants Arutlee video content to follow the lean explainer-short format seen
in Jeff Su's AI/productivity Shorts:

- Fixed talking-head setup.
- Clear script-first explanation.
- Simple screen recordings and visual cards.
- Reusable motion/graphic templates.
- Fast repeatable editing, not a custom production house workflow.

The goal is consistent output with low production overhead.

## Source Pattern Investigated

Examples reviewed:

- `https://www.youtube.com/shorts/jxHIw_OA8_I`
- `https://www.youtube.com/shorts/gbI7THwqEjk`
- `https://www.youtube.com/shorts/6PZCZWvNVHc`
- `https://www.youtube.com/shorts/kCxlQcKsoZg`

Observed format:

- 40-60 second vertical Shorts.
- Hook in the first 1-3 seconds.
- Usually 3 terms, 3 shifts, or 1 feature explained through 2-3 beats.
- Alternates between face camera and visual evidence.
- Visuals are simple: dark cards, UI crops, labels, arrows, highlights, before
  and after comparisons.
- Captions are always visible.
- The video descriptions read like polished scripts, which implies the script
  likely drives the edit.

External production clues from Jeff Su's own site:

- Main editor stack: Final Cut Pro.
- Motion templates/plugins: MotionVFX.
- Screen capture: CleanShot X.
- Music: Epidemic Sound.
- He also has or has sought video-editor help for long-form and vertical
  short-form content.

Inference:

- This is probably not HTML-to-video as the creator's default workflow.
- It is more likely Final Cut Pro plus reusable templates, screen recordings,
  captions, and a fixed camera setup.
- However, HTML-to-video is still a strong option for Arutlee because Codex can
  generate repeatable visual cards and diagrams locally.

## Arutlee Direction

Do not build a heavy production-house system.

Build a lean "Video Production Kit" inside Studio:

1. Turn a content piece into a short-form video script.
2. Split the script into timed scenes.
3. Assign each scene a reusable visual module.
4. Generate the talking-head shot list.
5. Generate visual-card prompts or HTML scene specs.
6. Export a production checklist that Palm can follow in CapCut, Final Cut, or
   later an automated renderer.

The first version should help Palm produce consistently. It does not need to
render a final MP4 yet.

## Reusable Visual Modules

Start with only these five modules:

1. Definition Card
   - One concept, one sentence explanation.
   - Example: "Grounding: answer from source material, not memory."

2. Before/After
   - Two-column or stacked comparison.
   - Example: "Prompt only" vs "Prompt plus source plus constraints."

3. Flow Diagram
   - Source or clinical context -> AI/tool -> useful output.
   - Use simple boxes and arrows.

4. Tool Demo Frame
   - Screen recording or screenshot with highlight box.
   - Good for ChatGPT, Claude, NotebookLM, wearable apps, dashboards.

5. Rule Of Thumb Card
   - Final takeaway.
   - One practical sentence, easy to screenshot.

These are enough for the first Arutlee explainer format.

## Suggested Studio Feature

Add a video-oriented panel or mode in Workbench, probably near platform variants.
Possible names:

- Video Kit
- Reel Kit
- Short Script
- Explainer Kit

Recommended MVP fields:

- `video_hook`
- `video_script`
- `video_scenes[]`
- `visual_modules[]`
- `talking_head_shots[]`
- `screen_recording_needs[]`
- `caption_style`
- `edit_notes`
- `export_checklist`

Recommended scene shape:

```ts
type VideoScene = {
  id: string;
  start_sec: number;
  end_sec: number;
  spoken_line: string;
  visual_type:
    | "talking_head"
    | "definition_card"
    | "before_after"
    | "flow_diagram"
    | "tool_demo"
    | "rule_of_thumb";
  visual_brief: string;
  production_note?: string;
};
```

## MVP User Flow

Inside a piece:

1. Palm clicks `Generate Video Kit`.
2. Studio creates a 40-60 second script using the current piece, source summary,
   and platform choice.
3. Studio creates 6-10 scenes.
4. Studio labels each scene with one of the five visual modules.
5. Studio shows a production checklist:
   - record these lines on camera
   - capture these screen recordings
   - generate or design these visual cards
   - assemble in this order
6. Palm can edit any scene manually.
7. Save writes the kit into the piece folder.

Suggested disk output:

```text
pieces/<slug>/video/
  script.md
  scenes.json
  shot-list.md
  visual-briefs.md
  edit-checklist.md
```

Do this before trying to automate final video rendering.

## Future Automation Path

Stage 1: Production kit only.

- Fastest to build.
- Useful immediately.
- Palm still assembles in CapCut or Final Cut.

Stage 2: HTML visual-card renderer.

- Generate 1080x1920 HTML/CSS cards for the five visual modules.
- Screenshot/export each card as PNG.
- Use these in CapCut or Final Cut.

Stage 3: HTML/React-to-video.

- Use Remotion or Playwright plus ffmpeg to render visual-only segments.
- Combine with talking-head footage manually first.

Stage 4: Full video assembly.

- Import talking-head footage.
- Auto-place visual segments.
- Add captions/music/export MP4.
- This is not needed for MVP.

## Arutlee Guardrails

- Keep it local-first.
- Do not require a production house.
- Do not design a new visual identity for every video.
- Preserve Arutlee wedge: first Thai MD plus AI-heavy content plus recognizable
  visual IP.
- Spend effort on explanation quality and reusable templates, not custom edits.
- Default to ChatGPT Image 2.0 for raster visual IP when the dashboard produces
  image prompts, especially when Thai text rendering matters.
- Prefer practical output over abstract advice: files, scene lists, prompts, and
  checklists.

## Pasteable Prompt For Another Codex Session

Read `studio/VIDEO-PRODUCTION-HANDOFF.md`, `studio/SPEC.md`, and the current
Workbench components. Implement the Stage 1 MVP for Arutlee video production:
add a lean Video Kit flow that turns an existing piece into a 40-60 second
short-form explainer production pack. It should generate and save `script.md`,
`scenes.json`, `shot-list.md`, `visual-briefs.md`, and `edit-checklist.md`
under `pieces/<slug>/video/`. Keep it local-first, follow existing Studio
patterns, and do not attempt full MP4 rendering yet.

