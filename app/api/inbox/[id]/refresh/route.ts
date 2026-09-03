import { NextRequest, NextResponse } from "next/server";
import { buildCaptureIngredients, buildSmartCaptureNotes, buildSmartCaptureRaw } from "@/lib/capture";
import { fetchIngredientCapture } from "@/lib/fetchIngredients";
import { writeIngredientFolder } from "@/lib/ingredientFolder";
import { findById, isValidId, patchById } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import { assessCaptureSource } from "@/lib/sourceQuality";
import type { InboxRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const existing = await findById<InboxRecord>(FILES.inbox, id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const originalInput = originalCaptureInput(existing);
  const urlFromOriginalInput = extractUrlFromRaw(originalInput);
  const url =
    urlFromOriginalInput ??
    (existing.source === "manual" && existing.raw.startsWith("Palm capture / instruction:\n")
      ? null
      : existing.url);
  if (!url && !originalInput.trim()) {
    return NextResponse.json(
      { error: "no URL or source text available to deepen" },
      { status: 400 },
    );
  }

  const before = assessCaptureSource(existing);
  const result = await fetchIngredientCapture({
    url: url ?? undefined,
    text: originalInput || existing.raw,
  });
  const ingredients = buildCaptureIngredients(result);
  const nextRaw = buildSmartCaptureRaw(originalInput || existing.raw, result);
  const nextNotes = [
    buildSmartCaptureNotes(result),
    `deepened ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const patchedBase: InboxRecord = {
    ...existing,
    source: existing.source,
    raw: nextRaw,
    url: result.scraped.url === "manual://source" ? url ?? existing.url : result.scraped.url,
    firewall_risk: result.firewall_risk,
    status: "triaged",
    notes: nextNotes,
    ingredients,
    enriched_at: new Date().toISOString(),
  };
  const folder = await writeIngredientFolder(patchedBase);
  const patched = await patchById<InboxRecord>(FILES.inbox, existing.id, {
    raw: patchedBase.raw,
    url: patchedBase.url,
    firewall_risk: patchedBase.firewall_risk,
    status: patchedBase.status,
    notes: patchedBase.notes,
    ingredients: {
      ...ingredients,
      image_candidates: folder.images,
    },
    enriched_at: patchedBase.enriched_at,
    enrichment_path: folder.enrichmentPath,
    image_paths: folder.imagePaths,
  });

  const record = patched ?? patchedBase;
  const after = assessCaptureSource(record);
  return NextResponse.json({
    record,
    quality: { before, after },
    improved: after.chars > before.chars || after.level !== before.level,
  });
}

function originalCaptureInput(record: InboxRecord): string {
  const prefix = "Palm capture / instruction:\n";
  if (!record.raw.startsWith(prefix)) return record.raw;
  const rest = record.raw.slice(prefix.length);
  return rest.split("\n\n")[0]?.trim() || record.url || record.raw;
}

function extractUrlFromRaw(raw: string): string | null {
  return raw.match(/https?:\/\/[^\s<>"')\]]+/i)?.[0]?.replace(/[.,;:!?]+$/g, "") ?? null;
}
