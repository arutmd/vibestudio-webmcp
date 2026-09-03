import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { constants as fsConstants, type Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { PIECES_DIR, PROJECT_ROOT } from "./paths";
import { buildCodexEnv } from "./contentEngine/codexProvider";

type CodexImageResult = {
  path: string | null;
  prompt: string;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  exitCode: number | null;
};

type CodexBackgroundInput = {
  pieceId?: string;
  prompt: string;
  headline?: string;
  timeoutMs?: number;
  kind: "cover" | "carousel" | "template";
  slideIndex?: number;
  deckLength?: number;
  referencePath?: string;
};

const DEFAULT_TIMEOUT_MS = 180_000;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

async function findCodexCli(): Promise<string | null> {
  const candidates = [
    process.env.CODEX_CLI_PATH?.trim(),
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    path.join(os.homedir(), ".local", "bin", "codex"),
  ].filter((p): p is string => !!p);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // Try the next known install path.
    }
  }
  return null;
}

async function newestGeneratedImage(startedAtMs: number): Promise<string | null> {
  const root = path.join(os.homedir(), ".codex");
  const matches: { path: string; mtime: number }[] = [];

  async function walk(dir: string, depth: number) {
    if (depth > 5) return;
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

async function generateBackgroundWithCodex(input: CodexBackgroundInput): Promise<CodexImageResult> {
  const codex = await findCodexCli();
  if (!codex) {
    throw new Error("Codex CLI was not found on this machine.");
  }

  if (input.kind !== "template" && !input.pieceId) {
    throw new Error("pieceId is required for piece background generation.");
  }

  const pieceDir = input.pieceId ? path.join(PIECES_DIR, input.pieceId) : null;
  const outputDir = input.kind === "template"
    ? path.join(process.cwd(), "public", "template-studio", "generated")
    : input.kind === "carousel"
      ? path.join(pieceDir as string, "carousel", "backgrounds")
      : pieceDir as string;
  await fs.mkdir(outputDir, { recursive: true });
  const hash = crypto
    .createHash("sha1")
    .update(`${input.prompt}\n${Date.now()}`)
    .digest("hex")
    .slice(0, 8);
  const slideNumber = String(input.slideIndex ?? 1).padStart(2, "0");
  const prefix = input.kind === "template"
    ? "template-sample-codex"
    : input.kind === "carousel"
      ? `slide-${slideNumber}-bg-codex`
      : "cover-bg-codex";
  const filename = `${prefix}-${hash}.png`;
  const absOutput = path.join(outputDir, filename);
  const relOutput = input.kind === "template"
    ? `/template-studio/generated/${filename}`
    : input.kind === "carousel"
      ? `pieces/${input.pieceId}/carousel/backgrounds/${filename}`
      : `pieces/${input.pieceId}/${filename}`;
  const startedAtMs = Date.now();
  const lastMessage = path.join(outputDir, `${prefix}-${hash}.txt`);

  const assetLabel = input.kind === "template"
    ? "a sample background that demonstrates a reusable creator template"
    : input.kind === "carousel"
      ? `slide ${input.slideIndex ?? 1} of ${input.deckLength ?? "the"} in one coherent Arutlee carousel`
      : "an Arutlee Thai tech-news cover";
  const layoutRequirements = input.kind === "template"
    ? `- This is a replaceable sample for a reusable template, not a finished post.
- Follow the supplied art direction and composition constraints precisely.
- Make the output useful for testing the template's text slots and safe areas.
- Do not make the sample content part of the image.`
    : input.kind === "carousel"
      ? `- This image is one member of a carousel deck. Keep a consistent material, lighting, palette, and visual world across slides.
- Reserve the lower half for Thai title and body overlays. Keep the main subject in the upper half.
- Do not generate a complete designed slide. Generate only the clean visual layer that Studio will place inside the branded carousel system.`
      : `- Keep the top-left corner calm for a category badge and the top-right corner calm for a profile avatar.
- Keep the lower 42 percent visually calm and compatible with a black gradient plus large white Thai headline overlay.`;

  const agentPrompt = `You have access to Codex's native image_generation tool.

USE THAT TOOL. Do not write SVG, Python, HTML, canvas code, screenshots, or procedural placeholders. The output must be a real generated raster image.

Create ONE text-free base image for ${assetLabel}.

Before generating, infer the strongest visual hook from the post and, if web search is available, do a quick visual-research pass to identify relevant motifs, products, interfaces, devices, diagrams, or public launch imagery. Use that only as inspiration. Do not use a fetched web image as the final output.

Save the actual generated image file to this exact path:
${absOutput}

Do not create a placeholder with code. Do not use screenshots from the web as the final file. The image must be generated by image_generation.

Background requirements:
- 4:5 editorial base image, suitable for a final 1080x1350 crop.
- The image must be topic-specific, not generic: choose a central subject that matches the article hook, such as app UI, voice waveform, dashboard, phone, agent workflow, product interface, model-release motif, or abstract system diagram.
- No Thai headline text, no English headline text, no logo, no watermark, no news badge, no labels, no fake QR code.
${layoutRequirements}
- Premium AI/product editorial style: polished, topic-specific, crisp focal subject, restrained color discipline, not stock-like.
- Topic headline for context only: ${input.headline || "AI tech update"}

Image prompt:
${input.prompt}
${input.referencePath ? `\nVisual reference file (guidance only, do not copy literally):\n${input.referencePath}` : ""}

After saving, verify the file exists and is larger than 1KB. Reply with only the final saved path. If you cannot save an actual generated image file, reply exactly CANNOT_SAVE_IMAGE_FILE.`;

  const args = [
    "exec",
    "--json",
    "--skip-git-repo-check",
    "--ephemeral",
    "--enable",
    "image_generation",
    "--sandbox",
    "workspace-write",
    "-m",
    process.env.ARUTLEE_CODEX_IMAGE_MODEL?.trim() ||
      process.env.ARUTLEE_CODEX_MODEL?.trim() ||
      "gpt-5.4-mini",
    "-C",
    PROJECT_ROOT,
    "--output-last-message",
    lastMessage,
    "-",
  ];

  let stdout = "";
  let stderr = "";
  let timedOut = false;

  const child = spawn(/* turbopackIgnore: true */ codex, args, {
    cwd: PROJECT_ROOT,
    env: buildCodexEnv(process.env) as NodeJS.ProcessEnv,
  });
  child.stdin.end(agentPrompt, "utf8");

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
    child.on("close", (code) => resolve(code));
    child.on("error", reject);
  }).finally(() => clearTimeout(timeout));

  if (await fileExists(absOutput)) {
    return { path: relOutput, prompt: input.prompt, stdout, stderr, timedOut, exitCode };
  }

  const generated = await newestGeneratedImage(startedAtMs);
  if (generated && (await fileExists(generated))) {
    await fs.copyFile(generated, absOutput);
    return { path: relOutput, prompt: input.prompt, stdout, stderr, timedOut, exitCode };
  }

  return { path: null, prompt: input.prompt, stdout, stderr, timedOut, exitCode };
}

export async function generateCoverBackgroundWithCodex(input: {
  pieceId: string;
  prompt: string;
  headline?: string;
  timeoutMs?: number;
}): Promise<CodexImageResult> {
  return generateBackgroundWithCodex({ ...input, kind: "cover" });
}

export async function generateCarouselBackgroundWithCodex(input: {
  pieceId: string;
  prompt: string;
  headline?: string;
  slideIndex: number;
  deckLength: number;
  timeoutMs?: number;
}): Promise<CodexImageResult> {
  return generateBackgroundWithCodex({ ...input, kind: "carousel" });
}

export async function generateTemplateBackgroundWithCodex(input: {
  prompt: string;
  headline?: string;
  referencePath?: string;
  timeoutMs?: number;
}): Promise<CodexImageResult> {
  return generateBackgroundWithCodex({ ...input, kind: "template" });
}
