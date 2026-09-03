import path from "node:path";
import { PROJECT_ROOT } from "../paths";
import type { EngineArtifactPaths } from "./types";
import type { PlatformId } from "../types";

const PLATFORM_ORDER: PlatformId[] = [
  "linkedin",
  "facebook",
  "instagram",
  "threads",
  "tiktok",
  "youtube",
];
const ENGINE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PROPOSAL_ID_RE = /^\d{8}-\d{6}$/;

export function isEngineSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 96 &&
    ENGINE_SLUG_RE.test(value)
  );
}

export function isProposalId(value: unknown): value is string {
  return typeof value === "string" && PROPOSAL_ID_RE.test(value);
}

function assertEngineSlug(slug: string): void {
  if (!isEngineSlug(slug)) throw new Error(`invalid engine slug: ${slug}`);
}

function assertProposalId(proposalId: string): void {
  if (!isProposalId(proposalId)) throw new Error(`invalid proposal id: ${proposalId}`);
}

export function engineSlugFromText(input: string, fallback = "post"): string {
  const normalized = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const words = normalized.match(/[a-z0-9]+/g) ?? [];
  const slug = words.join("-").replace(/-{2,}/g, "-").slice(0, 72).replace(/-$/g, "");
  return slug || fallback;
}

export function proposalStamp(date = new Date()): string {
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
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}-${get("hour")}${get("minute")}${get("second")}`;
}

export function pieceFolder(slug: string, projectRoot = PROJECT_ROOT): string {
  assertEngineSlug(slug);
  return path.join(projectRoot, "pieces", slug);
}

export function proposalFolder(
  slug: string,
  proposalId: string,
  projectRoot = PROJECT_ROOT,
): string {
  assertProposalId(proposalId);
  return path.join(pieceFolder(slug, projectRoot), "proposals", proposalId);
}

export function relativeToProject(absPath: string, projectRoot = PROJECT_ROOT): string {
  return path.relative(projectRoot, absPath).split(path.sep).join("/");
}

export function artifactPaths(
  slug: string,
  proposalId: string,
  projectRoot = PROJECT_ROOT,
): EngineArtifactPaths {
  assertEngineSlug(slug);
  assertProposalId(proposalId);
  const pieceDir = pieceFolder(slug, projectRoot);
  const referencesDir = path.join(pieceDir, "references");
  const proposalsDir = path.join(pieceDir, "proposals");
  const proposalDir = proposalFolder(slug, proposalId, projectRoot);
  const platformsDir = path.join(proposalDir, "platforms");
  const platformPosts = PLATFORM_ORDER.reduce(
    (acc, platform) => {
      acc[platform] = path.join(platformsDir, platform, "post.md");
      return acc;
    },
    {} as Record<PlatformId, string>,
  );

  const paths = {
    projectRoot,
    slug,
    proposalId,
    pieceDir,
    referencesDir,
    proposalsDir,
    proposalDir,
    platformsDir,
    sourceMd: path.join(pieceDir, "source.md"),
    sourceFactsJson: path.join(pieceDir, "source-facts.json"),
    briefMd: path.join(proposalDir, "brief.md"),
    proposalJson: path.join(proposalDir, "proposal.json"),
    textMd: path.join(proposalDir, "text.md"),
    visualSpecTs: path.join(proposalDir, "visual-spec.ts"),
    assetHtml: path.join(proposalDir, "asset.html"),
    assetPng: path.join(proposalDir, "asset.png"),
    qaJson: path.join(proposalDir, "qa.json"),
    notesMd: path.join(proposalDir, "notes.md"),
    reviewStateJson: path.join(pieceDir, "review-state.json"),
    platformPosts,
  };

  return {
    ...paths,
    relative: {
      pieceDir: relativeToProject(paths.pieceDir, projectRoot),
      proposalDir: relativeToProject(paths.proposalDir, projectRoot),
      sourceMd: relativeToProject(paths.sourceMd, projectRoot),
      sourceFactsJson: relativeToProject(paths.sourceFactsJson, projectRoot),
      briefMd: relativeToProject(paths.briefMd, projectRoot),
      proposalJson: relativeToProject(paths.proposalJson, projectRoot),
      textMd: relativeToProject(paths.textMd, projectRoot),
      visualSpecTs: relativeToProject(paths.visualSpecTs, projectRoot),
      assetHtml: relativeToProject(paths.assetHtml, projectRoot),
      assetPng: relativeToProject(paths.assetPng, projectRoot),
      qaJson: relativeToProject(paths.qaJson, projectRoot),
      notesMd: relativeToProject(paths.notesMd, projectRoot),
      reviewStateJson: relativeToProject(paths.reviewStateJson, projectRoot),
      platformPosts: PLATFORM_ORDER.reduce(
        (acc, platform) => {
          acc[platform] = relativeToProject(paths.platformPosts[platform], projectRoot);
          return acc;
        },
        {} as Record<PlatformId, string>,
      ),
    },
  };
}
