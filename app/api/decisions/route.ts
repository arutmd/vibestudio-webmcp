import { NextRequest, NextResponse } from "next/server";
import { append, nextId, nowIso, readAll } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type { DecisionRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const records = await readAll<DecisionRecord>(FILES.decisions);
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<DecisionRecord>;
  if (!body.scope || !body.decision) {
    return NextResponse.json(
      { error: "scope and decision are required" },
      { status: 400 },
    );
  }
  const all = await readAll<DecisionRecord>(FILES.decisions);
  const record: DecisionRecord = {
    id: nextId(all, "decision"),
    decided_at: nowIso(),
    scope: body.scope,
    decision: body.decision,
    reason: body.reason ?? "",
    next: body.next ?? "",
    owner: body.owner ?? "Palm",
  };
  await append(FILES.decisions, record);
  return NextResponse.json({ record });
}
