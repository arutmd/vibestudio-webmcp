import { NextRequest, NextResponse } from "next/server";
import { readAll } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type { ActivityRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const entityId = url.searchParams.get("entity_id");
  const entityType = url.searchParams.get("entity_type");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 30), 1), 100);
  const records = (await readAll<ActivityRecord>(FILES.activity))
    .filter((record) => !entityId || record.entity_id === entityId)
    .filter((record) => !entityType || record.entity_type === entityType)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
  return NextResponse.json({ records });
}
