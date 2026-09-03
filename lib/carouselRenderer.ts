import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { renderPngWithChrome } from "./contentEngine/renderer";
import type { CarouselSlide, PieceRecord } from "./types";

const WIDTH = 1080;
const HEIGHT = 1350;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function runStamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}-${get("hour")}${get("minute")}${get("second")}`;
}

function safeProjectPath(projectRoot: string, relativePath?: string): string | null {
  if (!relativePath) return null;
  const resolved = path.resolve(projectRoot, relativePath);
  if (!resolved.startsWith(projectRoot + path.sep)) return null;
  return resolved;
}

function titleSize(slide: CarouselSlide): number {
  const length = slide.title.trim().length;
  if (slide.kind === "cover") return length > 90 ? 58 : length > 55 ? 68 : 80;
  return length > 95 ? 46 : length > 60 ? 54 : 62;
}

function bodySize(slide: CarouselSlide): number {
  const length = `${slide.body} ${(slide.bullets ?? []).join(" ")}`.trim().length;
  return length > 430 ? 27 : length > 280 ? 31 : 35;
}

export function buildCarouselSlideHtml(input: {
  piece: Pick<PieceRecord, "format" | "title">;
  slide: CarouselSlide;
  deckLength: number;
  backgroundPath?: string | null;
}): string {
  const { piece, slide, deckLength } = input;
  const title = escapeHtml(slide.title);
  const body = escapeHtml(slide.body);
  const backgroundUrl = input.backgroundPath ? pathToFileURL(input.backgroundPath).href : null;
  const bullets = (slide.bullets ?? [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const cover = slide.kind === "cover";
  const outro = slide.kind === "outro";
  const kindLabel = cover ? "COVER" : outro ? "TAKEAWAY" : slide.kind.toUpperCase();
  const titlePx = titleSize(slide);
  const bodyPx = bodySize(slide);
  const visual = backgroundUrl
    ? `<img class="generated" src="${backgroundUrl}" alt="" />`
    : `<div class="generated placeholder"><span></span><span></span><span></span></div>`;

  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=${WIDTH}, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    overflow: hidden;
    background: #F5F1E8;
    color: #1A1A1A;
    font-family: "Noto Sans Thai", "IBM Plex Sans Thai", "Sukhumvit Set", Thonburi, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .slide { position: relative; width: 100%; height: 100%; overflow: hidden; background: #F5F1E8; }
  .paper-grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(26,26,26,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(26,26,26,.055) 1px, transparent 1px);
    background-size: 54px 54px;
    opacity: .48;
  }
  .visual { position: absolute; overflow: hidden; background: #17191f; }
  .visual .generated { width: 100%; height: 100%; object-fit: cover; display: block; }
  .placeholder {
    background:
      radial-gradient(circle at 72% 22%, rgba(212,52,26,.54), transparent 26%),
      radial-gradient(circle at 25% 72%, rgba(245,241,232,.16), transparent 30%),
      linear-gradient(145deg, #101216 0%, #242731 55%, #141519 100%);
  }
  .placeholder span { position: absolute; border: 1px solid rgba(255,255,255,.22); border-radius: 28px; }
  .placeholder span:nth-child(1) { width: 48%; height: 34%; left: 11%; top: 14%; transform: rotate(-8deg); }
  .placeholder span:nth-child(2) { width: 38%; height: 48%; right: 9%; top: 20%; transform: rotate(7deg); }
  .placeholder span:nth-child(3) { width: 62%; height: 16%; left: 20%; bottom: 13%; }
  .visual::after { content: ""; position: absolute; inset: 0; pointer-events: none; }
  .meta {
    position: absolute; z-index: 4; display: flex; align-items: center; gap: 16px;
    font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 23px; font-weight: 700; letter-spacing: .07em;
  }
  .dot { width: 12px; height: 12px; border-radius: 50%; background: #D4341A; box-shadow: 0 0 0 7px rgba(212,52,26,.14); }
  .count { margin-left: auto; color: inherit; opacity: .62; }
  h1 { margin: 0; font-size: ${titlePx}px; line-height: 1.08; letter-spacing: -.025em; font-weight: 840; white-space: pre-line; }
  .body { margin-top: 26px; font-size: ${bodyPx}px; line-height: 1.38; font-weight: 480; white-space: pre-line; }
  ul { list-style: none; margin: 26px 0 0; padding: 0; display: grid; gap: 14px; }
  li { position: relative; padding-left: 32px; font-size: ${bodyPx - 2}px; line-height: 1.34; font-weight: 540; }
  li::before { content: ""; position: absolute; left: 2px; top: .56em; width: 12px; height: 12px; border-radius: 50%; background: #D4341A; }
  .wordmark { position: absolute; z-index: 5; font-size: 22px; font-weight: 820; letter-spacing: .14em; }
  .rule { position: absolute; z-index: 4; height: 5px; background: #D4341A; }

  .slide.cover { background: #111318; color: #fff; }
  .cover .visual { inset: 0; }
  .cover .visual::after { background: linear-gradient(to bottom, rgba(8,9,12,.06) 18%, rgba(8,9,12,.35) 52%, rgba(8,9,12,.96) 100%); }
  .cover .meta { left: 62px; right: 62px; top: 58px; color: #fff; }
  .cover .copy { position: absolute; z-index: 4; left: 62px; right: 62px; bottom: 100px; }
  .cover .body { max-width: 850px; color: rgba(255,255,255,.78); }
  .cover .wordmark { right: 62px; bottom: 50px; color: rgba(255,255,255,.72); }
  .cover .rule { left: 62px; bottom: 64px; width: 190px; }

  .slide.interior .visual { left: 46px; right: 46px; top: 118px; height: 525px; border-radius: 30px; box-shadow: 0 28px 68px rgba(26,26,26,.20); }
  .interior .visual::after { box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); border-radius: 30px; }
  .interior .meta { left: 52px; right: 52px; top: 50px; }
  .interior .copy { position: absolute; z-index: 4; left: 62px; right: 62px; top: 704px; bottom: 88px; }
  .interior .body { max-width: 930px; color: rgba(26,26,26,.78); }
  .interior .wordmark { right: 56px; bottom: 40px; color: rgba(26,26,26,.54); }
  .interior .rule { left: 62px; top: 676px; width: 160px; }
  .interior.outro .visual { height: 420px; }
  .interior.outro .copy { top: 610px; }
  .interior.outro .rule { top: 578px; width: 260px; }
</style>
</head>
<body>
  <main class="slide ${cover ? "cover" : `interior ${outro ? "outro" : ""}`}">
    <div class="paper-grid"></div>
    <section class="visual">${visual}</section>
    <header class="meta"><span class="dot"></span><span>ARUTLEE / ${escapeHtml(kindLabel)}</span><span class="count">${String(slide.index).padStart(2, "0")} / ${String(deckLength).padStart(2, "0")}</span></header>
    <div class="rule"></div>
    <section class="copy">
      <h1>${title}</h1>
      ${body ? `<div class="body">${body}</div>` : ""}
      ${bullets ? `<ul>${bullets}</ul>` : ""}
    </section>
    <div class="wordmark">ARUTLEE</div>
  </main>
</body>
</html>`;
}

