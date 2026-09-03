import { NextRequest, NextResponse } from "next/server";
import { findById, isValidId, patchById } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type { PieceRecord, PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

// Buffer integration. Requires:
//   BUFFER_ACCESS_TOKEN  — personal access token (paid Buffer plan)
//   BUFFER_PROFILES_JSON — JSON map of platform → profile-id, e.g.
//                          {"linkedin":"abc","facebook":"def","instagram":"ghi"}
//
// We deliberately require the JSON-map form so a "publish to LinkedIn only"
// request never silently fans out to other channels. The legacy CSV form
// (BUFFER_PROFILE_IDS) is rejected with a 501 telling the operator to migrate.

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

export async function POST(req: NextRequest) {
  const token = process.env.BUFFER_ACCESS_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "BUFFER_ACCESS_TOKEN not configured. Add it to studio/.env.local. See README for the OAuth-token process.",
      },
      { status: 503 },
    );
  }

  // Reject the legacy CSV env var so we don't accidentally mis-publish.
  if (process.env.BUFFER_PROFILE_IDS && !process.env.BUFFER_PROFILES_JSON) {
    return NextResponse.json(
      {
        error:
          "BUFFER_PROFILE_IDS is no longer supported because it fans out to every profile regardless of platform. Migrate to BUFFER_PROFILES_JSON, e.g. {\"linkedin\":\"abc\",\"facebook\":\"def\"}.",
      },
      { status: 501 },
    );
  }

  const profiles = parseProfileMap();
  if (!profiles) {
    return NextResponse.json(
      {
        error:
          "BUFFER_PROFILES_JSON not configured or unparseable. Set it to a JSON map like {\"linkedin\":\"abc\",\"facebook\":\"def\"}.",
      },
      { status: 503 },
    );
  }

  let body: { pieceId?: string; platforms?: PlatformId[]; when?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.pieceId || !isValidId(body.pieceId)) {
    return NextResponse.json({ error: "valid pieceId required" }, { status: 400 });
  }
  const piece = await findById<PieceRecord>(FILES.pieces, body.pieceId);
  if (!piece) return NextResponse.json({ error: "piece not found" }, { status: 404 });

  const targetPlatforms = (body.platforms ?? piece.platforms).filter((p) =>
    profiles[p as PlatformId],
  ) as PlatformId[];

  if (targetPlatforms.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "None of the requested platforms have a Buffer profile mapping. Add them to BUFFER_PROFILES_JSON.",
      },
      { status: 400 },
    );
  }

  const when = body.when ?? "queue";
  const results: Record<string, unknown> = {};
  const successes: PlatformId[] = [];

  for (const platform of targetPlatforms) {
    const profileId = profiles[platform];
    if (!profileId) {
      results[platform] = { ok: false, error: "no profile mapped" };
      continue;
    }
    const text =
      piece.platform_variants?.[platform] ?? piece.body ?? piece.hook ?? piece.title;
    if (!text) {
      results[platform] = { ok: false, error: "no body to post" };
      continue;
    }
    const params = new URLSearchParams({
      text,
      "profile_ids[]": profileId,
    });
    if (when === "now") {
      params.set("now", "true");
    } else if (when !== "queue") {
      const ts = Math.floor(new Date(when).getTime() / 1000);
      if (Number.isFinite(ts)) params.set("scheduled_at", String(ts));
    }

    const res = await fetch("https://api.bufferapp.com/1/updates/create.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }).catch((err) => err as Error);

    if (res instanceof Error) {
      results[platform] = { ok: false, error: res.message };
      continue;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      results[platform] = { ok: false, status: res.status, body: json };
    } else {
      results[platform] = { ok: true, buffer: json };
      successes.push(platform);
    }
  }

  if (successes.length) {
    const updated = await patchById<PieceRecord>(FILES.pieces, body.pieceId, {
      status: when === "now" ? "published" : "scheduled",
      scheduled_for:
        when && when !== "now" && when !== "queue" ? when : piece.scheduled_for,
    });
    return NextResponse.json({ ok: true, results, piece: updated });
  }
  return NextResponse.json({ ok: false, results }, { status: 500 });
}
