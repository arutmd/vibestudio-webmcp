import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { EngineArtifactPaths, EngineVisualSpec } from "./types";

type ChromeJob = {
  htmlPath: string;
  outputPath: string;
  width: number;
  height: number;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildRenderHtml(spec: EngineVisualSpec): string {
  const title = escapeHtml(spec.title);
  const subtitle = escapeHtml(spec.subtitle);
  const badge = escapeHtml(spec.badge);
  const footer = escapeHtml(spec.footer);
  const p = spec.palette;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=${spec.width}, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    width: ${spec.width}px;
    height: ${spec.height}px;
    overflow: hidden;
    background: ${p.background};
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .frame {
    position: relative;
    width: ${spec.width}px;
    height: ${spec.height}px;
    padding: 72px;
    background:
      radial-gradient(circle at 78% 14%, rgba(228,111,61,0.22), transparent 24%),
      linear-gradient(135deg, ${p.background} 0%, #ffffff 45%, ${p.background} 100%);
  }
  .panel {
    position: absolute;
    inset: 72px;
    border-radius: 34px;
    background: ${p.panel};
    color: ${p.text};
    overflow: hidden;
    box-shadow: 0 36px 90px rgba(20, 20, 20, 0.22);
  }
  .grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.075) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.075) 1px, transparent 1px);
    background-size: 72px 72px;
    mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 78%);
  }
  .accent {
    position: absolute;
    left: 64px;
    top: 64px;
    width: 118px;
    height: 16px;
    border-radius: 999px;
    background: ${p.accent};
  }
  .badge {
    position: absolute;
    right: 64px;
    top: 54px;
    max-width: 360px;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 999px;
    padding: 14px 18px;
    color: ${p.muted};
    font-size: 25px;
    font-weight: 650;
    line-height: 1;
    text-transform: capitalize;
  }
  .copy {
    position: absolute;
    left: 64px;
    right: 64px;
    bottom: 84px;
  }
  h1 {
    margin: 0;
    max-width: 850px;
    font-size: 78px;
    line-height: 0.98;
    letter-spacing: 0;
    font-weight: 760;
  }
  .subtitle {
    margin-top: 30px;
    max-width: 760px;
    color: ${p.muted};
    font-size: 34px;
    line-height: 1.23;
    font-weight: 520;
  }
  .footer {
    margin-top: 54px;
    display: flex;
    justify-content: space-between;
    gap: 32px;
    align-items: center;
    color: ${p.muted};
    font-size: 24px;
    font-weight: 620;
  }
  .motif {
    position: absolute;
    left: 64px;
    top: 188px;
    width: 420px;
    height: 180px;
    border-radius: 28px;
    border: 1px solid rgba(255,255,255,0.12);
    background:
      linear-gradient(90deg, rgba(255,255,255,0.12), transparent 52%),
      linear-gradient(180deg, rgba(255,255,255,0.08), transparent);
    opacity: 0.65;
  }
  .motif::before,
  .motif::after {
    content: "";
    position: absolute;
    left: 28px;
    right: 28px;
    height: 10px;
    border-radius: 999px;
    background: rgba(255,255,255,0.16);
  }
  .motif::before {
    top: 42px;
  }
  .motif::after {
    top: 82px;
    right: 104px;
  }
  .mark {
    color: ${p.accent};
  }
</style>
</head>
<body>
  <main class="frame">
    <section class="panel">
      <div class="grid"></div>
      <div class="accent"></div>
      <div class="badge">${badge}</div>
      <div class="motif"></div>
      <div class="copy">
        <h1>${title}</h1>
        <div class="subtitle">${subtitle}</div>
        <div class="footer">
          <span>VibeStudio</span>
          <span class="mark">${footer}</span>
        </div>
      </div>
    </section>
  </main>
</body>
</html>`;
}

export function buildChromeArgs(job: ChromeJob): string[] {
  return [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--window-size=${job.width},${job.height}`,
    `--screenshot=${job.outputPath}`,
    `file://${job.htmlPath}`,
  ];
}

async function findChrome(): Promise<string | null> {
  const candidates = [
    process.env.CHROME_PATH?.trim(),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      await fs.access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // Try the next common install path.
    }
  }
  return null;
}

export async function renderPngWithChrome(job: ChromeJob): Promise<void> {
  const chrome = await findChrome();
  if (!chrome) throw new Error("Headless Chrome was not found.");

  await fs.mkdir(path.dirname(job.outputPath), { recursive: true });
  const args = buildChromeArgs(job);
  const code = await new Promise<number | null>((resolve, reject) => {
    const child = spawn(/* turbopackIgnore: true */ chrome, args, { stdio: "ignore" });
    child.on("close", resolve);
    child.on("error", reject);
  });
  if (code !== 0) throw new Error(`Chrome screenshot failed with exit code ${code}`);
}

export async function renderVisualSpec(
  spec: EngineVisualSpec,
  paths: EngineArtifactPaths,
): Promise<void> {
  await fs.mkdir(paths.proposalDir, { recursive: true });
  await fs.writeFile(paths.assetHtml, buildRenderHtml(spec), "utf8");
  await renderPngWithChrome({
    htmlPath: paths.assetHtml,
    outputPath: paths.assetPng,
    width: spec.width,
    height: spec.height,
  });
}
