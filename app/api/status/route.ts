import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { FILES } from "@/lib/paths";
import { MODEL, resolveEngine } from "@/lib/claude";
import { hasCodexCli } from "@/lib/contentEngine/codexProvider";
import { readAll } from "@/lib/jsonl";
import type { PieceRecord } from "@/lib/types";
import { DEMO_MODE } from "@/lib/paths";

export const dynamic = "force-dynamic";

// System status — used by the masthead chip + the workbench resume-here cue.
// Reports which integrations are live without leaking secrets.

async function fileLines(p: string): Promise<number> {
  try {
    const text = await fs.readFile(p, "utf8");
    return text.split("\n").filter((l) => l.trim().length > 0).length;
  } catch {
    return 0;
  }
}

export async function GET() {
  const engine = DEMO_MODE
    ? {
        engine: "none" as const,
        cliPath: null,
        apiKeyPresent: false,
        model: MODEL,
      }
    : await resolveEngine();
  const buffer = !DEMO_MODE && !!(
    process.env.BUFFER_ACCESS_TOKEN?.trim() &&
    process.env.BUFFER_PROFILES_JSON?.trim()
  );
  const webhook = !DEMO_MODE && !!process.env.PUBLISH_WEBHOOK_URL?.trim();
  const webhookSecret = !DEMO_MODE && !!process.env.PUBLISH_WEBHOOK_SECRET?.trim();

  const [inbox, pieces, metrics, decisions, experiments, pieceRows, codexConfigured] =
    await Promise.all([
      fileLines(FILES.inbox),
      fileLines(FILES.pieces),
      fileLines(FILES.metrics),
      fileLines(FILES.decisions),
      fileLines(FILES.experiments),
      readAll<PieceRecord>(FILES.pieces),
      DEMO_MODE ? Promise.resolve(false) : hasCodexCli(),
    ]);

  // Resume-here: pick the piece with the most recent updated_at, falling back
  // to created_at for older rows that pre-date the updated_at field. Skip
  // pieces in terminal states (published / held / skipped) so resume always
  // points to in-flight work.
  const TERMINAL: PieceRecord["status"][] = ["published", "held", "skipped"];
  const liveSorted = pieceRows
    .filter((p) => !TERMINAL.includes(p.status))
    .map((p) => ({ id: p.id, ts: p.updated_at ?? p.created_at }))
    .sort((a, b) => b.ts.localeCompare(a.ts));
  const lastEditedPieceId = liveSorted[0]?.id ?? null;
  const lastEditedAt = liveSorted[0]?.ts ?? null;

  // Engine "configured" means SOMETHING will respond — either API or CLI.
  // Fallback templates also work but they're not really "AI."
  const aiConfigured = !DEMO_MODE && engine.engine !== "none";

  return NextResponse.json({
    integrations: {
      anthropic: {
        configured: aiConfigured,
        model: aiConfigured ? MODEL : null,
        // Distinguishes which backend is active; UI shows it as a hint.
        engine: aiConfigured ? engine.engine : "none",
      },
      codex: {
        configured: codexConfigured,
        model: codexConfigured
          ? process.env.ARUTLEE_CODEX_MODEL?.trim() || "gpt-5.4-mini"
          : null,
        engine: codexConfigured ? "cli" : "none",
      },
      buffer: { configured: buffer },
      webhook: { configured: webhook, signed: webhookSecret },
    },
    data: { inbox, pieces, metrics, decisions, experiments },
    ready_to_publish: aiConfigured && (buffer || webhook),
    resume: {
      last_edited_piece_id: lastEditedPieceId,
      last_edited_at: lastEditedAt,
    },
  });
}