export async function renderCarouselDeck(input: {
  piece: PieceRecord;
  projectRoot: string;
  now?: Date;
}): Promise<{ slides: CarouselSlide[]; outputDir: string }> {
  const { piece, projectRoot } = input;
  const sourceSlides = (piece.carousel ?? []).slice().sort((a, b) => a.index - b.index);
  if (sourceSlides.length < 2) throw new Error("Build at least two carousel slides before rendering.");
  const stamp = runStamp(input.now);
  const absOutputDir = path.join(projectRoot, "pieces", piece.id, "carousel", stamp);
  const relativeOutputDir = path.relative(projectRoot, absOutputDir).split(path.sep).join("/");
  await fs.mkdir(absOutputDir, { recursive: true });

  const rendered: CarouselSlide[] = [];
  for (const slide of sourceSlides) {
    const suffix = String(slide.index).padStart(2, "0");
    const htmlPath = path.join(absOutputDir, `slide-${suffix}.html`);
    const pngPath = path.join(absOutputDir, `slide-${suffix}.png`);
    const backgroundPath = safeProjectPath(projectRoot, slide.background_path);
    const html = buildCarouselSlideHtml({
      piece,
      slide,
      deckLength: sourceSlides.length,
      backgroundPath,
    });
    await fs.writeFile(htmlPath, html, "utf8");
    await renderPngWithChrome({ htmlPath, outputPath: pngPath, width: WIDTH, height: HEIGHT });
    rendered.push({
      ...slide,
      asset_path: `${relativeOutputDir}/slide-${suffix}.png`,
    });
  }
  return { slides: rendered, outputDir: relativeOutputDir };
}
