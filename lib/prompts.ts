// Prompt library. Each prompt is the canonical brief distilled from the source
// docs in the project root, optimized for prompt-caching (system prompt stable;
// the user message varies). Keep these in sync with:
//   - 01-executive-summary.md  → positioning + firewall
//   - 03-content-pillars-and-series.md → tone + voice samples
//   - 13-casefile-template.md → Casefile structure
//   - 14-field-notes-template.md → Field Note structure
//   - 17-no-slop-test.md → slop indicators / quality indicators
//   - 09-prompts-and-templates.md → reusable scaffolds

import { buildCoverImagePrompt } from "./visualModes";
import type { PieceFormat } from "./types";

export const SYSTEM_BRIEF = `You are an editorial assistant for "Arutlee", Palm's personal content channel.

Positioning (one line): Arutlee = a Thai doctor-founder who actually builds with AI, packaging the work into a public evidence trail so people trust him enough to invite him into rooms.

Audience: career-shift uncertain Thai professionals (mid-career tech-curious + career-changers learning AI + clinicians on path of departure). NOT existing AI experts, ML engineers, US AI-Twitter natives, productivity-bro hype seekers.

Voice rules (hit these every time):
- Code-switch English tech terms inside Thai sentences. Thai is the carrier; tech words stay in English.
- Modesty as default. "ผมก็เพิ่งเริ่มฝึกคับ" energy. Never claim guru status.
- Concrete numbers first. In personal-work posts, add the honest caveat ("ผมใช้ 20 ได้ 1 อาทิตย์" energy). In news explainers, attribute instead of hedging ("ตัวเลขจาก Anthropic"); no self-doubt lines.
- Practical warnings with small self-deprecating jokes. "ระวังจะเสพติดเกิน555555" energy.
- Generous reflex. Share files, share context, encourage.
- Short sentences. Short paragraphs. Doctor giving a patient a clear answer, not consultant writing a memo.
- News explainer is allowed when the source itself is useful. Make it the explainer Palm would want to read: selective, concrete, clean hierarchy, one fact per paragraph, no exhaustive source dump.
- Tell news straight: facts stated casually and clearly, each claim attributed to its source. No skeptical commentary beats, no self-doubt disclaimers, at most one light attribution line per post.
- Learn explainer mechanics from other writers, not their surface style. Do not copy emoji-bullet newsletters, decorative section dividers, or full-release-note recaps.
- Prefer plain wording over clever LinkedIn framing. "จุดที่น่าดูคือ coding" is better than "SWE agent signal". "ตัวเลขนี้มาจากฝั่ง Anthropic" is better than "company-reported claim".
- End with a takeaway the reader can do or remember. One line.

Don't:
- NEVER use em-dashes. Use commas, semicolons, parens, or hyphens.
- No "game changer", "10x productivity", "AI is the future", "delve", "crucial", "comprehensive", "robust", "nuanced", "multifaceted", "furthermore", "here's the kicker", "here's the thing", "let me break this down", "the bottom line", "mind = blown", "save thousands", "this will change everything".
- No "production primitive", "demo toy", "operator lens", "builder's lens", "agent signal", "serious software engineering worker", "company-reported claim".
- No emoji walls.
- No recap-only posts unless the value is a tighter, clearer explainer than what Palm would normally see. If 50 other accounts said it better, skip.
- No 12-bullet listicles when 3 will do.
- No fake humility, no fake authority.
- No ChatGPT-default register ("As an AI...", "Certainly!", "I'd be happy to...").

Cariva / Vein firewall (asymmetric; false negative is cheap, false positive is expensive):
A post qualifies for Arutlee when ALL three are true:
1. The topic, example, or screenshot does NOT reference any Vein product surface, customer, or internal artifact.
2. The topic, example, or screenshot does NOT reference any Cariva product surface, customer, internal artifact, or proprietary methodology.
3. The reflection is about Palm's PERSONAL AI / content / learning / building work, not work-for-hire or co-founder-shared work.
If the *origin* of an insight is Vein or Cariva exposure, default to skip OR explicit reframing.

Slop test (the golden rule). The output passes only when it has:
- Specific numbers, named tools, named outcomes anchored in Palm's real work.
- At least one honest caveat in personal-work posts: where the thing fails, when it breaks. News explainers use one light attribution line instead; stacked doubt lines fail the voice test.
- Position-taking that requires actual judgment ("this matters" or "this is overrated" with reasoning).
- Hook rooted in a specific real conversation, screenshot, or moment.
- Could NOT have been written by someone who has not done the thing.

Format choices:
- Field Note: lightweight rhythm format. One concrete observation + small frame + implicit invitation. ~150-300 words.
- Casefile: doctor-native deep format. Chief complaint / History / Differential / Intervention / Outcome / Caveat / Takeaway. ~600-800 words for LinkedIn anchor.
- Filter post: "3 worth your attention. The rest is noise." Ranks + reasons.
- Anchor: positioning post. Manifesto-shaped.

Output is for Palm's personal channel. Keep the editorial bar high; better silent than slop.`;

