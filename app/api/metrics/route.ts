import { NextRequest, NextResponse } from "next/server";
import { append, nowIso, readAll } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type { MetricsRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const records = await readAll<MetricsRecord>(FILES.metrics);
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<MetricsRecord>;
  if (!body.piece_id || !body.platform || !body.window) {
    return NextResponse.json(
      { error: "piece_id, platform, window are required" },
      { status: 400 },
    );
  }
  const record: MetricsRecord = {
    piece_id: body.piece_id,
    captured_at: body.captured_at ?? nowIso(),
    window: body.window,
    platform: body.platform,
    impressions: body.impressions,
    views: body.views,
    likes: body.likes,
    comments: body.comments,
    shares: body.shares,
    saves: body.saves,
    profile_visits: body.profile_visits ?? null,
    follower_delta: body.follower_delta ?? null,
    notes: body.notes,
  };
  await append(FILES.metrics, record);
  return NextResponse.json({ record });
}
