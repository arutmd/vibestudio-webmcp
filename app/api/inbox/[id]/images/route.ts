import { NextRequest, NextResponse } from "next/server";
import { findById, isValidId, patchById } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import { buildImageSearchQuery, findRelatedImages } from "@/lib/images";
import { writeIngredientFolder } from "@/lib/ingredientFolder";
import type { CaptureImageCandidate, InboxRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

function imageKey(img: CaptureImageCandidate): string {
  return img.localPath || img.sourceUrl || img.url;
}

function mergeImages(
  current: CaptureImageCandidate[],
  next: CaptureImageCandidate[],
): CaptureImageCandidate[] {
  const seen = new Set<string>();
  const merged: CaptureImageCandidate[] = [];
  for (const image of [...current, ...next]) {
    const key = imageKey(image);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(image);
    if (merged.length >= 12) break;
  }
  return merged;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const record = await findById<InboxRecord>(FILES.inbox, id);
  if (!record) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: { query?: string; replace?: boolean } = {};
  try {
    body = (await req.json()) as { query?: string; replace?: boolean };
  } catch {
    body = {};
  }

  const ing = record.ingredients ?? {};
  const query =
    body.query?.trim() ||
    ing.image_query ||
    buildImageSearchQuery({
      title: ing.source_title || record.raw.slice(0, 120),
      description: ing.summary,
      instruction: record.raw,
      researchQuery: ing.research_query,
    });

  const imagePack = await findRelatedImages({
    query,
    sourceImageUrl: ing.research_sources?.[0]?.imageUrl,
    sourceTitle: ing.source_title,
    sourceUrl: record.url ?? undefined,
    maxImages: 12,
    researchImages: ing.research_sources?.map((source) => ({
      imageUrl: source.imageUrl,
      title: source.title,
      sourceUrl: source.url,
      siteName: source.siteName,
    })),
  });

  const current = ing.image_candidates ?? [];
  const imageCandidates = body.replace
    ? imagePack.images
    : mergeImages(current, imagePack.images);

  const updated = await patchById<InboxRecord>(FILES.inbox, id, {
    ingredients: {
      ...ing,
      image_query: query,
      image_candidates: imageCandidates,
    },
    image_paths: imageCandidates
      .map((image) => image.localPath)
      .filter((path): path is string => !!path),
  });
  const folderRecord = updated ?? {
    ...record,
    ingredients: {
      ...ing,
      image_query: query,
      image_candidates: imageCandidates,
    },
  };
  const folder = await writeIngredientFolder(folderRecord);
  const patched = await patchById<InboxRecord>(FILES.inbox, id, {
    enriched_at: new Date().toISOString(),
    enrichment_path: folder.enrichmentPath,
    image_paths: folder.imagePaths,
    ingredients: {
      ...folderRecord.ingredients,
      image_candidates: folder.images,
    },
  });

  return NextResponse.json({
    record: patched ?? updated,
    query,
    images: folder.images,
    added: Math.max(0, folder.images.length - current.length),
    error: imagePack.error,
  });
}
