import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { callClaude, resolveEngine } from "@/lib/claude";
import { weeklyReviewPrompt, SYSTEM_BRIEF } from "@/lib/prompts";
import { FILES } from "@/lib/paths";

export const dynamic = "force-dynamic";

// Cap each input file to the most recent N rows so this route survives long
// production histories. ~50 rows per file = ~30 days at 1-2 Field Notes / week
// + 1 Casefile / 2-4 weeks + ~5 metric snapshots / piece.
const MAX_ROWS = 50;

async function readSafe(p: string): Promise<string> {
  try {
    const text = await fs.readFile(p, "utf8");
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    return lines.slice(-MAX_ROWS).join("\n");
  } catch {
    return "";
  }
}

export async function POST() {
  const [pieces, metrics, decisions] = await Promise.all([
    readSafe(FILES.pieces),
    readSafe(FILES.metrics),
    readSafe(FILES.decisions),
  ]);

  if ((await resolveEngine()).engine === "none") {
    const piecesCount = pieces.split("\n").filter((l) => l.trim()).length;
    const metricsCount = metrics.split("\n").filter((l) => l.trim()).length;
    const fallback = `# Arutlee Weekly Review (deterministic fallback)

ANTHROPIC_API_KEY is not configured. Set it in studio/.env.local to get the AI-prepped review described in 16-data-system.md Role 2.

## Quick stats
- pieces.jsonl rows: ${piecesCount}
- metrics.jsonl rows: ${metricsCount}

## Next steps
1. Set ANTHROPIC_API_KEY.
2. Re-run the weekly review from the dashboard.
3. The AI will read pieces / metrics / decisions and produce the full template from 16-data-system.md.`;
    return NextResponse.json({ markdown: fallback, fallback: true });
  }

  const text = await callClaude({
    system: SYSTEM_BRIEF,
    cacheSystem: true,
    messages: [
      {
        role: "user",
        content: weeklyReviewPrompt({ pieces, metrics, decisions }),
      },
    ],
    maxTokens: 3000,
  });
  return NextResponse.json({ markdown: text });
}
