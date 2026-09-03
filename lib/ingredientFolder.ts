import fs from "node:fs/promises";
import path from "node:path";
import { INGREDIENTS_DIR, PROJECT_ROOT } from "./paths";
import type { CaptureImageCandidate, InboxRecord } from "./types";

type FolderWriteResult = {
  enrichmentPath: string;
  imagePaths: string[];
  images: CaptureImageCandidate[];
};

const IMAGE_TIMEOUT_MS = 8_000;
const MAX_IMAGE_BYTES = 6_000_000;

function slugify(text: string): string {
  const ascii = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return ascii || "source";
}

function topicSlug(record: InboxRecord): string {
  return slugify(
    record.ingredients?.source_title ||
      record.ingredients?.summary ||
      record.url ||
      record.raw.split(/\n+/).find(Boolean) ||
      record.id,
  );
}

function relativeIngredientDir(record: InboxRecord): string {
  return record.enrichment_path || `ingredients/${topicSlug(record)}`;
}

function assertIngredientPath(rel: string): string {
  const abs = path.resolve(PROJECT_ROOT, rel);
  if (!abs.startsWith(INGREDIENTS_DIR + path.sep)) {
    throw new Error("ingredient folder path escaped ingredients directory");
  }
  return abs;
}

function absoluteIngredientDir(record: InboxRecord): string {
  return assertIngredientPath(relativeIngredientDir(record));
}

async function exists(absPath: string): Promise<boolean> {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

async function uniqueIngredientDir(record: InboxRecord): Promise<string> {
  if (record.enrichment_path) return record.enrichment_path;
  const base = topicSlug(record);
  for (let i = 0; i < 100; i++) {
    const suffix = i === 0 ? "" : `-${i + 1}`;
    const rel = `ingredients/${base}${suffix}`;
    if (!(await exists(assertIngredientPath(rel)))) return rel;
  }
  return `ingredients/${base}-${Date.now()}`;
}

function mdEscape(text?: string | null): string {
  return (text || "").trim() || "Not captured.";
}

function sourceMarkdown(record: InboxRecord): string {
  const ing = record.ingredients;
  const sourceText = ing?.source_text || record.raw;
  const sourceTitle = ing?.source_title || record.id;
  return `# Source Text

Inbox: ${record.id}
Title: ${sourceTitle}
Kind: ${ing?.source_text_kind || "unknown"}
Characters: ${ing?.source_text_chars ?? sourceText.length}
URL: ${record.url || "none"}

---

${sourceText}
`;
}

function researchMarkdown(record: InboxRecord): string {
  const ing = record.ingredients;
  const sources = ing?.research_sources ?? [];
  return `# Research

Inbox: ${record.id}
Query: ${ing?.research_query || "none"}

## Summary

${mdEscape(ing?.research_summary)}

## Sources

${sources
  .map(
    (source, index) => `### ${index + 1}. ${source.title || source.url}

- URL: ${source.url}
- Site: ${source.siteName || "unknown"}
- Fetched: ${source.fetchedAt || "unknown"}

${source.description || ""}
`,
  )
  .join("\n")}
`;
}

function imagesMarkdown(record: InboxRecord, images: CaptureImageCandidate[]): string {
  const ing = record.ingredients;
  return `# Image Ingredients

Inbox: ${record.id}
Query: ${ing?.image_query || ing?.research_query || "none"}

${images
  .map(
    (image, index) => `## ${index + 1}. ${image.title || image.source || "Image candidate"}

- Image URL: ${image.url}
- Thumbnail: ${image.thumbnailUrl || "none"}
- Source page: ${image.sourceUrl || "none"}
- Local file: ${image.localPath || "not downloaded"}
- Source: ${image.source || "unknown"}
`,
  )
  .join("\n")}
`;
}

function readmeMarkdown(record: InboxRecord, imagePaths: string[]): string {
  const ing = record.ingredients;
  return `# ${ing?.source_title || record.id}

This folder is the source-of-truth ingredient packet for ${record.id}. It is created by Fetch before Ideate.

## What Is Here

- \`source.md\`: full source text or transcript captured from the original input.
- \`research.md\`: small research pack and reliable source list.
- \`images.md\`: related image candidates and local download status.
- \`photos/\`: downloaded image files when the remote source allowed download.
- \`ideate-brief.md\`: compact brief for turning these ingredients into posts.
- \`metadata.json\`: structured copy of the inbox ingredient packet.

## Counts

- Source text: ${(ing?.source_text_chars ?? ing?.source_text?.length ?? record.raw.length).toLocaleString()} chars
- Research sources: ${ing?.research_sources?.length ?? 0}
- Image candidates: ${ing?.image_candidates?.length ?? 0}
- Downloaded images: ${imagePaths.length}
- Platform recommendations: ${ing?.platform_recommendations?.map((rec) => `${rec.platform} ${rec.fit}`).join(", ") || "none"}

## Original Input

${record.url || record.raw.slice(0, 1000)}
`;
}

function ideateBriefMarkdown(record: InboxRecord, imagePaths: string[]): string {
  const ing = record.ingredients;
  return `# Ideate Brief

Inbox: ${record.id}
Source: ${record.source}
URL: ${record.url || "none"}
Firewall risk: ${record.firewall_risk}

## Palm Instruction / Capture

${record.raw.split("\n\n")[0] || record.raw.slice(0, 1500)}

## Summary

${mdEscape(ing?.summary)}

## Research Summary

${mdEscape(ing?.research_summary)}

## Key Claims To Keep Honest

${(ing?.key_claims ?? []).map((claim) => `- ${claim}`).join("\n") || "- None captured."}

## Hook Seeds

${(ing?.hook_candidates ?? []).map((hook) => `- ${hook}`).join("\n") || "- None captured."}

## Local Images

${imagePaths.map((p) => `- ${p}`).join("\n") || "- No images downloaded. See images.md for URLs."}

## Platform Fit

${(ing?.platform_recommendations ?? [])
  .map(
    (rec) => `- ${rec.fit} ${rec.platform}: ${rec.formats.join(", ")}. ${rec.reason}`,
  )
  .join("\n") || "- No platform recommendations captured."}
`;
}

function extFromContentType(contentType: string, fallbackUrl: string): string {
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
  try {
    const ext = path.extname(new URL(fallbackUrl).pathname).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return ext;
  } catch {
    // Fall through to jpg.
  }
  return ".jpg";
}

async function downloadImage(
  image: CaptureImageCandidate,
  photosDir: string,
  relDir: string,
  index: number,
): Promise<CaptureImageCandidate> {
  const urls = [image.url, image.thumbnailUrl].filter(
    (url): url is string => !!url,
  );
  for (const url of urls) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), IMAGE_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; ArutleeStudio/1.0; +https://arutlee.local)",
          Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
        },
      });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) continue;
      const ext = extFromContentType(contentType, url);
      const filename = `${String(index + 1).padStart(2, "0")}-${slugify(
        image.title || image.source || "image",
      ).slice(0, 42)}${ext}`;
      await fs.writeFile(path.join(photosDir, filename), buf);
      return { ...image, localPath: `${relDir}/photos/${filename}` };
    } catch {
      // Try thumbnail/fallback URL.
    } finally {
      clearTimeout(timer);
    }
  }
  return image;
}

