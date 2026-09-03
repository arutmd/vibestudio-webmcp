import { NextRequest, NextResponse } from "next/server";
import { append, isValidId, nowIso, readAll } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type { MetricsRecord, PieceRecord, PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

// Pull engagement snapshots from Buffer for the configured profiles.
// Buffer's API exposes per-update interactions at /1/updates/<id>/interactions,
// but discovering which buffer-update-id maps to which Arutlee piece requires
// either logging the buffer id at publish time (recommended; we log to the
// piece's published_urls in a future iteration) or scanning the profile's
// recent updates and matching by text.
//
// V1 strategy: enumerate the profile's `sent` updates, match each to the
// closest piece by text-prefix similarity, and append the latest interaction
// counts as a 7d window snapshot. Idempotent: append-only; same piece+platform
// reads naturally as multiple time-series points.

type ProfileMap = Partial<Record<PlatformId, string>>;

function parseProfileMap(): ProfileMap | null {
  const json = process.env.BUFFER_PROFILES_JSON?.trim();
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const out: ProfileMap = {};
    for (const k of Object.keys(parsed)) {
      const v = parsed[k];
      if (typeof v === "string" && v) out[k as PlatformId] = v;
    }
    return out;
  } catch {
    return null;
  }
}

type BufferUpdate = {
  id: string;
  text?: string;
  sent_at?: number;
  statistics?: {
    reach?: number;
    clicks?: number;
    favorites?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
  };
};

function similarity(a: string, b: string): number {
  const aa = a.slice(0, 80).toLowerCase();
  const bb = b.slice(0, 80).toLowerCase();
  let same = 0;
  const len = Math.min(aa.length, bb.length);
  for (let i = 0; i < len; i++) if (aa[i] === bb[i]) same++;
  return same / Math.max(aa.length, bb.length, 1);
}

export async function POST(req: NextRequest) {
  let body: { window?: MetricsRecord["window"]; pieceId?: string };
  try {
    body = (await req.json().catch(() => ({}))) as typeof body;
  } catch {
    body = {};
  }
  const window: MetricsRecord["window"] = body.window ?? "7d";
  if (body.pieceId && !isValidId(body.pieceId)) {
    return NextResponse.json({ error: "invalid pieceId" }, { status: 400 });
  }

  const token = process.env.BUFFER_ACCESS_TOKEN?.trim();
  const profiles = parseProfileMap();

  if (!token || !profiles) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Buffer not configured. Set BUFFER_ACCESS_TOKEN + BUFFER_PROFILES_JSON to sync analytics. Until then, record metrics manually from the Metrics tab.",
      },
      { status: 503 },
    );
  }

  const pieces = (await readAll<PieceRecord>(FILES.pieces)).filter((p) =>
    body.pieceId ? p.id === body.pieceId : true,
  );

  const synced: MetricsRecord[] = [];
  const errors: string[] = [];

  for (const platform of Object.keys(profiles) as PlatformId[]) {
    const profileId = profiles[platform];
    if (!profileId) continue;
    const url = `https://api.bufferapp.com/1/profiles/${profileId}/updates/sent.json?count=50`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch((err) => err as Error);
    if (res instanceof Error) {
      errors.push(`${platform}: ${res.message}`);
      continue;
    }
    if (!res.ok) {
      errors.push(`${platform}: HTTP ${res.status}`);
      continue;
    }
    const json = (await res.json().catch(() => ({}))) as { updates?: BufferUpdate[] };
    const updates = json.updates ?? [];

    for (const piece of pieces) {
      const candidate =
        piece.platform_variants?.[platform] ??
        piece.body ??
        piece.hook ??
        piece.title;
      if (!candidate) continue;
      // Match: highest text-prefix similarity above 0.6.
      let best: { up: BufferUpdate; score: number } | null = null;
      for (const up of updates) {
        if (!up.text) continue;
        const s = similarity(candidate, up.text);
        if (!best || s > best.score) best = { up, score: s };
      }
      if (!best || best.score < 0.6) continue;
      const stats = best.up.statistics ?? {};
      const record: MetricsRecord = {
        piece_id: piece.id,
        captured_at: nowIso(),
        window,
        platform,
        impressions: stats.reach,
        likes: stats.likes ?? stats.favorites,
        comments: stats.comments,
        shares: stats.shares,
        saves: stats.saves,
        notes: `synced from Buffer; matched buffer update ${best.up.id} @ ${(best.score * 100).toFixed(0)}% similarity`,
      };
      await append<MetricsRecord>(FILES.metrics, record);
      synced.push(record);
    }
  }

  return NextResponse.json({
    ok: true,
    synced_count: synced.length,
    synced,
    errors,
  });
}
