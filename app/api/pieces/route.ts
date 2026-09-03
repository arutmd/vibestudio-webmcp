import { NextRequest, NextResponse } from "next/server";
import { findActivityByIdempotencyKey, recordActivity } from "@/lib/activity";
import {
  assertReceiptMatchesCreate,
  isChallengePieceRequest,
  parseChallengePieceCreate,
} from "@/lib/challengePiece";
import { appendWithGeneratedId, nowIso, readAll } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import { ensureHackathonSeedData } from "@/lib/seeds";
import type {
  ContextReceipt,
  InspirationRecord,
  PieceFormat,
  PieceRecord,
  PlatformId,
} from "@/lib/types";
import { errorResponse, ValidationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

const ALLOWED_FORMATS = new Set<PieceFormat>([
  "field_note",
  "casefile",
  "casefile_opd",
  "casefile_ipd",
  "filter",
  "anchor",
  "threads_card",
  "experiment",
]);

const ALLOWED_PLATFORMS = new Set<PlatformId>([
  "linkedin",
  "facebook",
  "instagram",
  "threads",
  "tiktok",
  "youtube",
]);

const PREFIXES: Record<PieceFormat, string> = {
  field_note: "field-note",
  casefile: "casefile",
  casefile_opd: "casefile-opd",
  casefile_ipd: "casefile-ipd",
  filter: "filter",
  anchor: "anchor",
  threads_card: "threads-card",
  experiment: "experiment",
};

function safePlatforms(arr: unknown): PlatformId[] {
  if (!Array.isArray(arr)) return ["linkedin", "facebook", "instagram"];
  const out: PlatformId[] = [];
  for (const p of arr) {
    if (typeof p === "string" && ALLOWED_PLATFORMS.has(p as PlatformId)) {
      out.push(p as PlatformId);
    }
  }
  return out.length ? out : ["linkedin", "facebook", "instagram"];
}

export async function GET() {
  const records = await readAll<PieceRecord>(FILES.pieces);
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  let body: Partial<PieceRecord> & Record<string, unknown>;
  try {
    body = (await req.json()) as Partial<PieceRecord> & Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (isChallengePieceRequest(body)) {
    try {
      await ensureHackathonSeedData();
      const input = parseChallengePieceCreate(body);
      const prior = await findActivityByIdempotencyKey(input.idempotencyKey);
      if (prior) {
        return NextResponse.json({ record: prior.after, activity: prior, idempotent: true });
      }
      const [receipt, inspiration] = await Promise.all([
        readAll<ContextReceipt>(FILES.contextReceipts).then(
          (records) => records.find((record) => record.id === input.receiptId) ?? null,
        ),
        readAll<InspirationRecord>(FILES.inspirations).then(
          (records) => records.find((record) => record.id === input.inspirationId) ?? null,
        ),
      ]);
      assertReceiptMatchesCreate(receipt, input);
      if (!inspiration || inspiration.status === "archived") {
        throw new ValidationError("selected inspiration is unavailable", 409);
      }
      const record = await appendWithGeneratedId<PieceRecord>(
        FILES.pieces,
        "field-note",
        (id) => ({
          id,
          created_at: nowIso(),
          updated_at: nowIso(),
          status: "draft",
          format: "field_note",
          title: input.title,
          hook: input.hook,
          body: input.body,
          topic_ids: [],
          source_inbox_ids: [],
          lead_platform: "instagram",
          platforms: ["instagram", "facebook", "tiktok"],
          ip_kit: "day1",
          firewall_check: "not_run",
          slop_check: "not_run",
          voice_check: "not_run",
          draft_path: null,
          published_urls: {},
          notes: "Created through the Arutlee WebMCP carousel skill.",
          visual_output: "carousel",
          inspiration_id: input.inspirationId,
          skill_id: "carousel-v1",
          skill_version: "1.0.0",
          context_receipt_id: input.receiptId,
          transformation_note: input.transformationNote,
          current_version: 1,
          carousel: input.slides,
          operation: {
            name: "carousel_create",
            status: "saved",
            progress: { completed: 7, total: 7 },
            message: "Original seven-slide story saved as Draft.",
            updated_at: nowIso(),
          },
        }),
      );
      const activity = await recordActivity({
        actor: "codex",
        entityType: "piece",
        entityId: record.id,
        action: "carousel.create",
        summary: `Created seven-slide Draft: ${record.title}`,
        before: null,
        after: record,
        idempotencyKey: input.idempotencyKey,
        reversible: false,
      });
      return NextResponse.json({ record, activity }, { status: 201 });
    } catch (err) {
      const failure = errorResponse(err);
      return NextResponse.json({ error: failure.error }, { status: failure.status });
    }
  }
  const format: PieceFormat =
    body.format && ALLOWED_FORMATS.has(body.format) ? body.format : "field_note";
  const prefix = PREFIXES[format];

  const lead =
    body.lead_platform && ALLOWED_PLATFORMS.has(body.lead_platform)
      ? body.lead_platform
      : "linkedin";

  const record = await appendWithGeneratedId<PieceRecord>(
    FILES.pieces,
    prefix,
    (id) => ({
      id,
      created_at: nowIso(),
      status: body.status ?? "idea",
      format,
      title: typeof body.title === "string" ? body.title.slice(0, 300) : "",
      hook: typeof body.hook === "string" ? body.hook.slice(0, 600) : "",
      topic_ids: Array.isArray(body.topic_ids) ? body.topic_ids.slice(0, 8) : [],
      source_inbox_ids: Array.isArray(body.source_inbox_ids)
        ? body.source_inbox_ids.slice(0, 16)
        : [],
      lead_platform: lead,
      platforms: safePlatforms(body.platforms),
      ip_kit: body.ip_kit ?? "day1",
      firewall_check: body.firewall_check ?? "not_run",
      slop_check: body.slop_check ?? "not_run",
      voice_check: body.voice_check ?? "not_run",
      draft_path: body.draft_path ?? null,
      published_urls: body.published_urls ?? {},
      notes: typeof body.notes === "string" ? body.notes : "",
      body: typeof body.body === "string" ? body.body : undefined,
      platform_variants: body.platform_variants,
      visual_prompt: body.visual_prompt,
      hero_image_path: body.hero_image_path,
      creative_reference_paths: Array.isArray(body.creative_reference_paths)
        ? body.creative_reference_paths
        : undefined,
      cover_background_path: body.cover_background_path,
      cover_headline: body.cover_headline,
      cover_subheadline: body.cover_subheadline,
      cover_badge: body.cover_badge,
      cover_template: body.cover_template,
      visual_output: body.visual_output ?? "hero",
      scheduled_for: body.scheduled_for,
      carousel: body.carousel,
    }),
  );
  return NextResponse.json({ record });
}