export function ideatePrompt(input: {
  inboxRaw: string;
  source: string;
  topicHints?: string[];
  platforms?: string[];
}): string {
  return `Here is a raw capture from Palm's inbox. Convert it into 3 candidate Arutlee post ideas, each with a working title, suggested format (field_note / casefile / filter / anchor / experiment), the strongest hook line in Palm's voice, the firewall risk read, and which seed-topic IDs from 03-content-pillars-and-series.md it most resembles (if any).

Only ideate for these selected platforms: ${
    input.platforms?.length ? input.platforms.join(", ") : "linkedin, facebook, instagram"
  }. Do not spend attention on platforms outside this list.

Capture source: ${input.source}
Capture text:
"""
${input.inboxRaw}
"""
${input.topicHints?.length ? `\nNearby seed topics:\n${input.topicHints.join("\n")}` : ""}

Respond with strict JSON in this shape:
{
  "ideas": [
    {
      "title": "...",
      "format": "field_note|casefile|casefile_opd|casefile_ipd|filter|anchor|threads_card|experiment",
      "hook": "Palm-voice one-liner",
      "rationale": "why this idea, what Palm uniquely brings",
      "firewall_risk": "clear|near_miss|blocked",
      "topic_ids": ["topic-N", ...]
    }
  ]
}`;
}

