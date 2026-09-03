import { NextRequest, NextResponse } from "next/server";
import { writeIngredientFolder } from "@/lib/ingredientFolder";
import { appendWithGeneratedId, patchById, readAll } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type { InboxRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_SOURCES = new Set<InboxRecord["source"]>([
  "telegram",
  "linkedin",
  "facebook",
  "instagram",
  "youtube",
  "tiktok",
  "web",
  "voice",
  "manual",
]);

const ALLOWED_FIREWALL_RISKS = new Set<InboxRecord["firewall_risk"]>([
  "clear",
  "near_miss",
  "blocked",
  "unknown",
]);

const ALLOWED_STATUSES = new Set<InboxRecord["status"]>([
  "new",
  "triaged",
  "drafted",
  "skipped",
]);

const MAX_RAW_LEN = 250_000;

export async function GET() {
  const all = await readAll<InboxRecord>(FILES.inbox);
  return NextResponse.json({ records: all });
}

export async function POST(req: NextRequest) {
  let body: Partial<InboxRecord>;
  try {
    body = (await req.json()) as Partial<InboxRecord>;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.raw || typeof body.raw !== "string") {
    return NextResponse.json({ error: "raw is required" }, { status: 400 });
  }
  if (body.raw.length > MAX_RAW_LEN) {
    return NextResponse.json(
      { error: `raw exceeds ${MAX_RAW_LEN} chars` },
      { status: 400 },
    );
  }
  const source = body.source && ALLOWED_SOURCES.has(body.source) ? body.source : "manual";
  const firewallRisk =
    body.firewall_risk && ALLOWED_FIREWALL_RISKS.has(body.firewall_risk)
      ? body.firewall_risk
      : "unknown";
  const status =
    body.status && ALLOWED_STATUSES.has(body.status) ? body.status : "new";

  const url = typeof body.url === "string" ? body.url.slice(0, 2000) : null;
  const mediaPath =
    typeof body.media_path === "string" ? body.media_path.slice(0, 500) : null;
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 5000) : undefined;
  const ingredients =
    body.ingredients && typeof body.ingredients === "object"
      ? body.ingredients
      : undefined;

  const record = await appendWithGeneratedId<InboxRecord>(
    FILES.inbox,
    "inbox",
    (id) => {
      const baseRecord: InboxRecord = {
        id,
        captured_at: new Date().toISOString(),
        source,
        raw: body.raw as string,
        url,
        media_path: mediaPath,
        initial_format: body.initial_format ?? "unknown",
        firewall_risk: firewallRisk,
        status,
        notes,
        ...(ingredients ? { ingredients } : {}),
      };
      if (!ingredients) return baseRecord;
      return {
        ...baseRecord,
        enriched_at: new Date().toISOString(),
      };
    },
  );

  if (!record.ingredients) return NextResponse.json({ record });

  const folder = await writeIngredientFolder(record);
  const patched = await patchById<InboxRecord>(FILES.inbox, record.id, {
    enriched_at: new Date().toISOString(),
    enrichment_path: folder.enrichmentPath,
    image_paths: folder.imagePaths,
    ingredients: {
      ...record.ingredients,
      image_candidates: folder.images,
    },
  });

  return NextResponse.json({ record: patched ?? record });
}
