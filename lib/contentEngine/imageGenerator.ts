import { spawn } from "node:child_process";
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { relativeToProject } from "./paths";
import { renderPngWithChrome, renderVisualSpec } from "./renderer";
import type {
  EngineArtifactPaths,
  EngineImageResult,
  EngineSourcePack,
  EngineVisualSpec,
} from "./types";
import { buildCodexEnv, findCodexCli } from "./codexProvider";

type CodexImageRunInput = {
  prompt: string;
  outputPath: string;
  projectRoot: string;
  timeoutMs?: number;
  codexPath?: string;
  model?: string;
};

type CodexImageRunResult = {
  path: string | null;
  prompt: string;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  exitCode: number | null;
};

type GenerateHeroImageOptions = {
  runCodexImage?: (input: CodexImageRunInput) => Promise<CodexImageRunResult>;
  renderFallback?: (spec: EngineVisualSpec, paths: EngineArtifactPaths) => Promise<void>;
  normalizeImage?: (filePath: string, width: number, height: number) => Promise<void>;
  composeReferenceLayer?: (
    input: ReferenceCompositeInput,
  ) => Promise<ReferenceCompositeResult | null>;
  timeoutMs?: number;
};

type SourceReferenceImage = {
  absPath: string;
  relativePath: string;
  label: string;
  width: number;
  height: number;
  score: number;
};

type ProfileLayerImage = {
  absPath: string;
  relativePath: string;
  label: string;
};

export type HeroTextOverlay = {
  headline: string[];
  dek?: string;
};

type SourceReferenceCandidate = {
  absPath: string;
  relativePath: string;
  label: string;
  source?: string;
  declaredWidth?: number;
  declaredHeight?: number;
  kindPriority: number;
  order: number;
};

export type ReferenceCompositeInput = {
  source: EngineSourcePack;
  spec: EngineVisualSpec;
  paths: EngineArtifactPaths;
  reference: SourceReferenceImage | null;
  profile: ProfileLayerImage | null;
};

export type ReferenceCompositeResult = {
  baseLayerPath: string;
  referenceLayerPath?: string;
  referenceLayerLabel?: string;
  profileLayerPath?: string;
  profileLayerLabel?: string;
};

const DEFAULT_TIMEOUT_MS = 240_000;
const DEFAULT_IMAGE_MODEL =
  process.env.ARUTLEE_CODEX_IMAGE_MODEL?.trim() ||
  process.env.ARUTLEE_CODEX_MODEL?.trim() ||
  "gpt-5.4-mini";
const DEFAULT_PROFILE_IMAGE_PATH = "Profile-Image/image5.png";
const MIN_REFERENCE_WIDTH = 900;
const MIN_REFERENCE_HEIGHT = 500;
const MIN_REFERENCE_PIXELS = 600_000;
const REFERENCE_LAYER_WIDTH = 604;
const REFERENCE_LAYER_HEIGHT = 356;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size > 1024;
  } catch {
    return false;
  }
}

