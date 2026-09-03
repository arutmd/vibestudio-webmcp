import path from "node:path";
import { PROJECT_ROOT } from "../paths";
import {
  artifactPaths,
  engineSlugFromText,
  isEngineSlug,
  isProposalId,
  pieceFolder,
  proposalFolder,
  proposalStamp,
} from "./paths";

const slug = engineSlugFromText("OpenAI Realtime 2 voice action test");
if (slug !== "openai-realtime-2-voice-action-test") {
  throw new Error(`unexpected slug: ${slug}`);
}

const thaiFallback = engineSlugFromText("ลองใช้โมเดลเสียงใหม่", "voice-model");
if (thaiFallback !== "voice-model") {
  throw new Error(`expected fallback slug, got ${thaiFallback}`);
}

const stamp = proposalStamp(new Date("2026-06-04T03:05:06+07:00"));
if (stamp !== "20260604-030506") {
  throw new Error(`bad stamp format: ${stamp}`);
}

const folder = pieceFolder("demo-post");
if (folder !== path.join(PROJECT_ROOT, "pieces", "demo-post")) {
  throw new Error(`bad piece folder: ${folder}`);
}

const pFolder = proposalFolder("demo-post", "20260604-030506");
if (pFolder !== path.join(PROJECT_ROOT, "pieces", "demo-post", "proposals", "20260604-030506")) {
  throw new Error(`bad proposal folder: ${pFolder}`);
}

const tempRoot = path.join(PROJECT_ROOT, ".tmp-engine-test");
const paths = artifactPaths("demo-post", "20260604-030506", tempRoot);
if (paths.relative.assetPng !== "pieces/demo-post/proposals/20260604-030506/asset.png") {
  throw new Error(`bad relative asset path: ${paths.relative.assetPng}`);
}
if (paths.relative.proposalJson !== "pieces/demo-post/proposals/20260604-030506/proposal.json") {
  throw new Error(`bad proposal json path: ${paths.relative.proposalJson}`);
}
if (paths.relative.platformPosts.tiktok !== "pieces/demo-post/proposals/20260604-030506/platforms/tiktok/post.md") {
  throw new Error(`bad tiktok path: ${paths.relative.platformPosts.tiktok}`);
}
if (!paths.assetPng.startsWith(tempRoot)) {
  throw new Error(`expected override root, got ${paths.assetPng}`);
}

if (!isEngineSlug("valid-engine-slug")) throw new Error("valid slug rejected");
if (isEngineSlug("../bad")) throw new Error("traversal slug accepted");
if (!isProposalId("20260604-030506")) throw new Error("valid proposal id rejected");
if (isProposalId("2026-06-04")) throw new Error("invalid proposal id accepted");