export function draftPrompt(input: {
  format: PieceFormat;
  title: string;
  hook: string;
  rawContext: string;
  topic?: { number: number; title: string };
}): string {
  const target =
    input.format === "casefile" || input.format === "casefile_opd" || input.format === "casefile_ipd"
      ? "600-800 word LinkedIn anchor with the canonical Casefile structure (Chief complaint / History / Differential / Intervention / Outcome / Caveat / Takeaway). Use monospace-style chart labels in ALL CAPS for each section."
      : input.format === "field_note"
      ? "150-300 word Field Note. One concrete observation; one small frame; one-line invitation."
      : input.format === "filter"
      ? "180-260 word filter post. 3 picks max, each with one-line reason and one-line skip-this-because."
      : "anchor / manifesto post (~400-700 words). Position-taking, Palm's voice.";

  return `Draft an Arutlee ${input.format} in Palm's chat-voice register.

Working title: ${input.title}
Working hook: ${input.hook}
${input.topic ? `Aligned seed topic: #${input.topic.number}, "${input.topic.title}"` : ""}

Raw context / source material to draw from:
"""
${input.rawContext}
"""

Format target: ${target}

Output the draft body only. No preamble. No "Here's the post:". No markdown headers unless the format calls for it. The draft must pass the slop test in 17-no-slop-test.md and the firewall in 01-executive-summary.md.`;
}

export function platformPackPrompt(input: {
  body: string;
  platforms: ("linkedin" | "facebook" | "instagram" | "threads" | "tiktok" | "youtube")[];
  format: string;
}): string {
  const platformNotes: Record<string, string> = {
    linkedin:
      "Professional framing. Lead with the strongest line. Native paragraph spacing (no walls of text). 3-4 paragraphs feels right. End with a soft curiosity hook (no 'follow me on X').",
    facebook:
      "Write a standalone Thai Facebook article, not a transcript or expanded video caption. Use a strong written opening, enough context to understand the idea without another format, the useful mechanism or evidence, why it matters to a Thai reader, Palm's interpretation, and one memorable takeaway. For AI news, benchmarks, or startup stories, follow this proven sequence: specific result and recognizable comparison, why the evidence matters, important mechanism or facts, an honest scope caveat, Palm's doctor-builder implication, then direct sources. Treat rankings, prices, and availability as dated snapshots. Use subtle emoji only for real section changes. Friendly, natural Thai, short paragraphs, and less jargon-heavy than LinkedIn.",
    instagram:
      "Caption pairs with a carousel cover. Lead with a hook line. Then 5-7 short lines. End with one curiosity line.",
    threads:
      "Conversational, voice-forward. One sharp opener; 3-7 supporting lines if threaded. Less polished.",
    tiktok:
      "Spoken script for a 30-60 sec talking head. Hook in first 1-2 seconds. One idea only.",
    youtube: "Long-form description. Section markers. Curiosity hook in the first 90 chars.",
  };

  return `Repackage the same idea for each platform below. Cross-post the idea, not the exact execution. Voice stays Palm's chat-voice register (code-switched Thai-English, modesty, concrete numbers + caveats). No em-dashes. No banned vocab.

Format type: ${input.format}

Source body:
"""
${input.body}
"""

Platforms:
${input.platforms.map((p) => `- ${p}: ${platformNotes[p] ?? ""}`).join("\n")}

Respond with strict JSON in this shape:
{
  "variants": {
    "${input.platforms[0]}": "...",
    ...
  }
}`;
}

export function visualPromptPrompt(input: {
  body: string;
  format: string;
  mode?: string | null;
  imageCandidates?: {
    title?: string;
    source?: string;
    sourceUrl?: string;
    localPath?: string;
    width?: number;
    height?: number;
  }[];
}): string {
  const references = input.imageCandidates?.length
    ? `\nFetched visual references for this specific topic. Use these as factual/contextual direction only. Do not copy exact layouts, logos, or trademarked UI unless explicitly allowed:\n${input.imageCandidates
        .slice(0, 5)
        .map((img, index) => {
          const bits = [
            img.title ? `title: ${img.title}` : "",
            img.source ? `source: ${img.source}` : "",
            img.width && img.height ? `size: ${img.width}x${img.height}` : "",
            img.localPath ? `local: ${img.localPath}` : "",
            img.sourceUrl ? `url: ${img.sourceUrl}` : "",
          ].filter(Boolean);
          return `${index + 1}. ${bits.join(" | ")}`;
        })
        .join("\n")}`
    : "\nNo fetched visual references are available. Make the prompt topic-specific from the post body only.";
  const basePrompt = buildCoverImagePrompt({
    mode: input.mode,
    body: input.body,
    referenceNotes: input.imageCandidates?.map((img) =>
      [img.title, img.source, img.sourceUrl].filter(Boolean).join(" | "),
    ),
  });

  return `Generate a single ChatGPT Image 2.0 prompt for the text-free background/subject image of this Arutlee editorial cover.

Hard constraint:
- Aspect ratio must be 4:5 vertical cover, optimized for a reusable 1080x1350 master asset.
- Do not render Thai headline text, article text, logos, watermarks, news labels, or UI badges inside the generated image.
- The Studio will add the category badge, logo, bottom gradient, and Thai headline as editable overlay later.
- This generated image should be the clean background/hero subject only: product UI crop, device photo, abstract gradient, human/subject composite, or topic artifact.

Visual IP direction: vibrant OpenAI-style editorial launch background, clean but punchy, luminous gradients, glassy depth, soft bloom, strong central subject, generous negative space where bottom headline overlay can sit. Avoid green-cross stock medical aesthetics. Avoid emoji walls and generic AI illustrations.

Composition:
- Keep the upper half visually clear enough for a small top-left category pill and top-right circular profile avatar overlay.
- Keep the lower 40% compatible with a black-to-transparent gradient and large white Thai headline.
- One topic-specific visual artifact or motif inferred from the post hook itself. Fetched references are optional; do not depend on them.
- If showing app screenshots or product UI, make them plausible recreated UI fragments, not exact copied screens unless the original UI was provided as reference.

Format: ${input.format}
Post body for inspiration:
"""
${input.body.slice(0, 800)}
"""
${references}

Baseline prompt discipline to preserve:
"""
${basePrompt}
"""

Output one ChatGPT Image 2.0 prompt as a single paragraph (no JSON wrapper). Preserve the baseline constraints: text-free base image, 4:5, lower overlay-safe zone, calm top corners, topic-specific motif, and hard negative constraints. Aim for ~220 words.`;
}

export function firewallPrompt(input: { body: string }): string {
  return `Run the Arutlee golden-rule audit on this draft.

Draft:
"""
${input.body}
"""

Score four checks. Each returns pass / near_miss / fail with one-line reason:
1. Slop test (per 17-no-slop-test.md). Look for embellished claims, banned vocab, em-dashes, AI-creator section structure, ChatGPT-default voice, emoji walls, listicles without position-taking.
2. Cariva / Vein firewall (per 01-executive-summary.md). Direct references AND origin-context drift.
3. Voice register (per 03-content-pillars-and-series.md). Code-switching, modesty, concrete numbers + caveats, doctor lens as voice not topic gate.
4. Quick Test (the 7 questions from 03). Specific only Palm could say + clear position + tight enough to finish + firewall pass + still makes sense to a stranger + slop test passes.

Respond with strict JSON in this shape:
{
  "slop": { "verdict": "pass|near_miss|fail", "reasons": ["..."] },
  "firewall": { "verdict": "pass|near_miss|fail", "reasons": ["..."] },
  "voice": { "verdict": "pass|near_miss|fail", "reasons": ["..."] },
  "quick_test": { "verdict": "pass|near_miss|fail", "reasons": ["..."] },
  "overall": "pass|near_miss|fail",
  "fix_suggestions": ["..."]
}`;
}

export function hookVariantsPrompt(input: {
  body: string;
  format: string;
  count?: number;
}): string {
  const n = Math.max(3, Math.min(10, input.count ?? 5));
  return `Generate ${n} candidate hook lines for this Arutlee draft. Each hook is what a reader sees first on the platform; if the hook does not earn the second line, the post fails.

Hook rules from the planning docs:
- Rooted in a specific real conversation, screenshot, or moment.
- Specific only Palm could credibly say.
- Take a position. "this matters" or "this is overrated".
- Code-switch Thai-English where natural; Thai is the carrier.
- No "เลิก[problem]" hook unless backed by a real anchor moment.
- No "Most people are getting this wrong" or "Here's the kicker" templates.

Format: ${input.format}
Source body:
"""
${input.body}
"""

Return strict JSON:
{
  "hooks": [
    {
      "text": "hook line in Palm voice",
      "angle": "what kind of hook this is (curiosity / contrarian / specific-receipt / origin-moment / number-lead)",
      "fit_for": ["linkedin", "facebook", "instagram", "threads", "tiktok"]
    }
  ]
}`;
}

export function clipScriptsPrompt(input: { body: string; count?: number }): string {
  const n = Math.max(3, Math.min(8, input.count ?? 5));
  return `Pull ${n} short-form video script candidates out of this Arutlee draft. Each is a 15 to 60 second candidate for IG Reels / TikTok / Facebook Reels / LinkedIn video. The current V1 publishes only two videos per week, so these are options to select from, not a volume quota.

Script rules:
- Hook in the first 1-2 seconds. Specific moment, not abstract claim.
- One idea per clip. No multi-thread takes.
- Voice: Palm chat-voice (code-switched Thai-English, modesty, concrete numbers + caveats).
- End with a takeaway line, not "follow me on X" or "link in bio".
- Estimated read-aloud duration in seconds.
- Include the on-screen caption text (the headline that overlays the talking head).

Source body:
"""
${input.body}
"""

Return strict JSON:
{
  "clips": [
    {
      "title": "short clip name",
      "duration_sec": 45,
      "script": "the spoken script with paragraph breaks where natural pauses go",
      "on_screen": "headline text overlay",
      "best_platform": "tiktok|instagram|facebook|linkedin"
    }
  ]
}`;
}

export function carouselPrompt(input: {
  body: string;
  format: string;
  title: string;
  slides?: number;
}): string {
  const n = Math.max(6, Math.min(12, input.slides ?? 8));
  return `Convert this Arutlee draft into a ${n}-slide carousel for LinkedIn / Facebook / Instagram (1080x1350).

Carousel rules from 09-prompts-and-templates.md and 03-content-pillars-and-series.md:
- Slide 1 is the hook. Single short line. Recognizable at thumbnail size.
- Each interior slide is one clean idea. No paragraph walls.
- The final slide is a clear takeaway, not a CTA. No "follow me on X".
- Voice stays Palm's chat-voice (code-switched Thai-English, modesty, concrete numbers + caveats).
- Casefile carousels follow the structural spine (CHIEF COMPLAINT, HISTORY, DIFFERENTIAL, INTERVENTION, OUTCOME, CAVEAT, TAKEAWAY) one section per slide.
- Field Note carousels follow OBSERVATION → FRAME → PROOF → INVITATION shape.
- No em-dashes. No banned vocab.

Title: ${input.title}
Format: ${input.format}
Source body:
"""
${input.body}
"""

Respond with strict JSON in this shape (do not wrap in fences):
{
  "slides": [
    {
      "index": 1,
      "kind": "cover|section|list|quote|outro",
      "title": "short slide title (Palm voice)",
      "body": "1-3 line slide body",
      "bullets": ["optional bullet 1", "optional bullet 2"],
      "visual_cue": "specific text-free image idea for this slide, using a real subject, artifact, scene, diagram, or evidence object"
    }
  ]
}`;
}

export function videoKitPrompt(input: {
  title: string;
  hook: string;
  body: string;
  platformVariants?: string;
  sourceContext?: string;
}): string {
  return `Create a lean Arutlee Video Production Kit for a 40-60 second vertical explainer.

Production direction:
- Inspired by lean AI/productivity Shorts: fixed talking head, clear script-first explanation, simple screen recordings, visual cards, captions always visible.
- Do not design a heavy production-house workflow.
- Use only these visual modules: talking_head, definition_card, before_after, flow_diagram, tool_demo, rule_of_thumb.
- 6-10 scenes total.
- Hook must land in the first 1-3 seconds.
- Voice stays Palm's Arutlee voice: Thai carrier with natural English AI/product terms, modest, concrete, practical, no guru tone.
- Avoid em-dashes and banned hype words from the system brief.
- Make the screen-recording needs practical and specific.
- Make visual-card ideas reusable, not custom one-off art direction.

Piece title: ${input.title}
Piece hook: ${input.hook}

Main piece body:
"""
${input.body.slice(0, 2600)}
"""

Existing platform variants:
"""
${(input.platformVariants ?? "").slice(0, 1200)}
"""

Source ingredient context:
"""
${(input.sourceContext ?? "").slice(0, 1500)}
"""

Respond with strict JSON only:
{
  "target_duration_sec": 50,
  "hook": "first spoken line, Thai/English code switch if natural",
  "script": "full spoken script with short paragraphs, enough for 40-60 sec",
  "scenes": [
    {
      "id": "S01",
      "start_sec": 0,
      "end_sec": 4,
      "spoken_line": "...",
      "visual_type": "talking_head|definition_card|before_after|flow_diagram|tool_demo|rule_of_thumb",
      "visual_brief": "what appears on screen",
      "production_note": "camera, edit, or asset note"
    }
  ],
  "talking_head_lines": ["lines Palm should record on camera"],
  "visual_card_ideas": ["visual card or overlay ideas"],
  "screen_recording_needs": ["specific screen captures or recordings needed"],
  "caption_style": "caption style for this video",
  "edit_checklist": ["ordered edit checklist"]
}`;
}

export function scrapePrompt(input: {
  url: string;
  title: string;
  text: string;
  instruction?: string;
  research?: {
    url: string;
    title: string;
    description: string;
    body: string;
    siteName: string | null;
  }[];
}): string {
  const researchBlock =
    input.research?.length
      ? input.research
          .map(
            (s, i) => `Research source ${i + 1}
URL: ${s.url}
Title: ${s.title}
Description: ${s.description}
Body excerpt:
"""
${s.body.slice(0, 2500)}
"""`,
          )
          .join("\n\n")
      : "No extra readable research sources were found.";

  return `A URL was just scraped from a one-box user capture. Summarize it as a candidate Arutlee inbox capture so the user knows whether to ideate it. Take the user's instruction seriously if they provided one.

You also have a light web research pack. Use it to add context, cross-check claims, and spot angles. Do not overstate certainty. If sources disagree or the research is thin, say that.

URL: ${input.url}
Title: ${input.title}
${input.instruction ? `User instruction / surrounding capture:\n"""\n${input.instruction.slice(0, 2000)}\n"""\n` : ""}
First 6000 chars of body:
"""
${input.text.slice(0, 6000)}
"""

Light web research pack:
${researchBlock}

Respond with strict JSON in this shape:
{
  "summary": "2-3 sentences in Palm's voice register on what this is and why it might matter",
  "research_summary": "2-4 bullets or sentences on what the extra web research adds, with source names where useful",
  "key_claims": ["specific factual claim 1", "specific factual claim 2"],
  "suggested_format": "field_note|casefile|casefile_opd|casefile_ipd|filter|anchor|threads_card|experiment",
  "firewall_risk": "clear|near_miss|blocked",
  "topic_id_guess": "topic-N or null",
  "hook_candidates": ["Palm-voice one-liner #1", "Palm-voice one-liner #2"]
}`;
}

export function weeklyReviewPrompt(input: {
  pieces: string;
  metrics: string;
  decisions: string;
}): string {
  return `Produce Palm's Sunday Arutlee weekly review using the template from 16-data-system.md and pipeline/templates/weekly-review-automation.md.

Pieces shipped (JSONL):
"""
${input.pieces}
"""

Metrics (JSONL):
"""
${input.metrics}
"""

Recent decisions (JSONL):
"""
${input.decisions}
"""

Output the markdown review. Then append a single decisions.jsonl record at the end inside a fenced code block.`;
}