function isImagePath(value: string): boolean {
  return /\.(png|jpe?g|webp)$/i.test(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function pushUnique(tags: string[], tag?: string): void {
  if (!tag || tags.includes(tag)) return;
  tags.push(tag);
}

function compactOverlayText(value: string, max: number): string {
  const compacted = value.replace(/\s+/g, " ").trim();
  return compacted.length > max ? `${compacted.slice(0, max - 1).trim()}…` : compacted;
}

function splitOverlayHeadline(value: string): string[] {
  const compacted = value.replace(/\s+/g, " ").trim();
  if (!compacted) return [];
  if (compacted.length <= 34) return [compacted];

  const words = compacted.split(" ");
  if (words.length <= 1) return [compactOverlayText(compacted, 34)];

  let best: string[] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let i = 1; i < words.length; i += 1) {
    const left = words.slice(0, i).join(" ");
    const right = words.slice(i).join(" ");
    const maxLen = Math.max(left.length, right.length);
    const balancePenalty = Math.abs(left.length - right.length);
    const overflowPenalty = Math.max(0, maxLen - 34) * 20;
    const score = maxLen + balancePenalty + overflowPenalty;
    if (score < bestScore) {
      best = [left, right];
      bestScore = score;
    }
  }
  return (best ?? [compacted]).map((line) => compactOverlayText(line, 34));
}

export function buildHeroTextOverlay(source: EngineSourcePack): HeroTextOverlay {
  const haystack = [
    source.title,
    source.hook,
    source.sourceText,
    source.facts.join(" "),
    source.references.map((ref) => `${ref.label} ${ref.url ?? ""}`).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  if (matchesAny(haystack, [/\bopenai\b/]) && matchesAny(haystack, [/\bgpt[-\s]?realtime[-\s]?2\b/])) {
    return {
      headline: ["OpenAI เปิดตัว", "GPT-Realtime-2"],
      dek: "Voice AI เริ่มสั่งงานได้จริง: โมเดลเสียงใหม่เรียก tool พร้อมกัน คุยต่อเนื่องได้นานขึ้น",
    };
  }
  if (matchesAny(haystack, [/\bcodex\b/]) && matchesAny(haystack, [/\bsites\b/])) {
    return {
      headline: ["Codex Sites", "build app ได้ URL"],
      dek: "ได้ production URL ทันที แต่ยังต้องระวัง Business/Enterprise และไม่มี staging",
    };
  }
  if (matchesAny(haystack, [/\bclaude\s+fable\s+5\b/, /\bfable\s+5\b/])) {
    return {
      headline: ["Claude Fable 5", "AI ที่พร้อมทำงานจริง"],
      dek: "โมเดลใหม่จาก Anthropic กับโจทย์ workflow ยุค agentic AI",
    };
  }

  const tags = buildHeroTags(source);
  const firstLine = tags.length >= 2 ? `${tags[0]}: ${tags[1]}` : "";
  const titleLines = splitOverlayHeadline(source.title);
  const headline = [compactOverlayText(firstLine, 34), ...titleLines].filter(
    (line, index, lines) => line && lines.indexOf(line) === index,
  );
  return {
    headline: headline.length ? headline.slice(0, 2) : [compactOverlayText(source.title, 34)],
  };
}

export function buildHeroTags(source: EngineSourcePack): string[] {
  const primaryText = [
    source.title,
    source.hook,
    source.facts.join(" "),
    source.references.map((ref) => `${ref.label} ${ref.url ?? ""}`).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  const haystack = [
    source.title,
    source.hook,
    source.sourceText,
    source.facts.join(" "),
    source.references.map((ref) => `${ref.label} ${ref.url ?? ""}`).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  const entityPairs: Array<[string, RegExp[]]> = [
    ["OpenAI", [/\bopenai\b/, /\bchatgpt\b/, /\bgpt[-\s]?[0-9]/, /\bgpt[-\s]?realtime\b/]],
    ["Anthropic", [/\banthropic\b/, /\bclaude\b/]],
    ["Google", [/\bgoogle\b/, /\bgemini\b/, /\bgemma\b/]],
    ["NVIDIA", [/\bnvidia\b/]],
    ["Meta", [/\bmeta\b/, /\bllama\b/]],
    ["Apple", [/\bapple\b/, /\bmacos\b/]],
  ];
  const topicPairs: Array<[string, RegExp[]]> = [
    ["Claude Fable 5", [/\bclaude\s+fable\s+5\b/, /\bfable\s+5\b/]],
    ["GPT-Realtime-2", [/\bgpt[-\s]?realtime[-\s]?2\b/, /\brealtime[-\s]?2\b/]],
    ["Realtime API", [/\brealtime api\b/]],
    ["Codex", [/\bcodex\b/]],
    ["ChatGPT", [/\bchatgpt\b/]],
    ["GPT-5", [/\bgpt[-\s]?5\b/]],
    ["Gemini", [/\bgemini\b/]],
    ["Gemma", [/\bgemma\b/]],
    ["Claude", [/\bclaude\b/]],
    ["Voice AI", [/\bvoice ai\b/, /\bvoice agent/, /\bspeech[-\s]?to[-\s]?speech\b/, /\brealtime voice\b/]],
    ["AI Agents", [/\bagentic\b/, /\btool calling\b/, /\bworkflow\b/]],
  ];

  const tags: string[] = [];
  pushUnique(
    tags,
    entityPairs.find(([, patterns]) => matchesAny(primaryText, patterns))?.[0] ??
      entityPairs.find(([, patterns]) => matchesAny(haystack, patterns))?.[0],
  );
  pushUnique(
    tags,
    topicPairs.find(([, patterns]) => matchesAny(primaryText, patterns))?.[0] ??
      topicPairs.find(([, patterns]) => matchesAny(haystack, patterns))?.[0],
  );

  const category = includesAny(primaryText, [
    "health",
    "healthcare",
    "medical",
    "patient",
    "senior care",
    "hospital",
    "digital health",
  ])
    ? includesAny(primaryText, ["ai", "gpt", "model", "agent"])
      ? "Health AI"
      : "Digital Health"
    : includesAny(primaryText || haystack, ["ai", "gpt", "model", "agent", "codex", "chatgpt"])
    ? "AI Tech"
    : "AI Tech";
  pushUnique(tags, category);
  return tags.slice(0, 2);
}

function referenceAbsPath(localPath: string, projectRoot: string): string {
  return path.isAbsolute(localPath) ? localPath : path.join(projectRoot, localPath);
}

function referenceLabelFromPath(filePath: string): string {
  const label = path
    .basename(filePath, path.extname(filePath))
    .replace(/^\d+[-_]/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return label ? label.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Topic reference image";
}

async function collectSiblingImageCandidates(
  absPath: string,
  projectRoot: string,
  orderStart: number,
): Promise<SourceReferenceCandidate[]> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(path.dirname(absPath), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && isImagePath(entry.name))
    .map((entry, index) => {
      const siblingAbsPath = path.join(path.dirname(absPath), entry.name);
      return {
        absPath: siblingAbsPath,
        relativePath: relativeToProject(siblingAbsPath, projectRoot),
        label: referenceLabelFromPath(entry.name),
        kindPriority: 1,
        order: orderStart + index,
      };
    });
}

async function collectSourceReferenceCandidates(
  source: EngineSourcePack,
  projectRoot: string,
): Promise<SourceReferenceCandidate[]> {
  const candidates: SourceReferenceCandidate[] = [];
  const seen = new Set<string>();

  function addCandidate(candidate: SourceReferenceCandidate) {
    if (seen.has(candidate.absPath)) return;
    seen.add(candidate.absPath);
    candidates.push(candidate);
  }

  let order = 0;
  for (const ref of source.references) {
    if (!ref.localPath || !isImagePath(ref.localPath)) continue;
    const absPath = referenceAbsPath(ref.localPath, projectRoot);
    addCandidate({
      absPath,
      relativePath: relativeToProject(absPath, projectRoot),
      label: ref.label,
      source: ref.source,
      declaredWidth: ref.width,
      declaredHeight: ref.height,
      kindPriority: ref.kind === "image" ? 0 : 2,
      order,
    });
    const siblings = await collectSiblingImageCandidates(absPath, projectRoot, order + 100);
    for (const sibling of siblings) addCandidate(sibling);
    order += 1;
  }
  return candidates;
}

async function imageFileSize(filePath: string): Promise<number | null> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() ? stat.size : null;
  } catch {
    return null;
  }
}

async function readSipsDimensions(filePath: string): Promise<{ width: number; height: number } | null> {
  const output = await new Promise<string | null>((resolve) => {
    const child = spawn("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", filePath], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    let stdout = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.on("close", (code) => resolve(code === 0 ? stdout : null));
    child.on("error", () => resolve(null));
  });
  if (!output) return null;
  const width = Number(output.match(/pixelWidth:\s*(\d+)/)?.[1]);
  const height = Number(output.match(/pixelHeight:\s*(\d+)/)?.[1]);
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? { width, height }
    : null;
}

async function readImageDimensions(filePath: string): Promise<{ width: number; height: number } | null> {
  const png = await readPngDimensions(filePath);
  if (png) return png;
  return readSipsDimensions(filePath);
}

function scoreReferenceImage(input: {
  candidate: SourceReferenceCandidate;
  width: number;
  height: number;
  size: number;
}): number {
  const { candidate, width, height, size } = input;
  const pixels = width * height;
  const targetAspect = REFERENCE_LAYER_WIDTH / REFERENCE_LAYER_HEIGHT;
  const aspectDelta = Math.abs(width / height - targetAspect);
  const aspectBonus = Math.max(0, 300_000 - aspectDelta * 280_000);
  const officialBonus = /openai|gpt|realtime/i.test(
    `${candidate.label} ${candidate.source ?? ""} ${candidate.relativePath}`,
  )
    ? 180_000
    : 0;
  const thumbnailPenalty = /hqdefault|thumbnail|source-image/i.test(candidate.relativePath)
    ? 500_000
    : 0;
  const kindBonus = candidate.kindPriority === 0 ? 40_000 : 0;
  const sizeBonus = Math.min(size, 3_000_000) / 8;
  return pixels + aspectBonus + officialBonus + kindBonus + sizeBonus - thumbnailPenalty - candidate.order * 100;
}

function isUsableReferenceImage(image: SourceReferenceImage): boolean {
  return (
    image.width >= MIN_REFERENCE_WIDTH &&
    image.height >= MIN_REFERENCE_HEIGHT &&
    image.width * image.height >= MIN_REFERENCE_PIXELS
  );
}

async function scoreSourceReferenceCandidate(
  candidate: SourceReferenceCandidate,
): Promise<SourceReferenceImage | null> {
  const size = await imageFileSize(candidate.absPath);
  if (!size || size <= 1024) return null;
  const declared =
    candidate.declaredWidth && candidate.declaredHeight
      ? { width: candidate.declaredWidth, height: candidate.declaredHeight }
      : null;
  const dimensions = declared ?? (await readImageDimensions(candidate.absPath));
  if (!dimensions) return null;
  return {
    absPath: candidate.absPath,
    relativePath: candidate.relativePath,
    label: candidate.label,
    width: dimensions.width,
    height: dimensions.height,
    score: scoreReferenceImage({
      candidate,
      width: dimensions.width,
      height: dimensions.height,
      size,
    }),
  };
}

export async function pickSourceReferenceImage(
  source: EngineSourcePack,
  projectRoot: string,
): Promise<SourceReferenceImage | null> {
  const candidates = await collectSourceReferenceCandidates(source, projectRoot);
  const scored: SourceReferenceImage[] = [];
  for (const candidate of candidates) {
    const image = await scoreSourceReferenceCandidate(candidate);
    if (image) scored.push(image);
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.find((image) => isUsableReferenceImage(image)) ?? null;
}

export async function pickProfileImage(projectRoot: string): Promise<ProfileLayerImage | null> {
  const configured = process.env.ARUTLEE_PROFILE_IMAGE_PATH?.trim() || DEFAULT_PROFILE_IMAGE_PATH;
  const absPath = path.isAbsolute(configured)
    ? configured
    : path.join(/* turbopackIgnore: true */ projectRoot, configured);
  if (!(await fileExists(absPath))) return null;
  return {
    absPath,
    relativePath: relativeToProject(absPath, projectRoot),
    label: "Arutlee profile image",
  };
}

export async function readPngDimensions(filePath: string): Promise<{
  width: number;
  height: number;
} | null> {
  const handle = await fs.open(filePath, "r").catch(() => null);
  if (!handle) return null;
  try {
    const header = Buffer.alloc(24);
    await handle.read(header, 0, header.length, 0);
    const pngSignature = "89504e470d0a1a0a";
    if (header.subarray(0, 8).toString("hex") !== pngSignature) return null;
    return {
      width: header.readUInt32BE(16),
      height: header.readUInt32BE(20),
    };
  } finally {
    await handle.close();
  }
}

async function runSips(args: string[]): Promise<void> {
  const code = await new Promise<number | null>((resolve, reject) => {
    const child = spawn("/usr/bin/sips", args, { stdio: "ignore" });
    child.on("close", resolve);
    child.on("error", reject);
  });
  if (code !== 0) throw new Error(`sips failed with exit code ${code}`);
}

export async function normalizeHeroImage(
  filePath: string,
  targetWidth: number,
  targetHeight: number,
): Promise<void> {
  const dims = await readPngDimensions(filePath);
  if (!dims) throw new Error("generated image is not a readable PNG");
  if (dims.width === targetWidth && dims.height === targetHeight) return;

  const sourceRatio = dims.width / dims.height;
  const targetRatio = targetWidth / targetHeight;
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath));
  const resized = path.join(dir, `${base}.resize-${process.pid}-${Date.now()}.png`);
  const cropped = path.join(dir, `${base}.crop-${process.pid}-${Date.now()}.png`);

  try {
    if (sourceRatio < targetRatio) {
      await runSips(["--resampleWidth", String(targetWidth), filePath, "--out", resized]);
    } else {
      await runSips(["--resampleHeight", String(targetHeight), filePath, "--out", resized]);
    }
    await runSips([
      "--cropToHeightWidth",
      String(targetHeight),
      String(targetWidth),
      resized,
      "--out",
      cropped,
    ]);
    await fs.rename(cropped, filePath);
  } finally {
    fs.unlink(resized).catch(() => {});
    fs.unlink(cropped).catch(() => {});
  }
}

export function buildReferenceCompositeHtml(input: {
  spec: EngineVisualSpec;
  baseImagePath: string;
  referenceImagePath?: string;
  referenceLabel?: string;
  profileImagePath?: string;
  profileLabel?: string;
  tags?: string[];
  textOverlay?: HeroTextOverlay;
}): string {
  const baseUrl = pathToFileURL(input.baseImagePath).href;
  const referenceUrl = input.referenceImagePath
    ? pathToFileURL(input.referenceImagePath).href
    : null;
  const profileUrl = input.profileImagePath ? pathToFileURL(input.profileImagePath).href : null;
  const label = escapeHtml(input.referenceLabel ?? "Source reference image");
  const profileLabel = escapeHtml(input.profileLabel ?? "Profile image");
  const tags = (input.tags?.length ? input.tags : ["AI Tech"]).slice(0, 2);
  const tagHtml = tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  const overlay = input.textOverlay ?? {
    headline: [input.spec.title].filter(Boolean),
    dek: input.spec.subtitle,
  };
  const headlineHtml = overlay.headline
    .slice(0, 2)
    .map((line) => `<span class="headline-line">${escapeHtml(line)}</span>`)
    .join("");
  const dekHtml = overlay.dek ? `<div class="dek">${escapeHtml(overlay.dek)}</div>` : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=${input.spec.width}, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    width: ${input.spec.width}px;
    height: ${input.spec.height}px;
    overflow: hidden;
    background: #111;
  }
  .frame {
    position: relative;
    width: ${input.spec.width}px;
    height: ${input.spec.height}px;
    overflow: hidden;
    font-family: "OpenAI Sans", "Söhne", "Sohne", "Inter", "Sukhumvit Set", "Noto Sans Thai", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .base {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .focus-vignette {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.04) 48%, rgba(0,0,0,0.62) 100%),
      radial-gradient(circle at 78% 22%, rgba(255,255,255,0.18), transparent 28%);
    pointer-events: none;
  }
  .reference {
    position: absolute;
    left: 168px;
    top: 390px;
    width: 604px;
    height: 356px;
    border-radius: 26px;
    overflow: hidden;
    background: rgba(16, 16, 16, 0.82);
    border: 1px solid rgba(255,255,255,0.42);
    box-shadow: 0 34px 92px rgba(0,0,0,0.44);
    transform: rotate(-1deg);
  }
  .reference img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .reference::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 26px;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.16);
    background: linear-gradient(145deg, rgba(255,255,255,0.22), transparent 34%);
    pointer-events: none;
  }
  .reference[aria-label]::before {
    content: "";
    position: absolute;
    left: 18px;
    top: 16px;
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: rgba(116, 170, 255, 0.92);
    box-shadow: 0 0 18px rgba(116, 170, 255, 0.55);
    z-index: 2;
  }
  .profile {
    position: absolute;
    right: 30px;
    bottom: 72px;
    width: 150px;
    height: 150px;
    border-radius: 999px;
    overflow: hidden;
    background: rgba(255,255,255,0.86);
    border: 3px solid rgba(255,255,255,0.76);
    box-shadow: 0 24px 62px rgba(0,0,0,0.38);
  }
  .profile img {
    position: absolute;
    width: 165px;
    height: auto;
    left: -8px;
    top: -1px;
    display: block;
  }
  .profile::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 999px;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.22);
    background: linear-gradient(150deg, rgba(255,255,255,0.22), transparent 40%);
    pointer-events: none;
  }
  .tags {
    position: absolute;
    left: 52px;
    top: 54px;
    max-width: 720px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px;
  }
  .tag {
    min-height: 64px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 0 30px;
    color: #fff;
    font-size: 32px;
    font-weight: 760;
    line-height: 1;
    background: rgba(20, 22, 28, 0.62);
    border: 1px solid rgba(255,255,255,0.18);
    box-shadow: 0 20px 50px rgba(0,0,0,0.26);
    backdrop-filter: blur(18px);
  }
  .copy {
    position: absolute;
    left: 52px;
    top: 760px;
    width: 930px;
    color: #fff;
    z-index: 4;
    text-shadow: 0 8px 30px rgba(0,0,0,0.52);
  }
  .headline {
    margin: 0;
    font-size: 78px;
    line-height: 1.08;
    letter-spacing: 0;
    font-weight: 880;
    font-family: "OpenAI Sans", "Söhne", "Sohne", "Sukhumvit Set", "Noto Sans Thai", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .headline-line {
    display: block;
    white-space: normal;
  }
  .headline-line + .headline-line {
    margin-top: 12px;
  }
  .dek {
    margin-top: 24px;
    max-width: 760px;
    padding-left: 16px;
    border-left: 5px solid rgba(83, 191, 255, 0.86);
    color: rgba(255,255,255,0.84);
    font-size: 34px;
    line-height: 1.28;
    font-weight: 430;
  }
</style>
</head>
<body>
  <main class="frame">
    <img class="base" src="${baseUrl}" alt="" />
    <div class="focus-vignette"></div>
    <div class="tags" aria-label="Hero topic tags">${tagHtml}</div>
    <section class="copy" aria-label="Editable hero text overlay">
      <h1 class="headline">${headlineHtml}</h1>
      ${dekHtml}
    </section>
    ${
      profileUrl
        ? `<figure class="profile" aria-label="${profileLabel}"><img src="${profileUrl}" alt="" /></figure>`
        : ""
    }
    ${
      referenceUrl
        ? `<figure class="reference" aria-label="${label}"><img src="${referenceUrl}" alt="" /></figure>`
        : ""
    }
  </main>
</body>
</html>`;
}

export async function composeReferenceLayer(
  input: ReferenceCompositeInput,
): Promise<ReferenceCompositeResult | null> {
  const baseLayerPath = path.join(input.paths.proposalDir, "asset-base.png");
  const compositePath = path.join(input.paths.proposalDir, "asset-composite.png");
  await fs.copyFile(input.paths.assetPng, baseLayerPath);
  await fs.writeFile(
    input.paths.assetHtml,
    buildReferenceCompositeHtml({
      spec: input.spec,
      baseImagePath: baseLayerPath,
      referenceImagePath: input.reference?.absPath,
      referenceLabel: input.reference?.label,
      profileImagePath: input.profile?.absPath,
      profileLabel: input.profile?.label,
      tags: buildHeroTags(input.source),
      textOverlay: buildHeroTextOverlay(input.source),
    }),
    "utf8",
  );
  await renderPngWithChrome({
    htmlPath: input.paths.assetHtml,
    outputPath: compositePath,
    width: input.spec.width,
    height: input.spec.height,
  });
  await fs.rename(compositePath, input.paths.assetPng);
  return {
    baseLayerPath: relativeToProject(baseLayerPath, input.paths.projectRoot),
    referenceLayerPath: input.reference?.relativePath,
    referenceLayerLabel: input.reference?.label,
    profileLayerPath: input.profile?.relativePath,
    profileLayerLabel: input.profile?.label,
  };
}

async function newestGeneratedImage(startedAtMs: number): Promise<string | null> {
  const root = path.join(os.homedir(), ".codex");
  const matches: { path: string; mtime: number }[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 6) return;
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name === "node_modules" ||
          entry.name === ".git" ||
          entry.name === "plugins" ||
          entry.name === "sessions"
        ) {
          continue;
        }
        await walk(abs, depth + 1);
      } else if (/\.(png|jpe?g|webp)$/i.test(entry.name)) {
        const stat = await fs.stat(abs).catch(() => null);
        if (stat && stat.mtimeMs >= startedAtMs - 2_000) {
          matches.push({ path: abs, mtime: stat.mtimeMs });
        }
      }
    }
  }

  await walk(root, 0);
  matches.sort((a, b) => b.mtime - a.mtime);
  return matches[0]?.path ?? null;
}

export function buildHeroImageCodexPrompt(input: {
  source: EngineSourcePack;
  spec: EngineVisualSpec;
  outputPath: string;
}): string {
  const { source, spec, outputPath } = input;
  const context = [
    `Title: ${spec.title || source.title}`,
    `Hook: ${source.hook}`,
    `Format: ${source.format}`,
    `Platforms: ${source.platforms.join(", ")}`,
    source.facts.length ? `Grounded facts: ${source.facts.slice(0, 4).join(" | ")}` : "",
    source.sourceText ? `Source context: ${source.sourceText.slice(0, 900)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `You are generating the visual base image for an Arutlee personal-brand social post.

USE the image_generation tool. Do not write SVG, HTML, canvas, Python art, screenshots, or procedural placeholders. The output must be a real generated raster hero image.

Generate ONE realistic, attractive, text-free base image at exactly 1080x1350 pixels, vertical 4:5 portrait. Save the final PNG to this exact absolute path:
${outputPath}

This follows the Vein content-engine discipline:
- Stage 1 is the clean base image only.
- Stage 2 overlays topic tags, source reference, profile signature, gradient, and headline later.
- The base image carries NO Thai text, NO English text, NO headline, NO logo, NO watermark, NO badges, NO UI labels, NO fake QR code.
- Keep the top-left corner calm for one or two topic tags.
- Keep the lower-right corner calm for Palm's profile signature avatar.
- Keep the lower 42% visually calm, darker or simpler, and compatible with a black gradient plus large white Thai headline overlay.
- Main subject belongs in the upper 58-62% of the frame.
- Palm's real profile image and source reference screenshots are composited later, so do not invent a central creator portrait or fake source screenshot inside the base image.

Arutlee visual direction:
- Premium realistic AI/product editorial, not a generic AI swirl and not stock photography.
- Topic-specific central subject inferred from the post: plausible product UI fragments without readable text, a device/desk/workflow scene, a voice waveform made visual, or a concrete tool/action motif.
- Editorial lighting, crisp focal subject, restrained color discipline, warm highlights, subtle depth, believable materials.
- If humans appear, make them natural and candid, not smiling at camera, not corporate stock.
- If interfaces appear, make them abstract/plausible with no readable labels or brand marks.

Post context:
${context}

Specific image brief:
${spec.prompt}

Negative constraints:
- No text of any language.
- No logos, icons, watermarks, news labels, or badges.
- No cartoon, clip art, flat vector, neon sci-fi clutter, plastic 3D mascot, emoji wall, or generic robot head.
- No busy lower third.

After generating, verify the file exists and is larger than 1KB. Reply with only the final saved path. If you cannot save or produce a real generated image file, reply exactly CANNOT_SAVE_IMAGE_FILE.`;
}

export function buildImageCodexArgs(input: {
  projectRoot: string;
  lastMessagePath: string;
  model?: string;
}): string[] {
  return [
    "exec",
    "--json",
    "--skip-git-repo-check",
    "--ephemeral",
    "--enable",
    "image_generation",
    "--sandbox",
    "workspace-write",
    "-m",
    input.model || DEFAULT_IMAGE_MODEL,
    "-C",
    input.projectRoot,
    "--output-last-message",
    input.lastMessagePath,
    "-",
  ];
}

export async function runCodexImageGeneration(
  input: CodexImageRunInput,
): Promise<CodexImageRunResult> {
  const codex = input.codexPath ?? (await findCodexCli());
  if (!codex) throw new Error("Codex CLI was not found on this machine.");

  await fs.mkdir(path.dirname(input.outputPath), { recursive: true });
  const startedAtMs = Date.now();
  const lastMessage = path.join(
    os.tmpdir(),
    `arutlee-imagegen-${process.pid}-${Date.now()}.txt`,
  );
  const args = buildImageCodexArgs({
    projectRoot: input.projectRoot,
    lastMessagePath: lastMessage,
    model: input.model,
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;
  const child = spawn(codex, args, {
    cwd: input.projectRoot,
    env: buildCodexEnv(process.env) as NodeJS.ProcessEnv,
  });
  child.stdin.end(input.prompt, "utf8");

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
    setTimeout(() => child.kill("SIGKILL"), 2_000).unref();
  }, input.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.on("close", resolve);
    child.on("error", reject);
  }).finally(() => clearTimeout(timeout));
  fs.unlink(lastMessage).catch(() => {});

  if (await fileExists(input.outputPath)) {
    return {
      path: relativeToProject(input.outputPath, input.projectRoot),
      prompt: input.prompt,
      stdout,
      stderr,
      timedOut,
      exitCode,
    };
  }

  const generated = await newestGeneratedImage(startedAtMs);
  if (generated && (await fileExists(generated))) {
    await fs.copyFile(generated, input.outputPath);
    return {
      path: relativeToProject(input.outputPath, input.projectRoot),
      prompt: input.prompt,
      stdout,
      stderr,
      timedOut,
      exitCode,
    };
  }

  return { path: null, prompt: input.prompt, stdout, stderr, timedOut, exitCode };
}

