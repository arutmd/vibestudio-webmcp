import { NextRequest, NextResponse } from "next/server";
import { callClaude, resolveEngine } from "@/lib/claude";
import { draftPrompt, SYSTEM_BRIEF } from "@/lib/prompts";
import type { PieceFormat } from "@/lib/types";

export const dynamic = "force-dynamic";

const FALLBACK: Record<PieceFormat, string> = {
  field_note: `[CONCRETE OBSERVATION:replace with the specific moment from your week]

[SMALL FRAME / RULE OF THUMB:replace with the one-line takeaway]

[OPTIONAL: why Thai audience should care]

[INVITATION:one line, e.g. "ลองดูคืนนี้แล้วบอกผมว่าได้ผลไหม"]`,
  casefile: `CHIEF COMPLAINT
[Single-line quote in Palm's voice or a peer's voice. Code-switched Thai-English where natural.]

HISTORY
[Messy actual context. What was being attempted, what tools were tried, what failed.]

DIFFERENTIAL
- Bad use: [specific failure mode + why]
- Bad use: [specific failure mode + why]
- Useful use: [the path that worked]

INTERVENTION
[Specific. Reproducible. Show the prompt or the workflow steps.]

OUTCOME
[Before/after. Real numbers, real screenshot, real artifact.]

CAVEAT
[Where the intervention is fragile. When it breaks. What still fails.]

TAKEAWAY
[One reusable line readers can apply.]`,
  casefile_opd: `CC
[Chief complaint in Palm's voice.]

PI
[Present illness: timeline, relevant history.]

PH
[Past history: relevant conditions, medications.]

PE
[Examination findings.]

IX
[Investigations: labs, imaging, results.]

TX
[Treatment and takeaway.]`,
  casefile_ipd: `S
[Subjective: what the patient reports.]

O
[Objective: observations and measurements.]

A
[Assessment: working diagnosis.]

P
[Plan: next steps and follow-up.]`,
  filter: `3 worth your attention this week.

1. [Pick #1]:[one-line reason]
   Skip the rest of [adjacent topic] noise.

2. [Pick #2]:[one-line reason]

3. [Pick #3]:[one-line reason]

Everything else this week: skip.`,
  anchor: `[Manifesto / position post:400-700 words. Position-taking. Palm's voice.]`,
  threads_card: `[One sharp line. No setup. No fluff.]`,
  experiment: `[Experiment hypothesis: ___]
[Predicted outcome: ___]
[Success metric: ___]`,
};

export async function POST(req: NextRequest) {
  let body: {
    format?: PieceFormat;
    title?: string;
    hook?: string;
    rawContext?: string;
    topic?: { number: number; title: string };
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.format || !body.title) {
    return NextResponse.json({ error: "format and title required" }, { status: 400 });
  }

  if ((await resolveEngine()).engine === "none") {
    return NextResponse.json({
      draft: FALLBACK[body.format] ?? FALLBACK.field_note,
      fallback: true,
    });
  }

  try {
    const draft = await callClaude({
      system: SYSTEM_BRIEF,
      cacheSystem: true,
      messages: [
        {
          role: "user",
          content: draftPrompt({
            format: body.format,
            title: body.title,
            hook: body.hook ?? "",
            rawContext: body.rawContext ?? "",
            topic: body.topic,
          }),
        },
      ],
      maxTokens: 2500,
    });
    return NextResponse.json({ draft });
  } catch (err) {
    return NextResponse.json({
      draft: FALLBACK[body.format] ?? FALLBACK.field_note,
      fallback: true,
      warning: (err as Error).message,
    });
  }
}
