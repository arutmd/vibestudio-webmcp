import fs from "node:fs/promises";
import path from "node:path";
import { nowIso } from "../jsonl";
import type { PlatformId } from "../types";
import { readPngDimensions } from "./imageGenerator";
import type {
  EngineArtifactPaths,
  EnginePlatformVariants,
  EngineImageResult,
  EngineQaCheck,
  EngineQaResult,
  EngineSourcePack,
  EngineTextProposal,
  EngineVisualSpec,
} from "./types";

const PLATFORM_ORDER: PlatformId[] = [
  "linkedin",
  "facebook",
  "instagram",
  "threads",
  "tiktok",
  "youtube",
];

async function writeText(file: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${content.trim()}\n`, "utf8");
}

export async function writeTextProposalArtifacts(
  source: EngineSourcePack,
  proposal: EngineTextProposal,
  paths: EngineArtifactPaths,
): Promise<void> {
  const brief = [
    `# ${proposal.title}`,
    "",
    `Provider: ${proposal.provider}`,
    proposal.fallbackReason ? `Fallback reason: ${proposal.fallbackReason}` : "",
    `Source: ${source.slug}`,
    "",
    "## Hook",
    "",
    proposal.hook,
    "",
    "## Visual Prompt",
    "",
    proposal.visualPrompt,
  ]
    .filter((line) => line !== "")
    .join("\n");
  const text = [
    `# ${proposal.title}`,
    "",
    "## Master Body",
    "",
    proposal.body,
    "",
    "## Platform Variants",
    "",
    ...PLATFORM_ORDER.map(
      (platform) =>
        `### ${platform}\n\n${proposal.platformVariants[platform] ?? proposal.body}`,
    ),
  ].join("\n");

  await writeText(paths.briefMd, brief);
  await writeText(paths.proposalJson, JSON.stringify(proposal, null, 2));
  await writeText(paths.textMd, text);
}

export async function writeVisualSpecArtifact(
  spec: EngineVisualSpec,
  paths: EngineArtifactPaths,
): Promise<void> {
  const code = [
    "export default ",
    JSON.stringify(spec, null, 2),
    ";\n",
  ].join("");
  await writeText(paths.visualSpecTs, code);
}

export function buildPlatformVariants(
  source: EngineSourcePack,
  proposal: EngineTextProposal,
): EnginePlatformVariants {
  return source.platforms.reduce((acc, platform) => {
    acc[platform] = proposal.platformVariants[platform] ?? proposal.body;
    return acc;
  }, {} as EnginePlatformVariants);
}

export async function writePlatformPack(
  source: EngineSourcePack,
  proposal: EngineTextProposal,
  paths: EngineArtifactPaths,
): Promise<EnginePlatformVariants> {
  const variants = buildPlatformVariants(source, proposal);
  await Promise.all(
    source.platforms.map(async (platform) => {
      await writeText(
        paths.platformPosts[platform],
        [
          `# ${platform}`,
          "",
          variants[platform] ?? proposal.body,
          "",
          "## Asset",
          "",
          paths.relative.assetPng,
        ].join("\n"),
      );
    }),
  );
  return variants;
}

export async function buildQaResult(input: {
  source: EngineSourcePack;
  proposal: EngineTextProposal;
  visualSpec: EngineVisualSpec;
  image?: EngineImageResult;
  assetPath: string;
  at?: string;
}): Promise<EngineQaResult> {
  const assetExists = await fs
    .stat(input.assetPath)
    .then((stat) => stat.isFile() && stat.size > 1024)
    .catch(() => false);
  const dimensions = assetExists ? await readPngDimensions(input.assetPath) : null;
  const dimensionsOk =
    dimensions?.width === input.visualSpec.width && dimensions.height === input.visualSpec.height;
  const visualResult: EngineQaCheck["result"] = !assetExists
    ? "fail"
    : !dimensionsOk
    ? "fail"
    : input.image?.provider === "html-fallback"
    ? "warn"
    : "pass";
  const visualDetail = !assetExists
    ? "Hero PNG was not created."
    : !dimensions
    ? "Hero PNG exists but dimensions could not be read."
    : !dimensionsOk
    ? `Hero PNG is ${dimensions.width}x${dimensions.height}; expected ${input.visualSpec.width}x${input.visualSpec.height}.`
    : input.image?.provider === "html-fallback"
    ? input.image.fallbackReason ?? "Fallback rendered PNG exists; Codex imagegen did not complete."
    : `Codex imagegen hero PNG exists at ${dimensions.width}x${dimensions.height}.`;
  const hasLocalSourceImage = input.source.references.some(
    (ref) => ref.kind === "image" && /\.(png|jpe?g|webp)$/i.test(ref.localPath ?? ""),
  );
  const checks: EngineQaCheck[] = [
    {
      id: "source",
      label: "Source pack",
      result: input.source.sourceText.trim().length >= 40 ? "pass" : "warn",
      detail: "Source pack has enough context for a grounded post.",
    },
    {
      id: "text",
      label: "Post body",
      result: input.proposal.body.trim().length >= 180 ? "pass" : "warn",
      detail: "Master body exists and is long enough to edit.",
    },
    {
      id: "visual",
      label: "Hero image",
      result: visualResult,
      detail: visualDetail,
    },
    {
      id: "prompt",
      label: "Visual brief",
      result: input.visualSpec.prompt.trim().length >= 40 ? "pass" : "warn",
      detail: "Visual prompt is topic-specific enough for image generation.",
    },
  ];
  if (hasLocalSourceImage || input.image?.referenceLayerPath) {
    checks.push({
      id: "reference-layer",
      label: "Source image layer",
      result: input.image?.referenceLayerPath ? "pass" : "warn",
      detail: input.image?.referenceLayerPath
        ? `Layered real source image: ${input.image.referenceLayerPath}.`
        : "A local source image exists, but the final hero did not record a separate source image layer.",
    });
  }
  if (input.image?.profileLayerPath) {
    checks.push({
      id: "profile-layer",
      label: "Profile image layer",
      result: "pass",
      detail: `Layered profile image: ${input.image.profileLayerPath}.`,
    });
  }
  const verdict = checks.some((check) => check.result === "fail")
    ? "fail"
    : checks.some((check) => check.result === "warn")
    ? "warn"
    : "pass";
  return {
    verdict,
    checks,
    generatedAt: input.at ?? nowIso(),
  };
}

export async function writeQaArtifacts(
  qa: EngineQaResult,
  paths: EngineArtifactPaths,
): Promise<void> {
  await writeText(paths.qaJson, JSON.stringify(qa, null, 2));
  await writeText(
    paths.notesMd,
    [
      "# Engine Notes",
      "",
      `QA verdict: ${qa.verdict}`,
      "",
      ...qa.checks.map((check) => `- ${check.label}: ${check.result} - ${check.detail}`),
    ].join("\n"),
  );
}