export async function generateHeroImage(
  source: EngineSourcePack,
  spec: EngineVisualSpec,
  paths: EngineArtifactPaths,
  options: GenerateHeroImageOptions = {},
): Promise<EngineImageResult> {
  const prompt = buildHeroImageCodexPrompt({ source, spec, outputPath: paths.assetPng });
  const runCodex = options.runCodexImage ?? runCodexImageGeneration;
  let codexResult: CodexImageRunResult | null = null;

  try {
    codexResult = await runCodex({
      prompt,
      outputPath: paths.assetPng,
      projectRoot: paths.projectRoot,
      timeoutMs: options.timeoutMs,
    });
    if (codexResult.path && (await fileExists(paths.assetPng))) {
      await (options.normalizeImage ?? normalizeHeroImage)(
        paths.assetPng,
        spec.width,
        spec.height,
      );
      const reference = await pickSourceReferenceImage(source, paths.projectRoot);
      const profile = await pickProfileImage(paths.projectRoot);
      const composite = reference || profile
        ? await (options.composeReferenceLayer ?? composeReferenceLayer)({
            source,
            spec,
            paths,
            reference,
            profile,
          })
        : null;
      return {
        provider: "codex-image",
        path: codexResult.path,
        prompt,
        ...(composite ?? {}),
        stdout: codexResult.stdout,
        stderr: codexResult.stderr,
        timedOut: codexResult.timedOut,
        exitCode: codexResult.exitCode,
      };
    }
  } catch (err) {
    codexResult = {
      path: null,
      prompt,
      stdout: "",
      stderr: err instanceof Error ? err.message : String(err),
      timedOut: false,
      exitCode: null,
    };
  }

  const renderFallback = options.renderFallback ?? renderVisualSpec;
  await renderFallback(spec, paths);
  const reason = codexResult?.timedOut
    ? "Codex imagegen timed out before producing a usable hero image."
    : codexResult?.stderr
    ? `Codex imagegen did not produce a usable hero image: ${codexResult.stderr.slice(0, 240)}`
    : "Codex imagegen did not produce a usable hero image.";

  return {
    provider: "html-fallback",
    path: paths.relative.assetPng,
    prompt,
    fallbackReason: reason,
    stdout: codexResult?.stdout ?? "",
    stderr: codexResult?.stderr ?? "",
    timedOut: codexResult?.timedOut ?? false,
    exitCode: codexResult?.exitCode ?? null,
  };
}
