import { NextRequest, NextResponse } from "next/server";
import { findById, isValidId, nowIso, patchById, readAll } from "@/lib/jsonl";
import { FILES, PROJECT_ROOT } from "@/lib/paths";
import { buildPieceLeadStatus } from "@/lib/pieceReadiness";
import { runCodexJson } from "@/lib/contentEngine/codexProvider";
import type { InboxRecord, PieceAgentReview, PieceAgentSubagent, PieceRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "nextAction", "blockers", "subagents"],
  properties: {
    summary: { type: "string" },
    nextAction: { type: "string" },
    blockers: { type: "array", items: { type: "string" } },
    subagents: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "task", "reason"],
        properties: {
          name: { type: "string" },
          task: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
  },
};

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "invalid piece id" }, { status: 400 });
  }

  const piece = await findById<PieceRecord>(FILES.pieces, id);
  if (!piece) return NextResponse.json({ error: "piece not found" }, { status: 404 });

  const inbox = await readAll<InboxRecord>(FILES.inbox);
  const sourceRecords = inbox.filter((record) => piece.source_inbox_ids.includes(record.id));
  const deterministic = buildPieceLeadStatus(piece, sourceRecords);

  let review: PieceAgentReview;
  try {
    const result = await runCodexJson({
      projectRoot: PROJECT_ROOT,
      timeoutMs: 90_000,
      outputSchema: REVIEW_SCHEMA,
      prompt: buildLeadPrompt(piece, deterministic, sourceRecords),
    });
    review = {
      ...coerceLeadReview(result.json, deterministic),
      provider: "codex",
      updatedAt: nowIso(),
    };
  } catch (err) {
    review = {
      summary: deterministic.summary,
      nextAction: deterministic.nextAction,
      blockers: deterministic.blockers,
      subagents: fallbackSubagents(deterministic.stage, err instanceof Error ? err.message : String(err)),
      provider: "fallback",
      updatedAt: nowIso(),
    };
  }

  const updated = await patchById<PieceRecord>(FILES.pieces, piece.id, {
    updated_at: nowIso(),
    agent_review: review,
  });

  return NextResponse.json({ record: updated ?? piece, review });
}

function buildLeadPrompt(
  piece: PieceRecord,
  status: ReturnType<typeof buildPieceLeadStatus>,
  sourceRecords: InboxRecord[],
): string {
  const sources = sourceRecords
    .map((record) => {
      const chars =
        record.ingredients?.source_text_chars ??
        record.ingredients?.source_text?.length ??
        0;
      return [
        `- ${record.id}`,
        `  title: ${record.ingredients?.source_title ?? record.url ?? "untitled"}`,
        `  kind: ${record.ingredients?.source_text_kind ?? "unknown"}`,
        `  chars: ${chars}`,
        `  summary: ${(record.ingredients?.summary ?? record.raw ?? "").slice(0, 900)}`,
      ].join("\n");
    })
    .join("\n");

  return `You are the accountable project lead for exactly one Arutlee social post.

Return one strict JSON object. No markdown. Do not edit files. Do not call tools.

Your job:
- Treat the piece like a small project that must become publishable.
- Be honest about blockers. Never say it is ready if sources are thin, text is missing, image is missing, QA has not passed, or schedule is missing.
- Suggest narrow subagents only when useful. Examples: Source auditor, Draft writer, Visual director, QA reviewer, Platform adapter.
- Keep the answer short and operational for Palm.

Piece:
id: ${piece.id}
title: ${piece.title}
hook: ${piece.hook}
status: ${piece.status}
platforms: ${piece.platforms.join(", ")}
body chars: ${piece.body?.length ?? 0}
image: ${piece.engine_asset_path || piece.hero_image_path || piece.cover_background_path || "missing"}
checks: firewall=${piece.firewall_check}, slop=${piece.slop_check}, voice=${piece.voice_check}
scheduled: ${piece.scheduled_for ?? "missing"}

Deterministic gate:
stage: ${status.stage}
label: ${status.label}
source: ${status.source.label}, blocked=${status.source.blocked}, detail=${status.source.detail}
next: ${status.nextAction}
blockers:
${status.blockers.map((blocker) => `- ${blocker}`).join("\n") || "- none"}

Sources:
${sources || "- none"}
`;
}

function coerceLeadReview(
  value: unknown,
  fallback: ReturnType<typeof buildPieceLeadStatus>,
): Omit<PieceAgentReview, "provider" | "updatedAt"> {
  const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const blockers = Array.isArray(obj.blockers)
    ? obj.blockers
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, 5)
    : fallback.blockers;
  const subagents = Array.isArray(obj.subagents)
    ? obj.subagents
        .map((item) => coerceSubagent(item))
        .filter((item): item is PieceAgentSubagent => Boolean(item))
        .slice(0, 4)
    : fallbackSubagents(fallback.stage);

  return {
    summary: stringValue(obj.summary, fallback.summary),
    nextAction: stringValue(obj.nextAction, fallback.nextAction),
    blockers,
    subagents: subagents.length ? subagents : fallbackSubagents(fallback.stage),
  };
}

function coerceSubagent(value: unknown): PieceAgentSubagent | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const name = stringValue(obj.name, "");
  const task = stringValue(obj.task, "");
  const reason = stringValue(obj.reason, "");
  if (!name || !task || !reason) return null;
  return { name, task, reason };
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 800) : fallback;
}

function fallbackSubagents(
  stage: ReturnType<typeof buildPieceLeadStatus>["stage"],
  reason = "Local CLI review was unavailable.",
): PieceAgentSubagent[] {
  if (stage === "source_check") {
    return [
      {
        name: "Source auditor",
        task: "Deepen transcript/article capture and verify enough source text exists.",
        reason,
      },
    ];
  }
  if (stage === "visual") {
    return [
      {
        name: "Visual director",
        task: "Create one relevant text-free hero image direction for the post.",
        reason,
      },
    ];
  }
  return [
    {
      name: "QA reviewer",
      task: "Check source truth, voice, image, and calendar readiness.",
      reason,
    },
  ];
}