export function ingredientPathForRecord(record: InboxRecord): string {
  return relativeIngredientDir(record);
}

export async function writeIngredientFolder(
  record: InboxRecord,
): Promise<FolderWriteResult> {
  const relDir = await uniqueIngredientDir(record);
  const absDir = assertIngredientPath(relDir);
  const photosDir = path.join(absDir, "photos");
  await fs.mkdir(photosDir, { recursive: true });

  const candidates = (record.ingredients?.image_candidates ?? []).slice(0, 12);
  const images = await Promise.all(
    candidates.map((image, index) => downloadImage(image, photosDir, relDir, index)),
  );
  const imagePaths = images
    .map((image) => image.localPath)
    .filter((p): p is string => !!p);

  await Promise.all([
    fs.writeFile(path.join(absDir, "README.md"), readmeMarkdown(record, imagePaths), "utf8"),
    fs.writeFile(path.join(absDir, "source.md"), sourceMarkdown(record), "utf8"),
    fs.writeFile(path.join(absDir, "research.md"), researchMarkdown(record), "utf8"),
    fs.writeFile(path.join(absDir, "images.md"), imagesMarkdown(record, images), "utf8"),
    fs.writeFile(path.join(absDir, "ideate-brief.md"), ideateBriefMarkdown(record, imagePaths), "utf8"),
    fs.writeFile(
      path.join(absDir, "metadata.json"),
      JSON.stringify({ ...record, image_paths: imagePaths, ingredients: { ...record.ingredients, image_candidates: images } }, null, 2),
      "utf8",
    ),
  ]);

  return { enrichmentPath: relDir, imagePaths, images };
}

export async function deleteIngredientFolder(relPath?: string | null): Promise<void> {
  if (!relPath) return;
  const abs = path.resolve(PROJECT_ROOT, relPath);
  if (!abs.startsWith(INGREDIENTS_DIR + path.sep)) {
    throw new Error("refusing to delete outside ingredients directory");
  }
  await fs.rm(abs, { recursive: true, force: true });
}
