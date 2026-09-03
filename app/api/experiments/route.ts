import { NextRequest, NextResponse } from "next/server";
import { append, nextId, nowIso, readAll } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type { ExperimentRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const records = await readAll<ExperimentRecord>(FILES.experiments);
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<ExperimentRecord>;
  if (!body.hypothesis) {
    return NextResponse.json({ error: "hypothesis required" }, { status: 400 });
  }
  const all = await readAll<ExperimentRecord>(FILES.experiments);
  const record: ExperimentRecord = {
    id: nextId(all, "experiment"),
    created_at: nowIso(),
    hypothesis: body.hypothesis,
    format: body.format ?? "field_note",
    success_metric: body.success_metric ?? "",
    status: body.status ?? "planned",
    result: body.result ?? "",
    promote_to_standard: body.promote_to_standard ?? false,
  };
  await append(FILES.experiments, record);
  return NextResponse.json({ record });
}
