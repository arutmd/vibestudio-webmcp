import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { findById, isValidId, patchById } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type { PieceRecord, PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

// Generic outbound webhook. POSTs the scheduled piece to PUBLISH_WEBHOOK_URL as
// JSON. If PUBLISH_WEBHOOK_SECRET is set we sign the body with HMAC-SHA256 and
// send the signature in `X-Arutlee-Signature: sha256=<hex>` so a receiver that
// logs headers does not leak a usable bearer secret. The legacy
// `X-Arutlee-Secret` header is kept for backward compat but the receiver
// should prefer the signature.

export async function POST(req: NextRequest) {
  const url = process.env.PUBLISH_WEBHOOK_URL?.trim();
  if (!url) {
    return NextResponse.json(
      {
        error:
          "PUBLISH_WEBHOOK_URL not configured. Add it to studio/.env.local with your Make.com / n8n / Zapier webhook URL.",
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

  const payload = {
    piece_id: piece.id,
    title: piece.title,
    hook: piece.hook,
    format: piece.format,
    lead_platform: piece.lead_platform,
    platforms: body.platforms ?? piece.platforms,
    body: piece.body ?? "",
    platform_variants: piece.platform_variants ?? {},
    carousel: piece.carousel ?? [],
    hero_image_path: piece.hero_image_path ?? null,
    visual_prompt: piece.visual_prompt ?? null,
    when: body.when ?? "queue",
    scheduled_for: piece.scheduled_for ?? null,
    notes: piece.notes,
  };

  const json = JSON.stringify(payload);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.PUBLISH_WEBHOOK_SECRET?.trim();
  if (secret) {
    const sig = crypto.createHmac("sha256", secret).update(json).digest("hex");
    headers["X-Arutlee-Signature"] = `sha256=${sig}`;
    // Backwards-compat shared-secret header. Prefer the signature; deprecate later.
    headers["X-Arutlee-Secret"] = secret;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: json,
  }).catch((err) => err as Error);

  if (res instanceof Error) {
    return NextResponse.json({ ok: false, error: res.message }, { status: 502 });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { ok: false, status: res.status, body: text.slice(0, 500) },
      { status: 502 },
    );
  }
  const updated = await patchById<PieceRecord>(FILES.pieces, body.pieceId, {
    status: body.when === "now" ? "published" : "scheduled",
    scheduled_for:
      body.when && body.when !== "now" && body.when !== "queue"
        ? body.when
        : piece.scheduled_for,
  });
  return NextResponse.json({ ok: true, piece: updated });
}
