import { NextRequest, NextResponse } from "next/server";
import { runCodexJson } from "@/lib/contentEngine/codexProvider";
import {
  buildTemplateSlotPrompt,
  coerceTemplateSlotProposal,
  fallbackTemplateSlotProposal,
  normalizeTemplateSlotRequest,
} from "@/lib/templateSlot";

export const dynamic = "force-dynamic";

const TEMPLATE_SLOT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sample", "summary"],
  properties: {
    sample: { type: "string" },
    summary: { type: "string" },
  },
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const request = normalizeTemplateSlotRequest(body);
  if (!request) {
    return NextResponse.json({ error: "selected slot, current sample, slide, and instruction are required" }, { status: 400 });
  }

  try {
    const result = await runCodexJson({
      timeoutMs: 30_000,
      outputSchema: TEMPLATE_SLOT_SCHEMA,
      prompt: buildTemplateSlotPrompt(request),
    });
    return NextResponse.json({ proposal: coerceTemplateSlotProposal(result.json, request), provider: "codex" });
  } catch (error) {
    return NextResponse.json({
      proposal: fallbackTemplateSlotProposal(request),
      provider: "fallback",
      warning: error instanceof Error ? error.message.slice(0, 240) : "Codex was unavailable",
    });
  }
}
