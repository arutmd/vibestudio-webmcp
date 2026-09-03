import { buildPlatformVariants, buildQaResult } from "./platformPack";
import type { EngineSourcePack, EngineTextProposal, EngineVisualSpec } from "./types";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const source: EngineSourcePack = {
  pieceId: "field-note-20260604-001",
  slug: "demo",
  title: "Demo",
  hook: "Hook",
  format: "field_note",
  platforms: ["linkedin"],
  sourceText: "This is enough source context to pass the basic grounding check.",
  notes: "",
  references: [],
  sourceIds: [],
  facts: [],
  createdAt: "2026-06-04T10:00:00+07:00",
};
const proposal: EngineTextProposal = {
  title: "Demo",
  hook: "Hook",
  body: "A body that can be transformed into a platform post.",
  platformVariants: { linkedin: "LinkedIn version" },
  visualPrompt: "A specific visual brief for the generated card image.",
  provider: "fallback",
};
const variants = buildPlatformVariants(source, proposal);
if (variants.linkedin !== "LinkedIn version") throw new Error("bad variant");

const spec: EngineVisualSpec = {
  templateId: "operator_note",
  width: 1080,
  height: 1350,
  title: "Demo",
  subtitle: "Subtitle",
  badge: "field note",
  footer: "linkedin",
  prompt: proposal.visualPrompt,
  palette: {
    id: "operator_note",
    label: "Operator note",
    background: "#fff",
    panel: "#111",
    accent: "#1b8f6a",
    text: "#fff",
    muted: "#aaa",
  },
};

async function main() {
  const qa = await buildQaResult({
    source,
    proposal,
    visualSpec: spec,
    assetPath: "/tmp/not-real-arutlee-engine.png",
    at: "2026-06-04T10:00:00+07:00",
  });
  if (qa.verdict !== "fail") throw new Error("missing image should fail QA");

  const root = await fs.mkdtemp(path.join(os.tmpdir(), "arutlee-qa-"));
  const assetPath = path.join(root, "asset.png");
  const png = Buffer.alloc(2048);
  Buffer.from("89504e470d0a1a0a", "hex").copy(png, 0);
  png.writeUInt32BE(1080, 16);
  png.writeUInt32BE(1350, 20);
  await fs.writeFile(assetPath, png);
  const referenceQa = await buildQaResult({
    source: {
      ...source,
      references: [
        {
          id: "image-001",
          label: "Real source image",
          url: null,
          localPath: "ingredients/source.png",
          kind: "image",
        },
      ],
    },
    proposal,
    visualSpec: spec,
    image: {
      provider: "codex-image",
      path: "pieces/demo/proposals/20260604-100000/asset.png",
      prompt: "prompt",
      referenceLayerPath: "ingredients/source.png",
      referenceLayerLabel: "Real source image",
      profileLayerPath: "Profile-Image/image5.png",
      profileLayerLabel: "Arutlee profile image",
    },
    assetPath,
    at: "2026-06-04T10:00:00+07:00",
  });
  const referenceCheck = referenceQa.checks.find((check) => check.id === "reference-layer");
  if (referenceCheck?.result !== "pass") {
    throw new Error("layered source reference should pass QA");
  }
  const profileCheck = referenceQa.checks.find((check) => check.id === "profile-layer");
  if (profileCheck?.result !== "pass") {
    throw new Error("layered profile image should pass QA");
  }
  await fs.rm(root, { recursive: true, force: true });
}

main().catch((err) => {
  throw err;
});
