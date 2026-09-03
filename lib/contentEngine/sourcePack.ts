import fs from "node:fs/promises";
import path from "node:path";
import { nowIso } from "../jsonl";
import type { InboxRecord, PieceRecord } from "../types";
import { engineSlugFromText } from "./paths";
import type { EngineArtifactPaths, EngineSourcePack, EngineSourceReference } from "./types";

const ENGINE_SOURCE_TEXT_MAX_CHARS = 24_000;

function compact(value: string, max = 1200): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed;
}

function sourceTextForRecord(record: InboxRecord): string {
  return [
    record.ingredients?.source_title ? `Title: ${record.ingredients.source_title}` : "",
    record.ingredients?.summary ? `Summary: ${record.ingredients.summary}` : "",
    record.ingredients?.source_text ? `Source text: ${record.ingredients.source_text}` : "",
    record.raw ? `Raw: ${record.raw}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function engineSlugForPiece(piece: PieceRecord): string {
  const base = engineSlugFromText(piece.title || piece.hook || "post", "post")
    .slice(0, 56)
    .replace(/-$/g, "");
  const idSlug = engineSlugFromText(piece.id, "piece").slice(0, 40);
  return `${base || "post"}-${idSlug}`;
}

export function buildSourcePack(
  piece: PieceRecord,
  inboxRecords: InboxRecord[],
  at = nowIso(),
): EngineSourcePack {
  const matching = inboxRecords.filter((record) => piece.source_inbox_ids.includes(record.id));
  const slug = engineSlugForPiece(piece);
  const sourceText =
    matching.map(sourceTextForRecord).filter(Boolean).join("\n\n") ||
    piece.notes ||
    piece.body ||
    piece.hook ||
    piece.title;
  const references: EngineSourceReference[] = matching.map((record, index) => ({
    id: record.id,
    label:
      record.ingredients?.source_title ||
      record.url ||
      `Source ${String(index + 1).padStart(2, "0")}`,
    url: record.url,
    localPath: record.media_path,
    kind: "source",
  }));
  const seenImages = new Set<string>();
  for (const record of matching) {
    const candidates = [
      ...(record.ingredients?.image_candidates ?? []).map((candidate, index) => ({
        id: `${record.id}:image:${String(index + 1).padStart(2, "0")}`,
        label:
          candidate.title ||
          candidate.source ||
          `Source image ${String(index + 1).padStart(2, "0")}`,
        url: candidate.sourceUrl || candidate.url || null,
        localPath: candidate.localPath ?? null,
        source: candidate.source,
        width: candidate.width,
        height: candidate.height,
      })),
      ...(record.image_paths ?? []).map((localPath, index) => ({
        id: `${record.id}:image-path:${String(index + 1).padStart(2, "0")}`,
        label: `Source image ${String(index + 1).padStart(2, "0")}`,
        url: record.url,
        localPath,
      })),
    ];
    for (const candidate of candidates) {
      const key = candidate.localPath || candidate.url || candidate.id;
      if (seenImages.has(key)) continue;
      seenImages.add(key);
      references.push({
        ...candidate,
        kind: "image",
      });
    }
  }
  const facts = [
    piece.hook,
    ...matching.flatMap((record) => record.ingredients?.key_claims ?? []),
    ...matching.map((record) => record.ingredients?.summary ?? record.raw),
  ]
    .map((item) => compact(item ?? "", 180))
    .filter(Boolean)
    .slice(0, 6);

  return {
    pieceId: piece.id,
    slug,
    title: piece.title,
    hook: piece.hook,
    format: piece.format,
    platforms: piece.platforms.length ? piece.platforms : ["linkedin", "facebook"],
    sourceText: compact(sourceText, ENGINE_SOURCE_TEXT_MAX_CHARS),
    notes: piece.notes,
    references,
    sourceIds: matching.map((record) => record.id),
    facts,
    createdAt: at,
  };
}

export async function writeSourceArtifacts(
  source: EngineSourcePack,
  paths: EngineArtifactPaths,
): Promise<void> {
  await fs.mkdir(paths.pieceDir, { recursive: true });
  await fs.mkdir(paths.referencesDir, { recursive: true });
  const sourceMd = [
    `# ${source.title}`,
    "",
    `Hook: ${source.hook || "Untitled"}`,
    `Format: ${source.format}`,
    `Platforms: ${source.platforms.join(", ")}`,
    `Created: ${source.createdAt}`,
    "",
    "## Source Text",
    "",
    source.sourceText,
    "",
    "## References",
    "",
    ...source.references.map((ref) =>
      [
        `- ${ref.id}: ${ref.label}`,
        ref.url ? `(${ref.url})` : "",
        ref.localPath ? `[${ref.localPath}]` : "",
      ]
        .filter(Boolean)
        .join(" "),
    ),
  ].join("\n");
  await fs.writeFile(paths.sourceMd, `${sourceMd}\n`, "utf8");
  await fs.writeFile(paths.sourceFactsJson, `${JSON.stringify(source, null, 2)}\n`, "utf8");
  await fs.writeFile(
    path.join(paths.referencesDir, "README.md"),
    `# References\n\nDrop source screenshots, photos, and exported references for ${source.slug} here.\n`,
    "utf8",
  );
}
