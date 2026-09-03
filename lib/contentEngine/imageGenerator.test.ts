import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildHeroTextOverlay,
  buildHeroTags,
  buildHeroImageCodexPrompt,
  buildReferenceCompositeHtml,
  generateHeroImage,
  pickProfileImage,
  pickSourceReferenceImage,
} from "./imageGenerator";
import type {
  EngineArtifactPaths,
  EngineSourcePack,
  EngineVisualSpec,
} from "./types";

const source: EngineSourcePack = {
  pieceId: "field-note-20260604-001",
  slug: "demo",
  title: "Voice AI as an action layer",
  hook: "A field note about voice becoming a real interface.",
  format: "field_note",
  platforms: ["linkedin", "facebook"],
  sourceText: "A local Codex workflow can turn one selected intake item into a complete post package.",
  notes: "",
  references: [],
  sourceIds: [],
  facts: [],
  createdAt: "2026-06-04T10:00:00+07:00",
};

const spec: EngineVisualSpec = {
  templateId: "interface_callout",
  width: 1080,
  height: 1350,
  title: "Voice AI as an action layer",
  subtitle: "The interface is no longer just a chat box.",
  badge: "field note",
  footer: "linkedin / facebook",
  prompt: "A realistic editorial hero showing a founder desk, voice waveform, and agent workflow UI.",
  palette: {
    id: "interface_callout",
    label: "Interface callout",
    background: "#eef3f1",
    panel: "#18332d",
    accent: "#e46f3d",
    text: "#fbfbf7",
    muted: "#c2d2cb",
  },
};

function pngStub(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(4096, 0);
  Buffer.from("89504e470d0a1a0a", "hex").copy(buffer, 0);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function pathsFor(root: string): EngineArtifactPaths {
  const proposalDir = path.join(root, "pieces", source.slug, "proposals", "20260604-100000");
  const assetPng = path.join(proposalDir, "asset.png");
  const assetHtml = path.join(proposalDir, "asset.html");
  return {
    projectRoot: root,
    slug: source.slug,
    proposalId: "20260604-100000",
    pieceDir: path.join(root, "pieces", source.slug),
    referencesDir: path.join(root, "pieces", source.slug, "references"),
    proposalsDir: path.join(root, "pieces", source.slug, "proposals"),
    proposalDir,
    platformsDir: path.join(proposalDir, "platforms"),
    sourceMd: path.join(root, "pieces", source.slug, "source.md"),
    sourceFactsJson: path.join(root, "pieces", source.slug, "source-facts.json"),
    briefMd: path.join(proposalDir, "brief.md"),
    proposalJson: path.join(proposalDir, "proposal.json"),
    textMd: path.join(proposalDir, "text.md"),
    visualSpecTs: path.join(proposalDir, "visual-spec.ts"),
    assetHtml,
    assetPng,
    qaJson: path.join(proposalDir, "qa.json"),
    notesMd: path.join(proposalDir, "notes.md"),
    reviewStateJson: path.join(root, "pieces", source.slug, "review-state.json"),
    platformPosts: {
      linkedin: path.join(proposalDir, "platforms", "linkedin", "post.md"),
      facebook: path.join(proposalDir, "platforms", "facebook", "post.md"),
      instagram: path.join(proposalDir, "platforms", "instagram", "post.md"),
      threads: path.join(proposalDir, "platforms", "threads", "post.md"),
      tiktok: path.join(proposalDir, "platforms", "tiktok", "post.md"),
      youtube: path.join(proposalDir, "platforms", "youtube", "post.md"),
    },
    relative: {
      pieceDir: "pieces/demo",
      proposalDir: "pieces/demo/proposals/20260604-100000",
      sourceMd: "pieces/demo/source.md",
      sourceFactsJson: "pieces/demo/source-facts.json",
      briefMd: "pieces/demo/proposals/20260604-100000/brief.md",
      proposalJson: "pieces/demo/proposals/20260604-100000/proposal.json",
      textMd: "pieces/demo/proposals/20260604-100000/text.md",
      visualSpecTs: "pieces/demo/proposals/20260604-100000/visual-spec.ts",
      assetHtml: "pieces/demo/proposals/20260604-100000/asset.html",
      assetPng: "pieces/demo/proposals/20260604-100000/asset.png",
      qaJson: "pieces/demo/proposals/20260604-100000/qa.json",
      notesMd: "pieces/demo/proposals/20260604-100000/notes.md",
      reviewStateJson: "pieces/demo/review-state.json",
      platformPosts: {
        linkedin: "pieces/demo/proposals/20260604-100000/platforms/linkedin/post.md",
        facebook: "pieces/demo/proposals/20260604-100000/platforms/facebook/post.md",
        instagram: "pieces/demo/proposals/20260604-100000/platforms/instagram/post.md",
        threads: "pieces/demo/proposals/20260604-100000/platforms/threads/post.md",
        tiktok: "pieces/demo/proposals/20260604-100000/platforms/tiktok/post.md",
        youtube: "pieces/demo/proposals/20260604-100000/platforms/youtube/post.md",
      },
    },
  };
}

async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "arutlee-imagegen-"));
  const paths = pathsFor(root);
  const referenceFile = path.join(root, "ingredients", "demo", "reference.png");
  const highReferenceFile = path.join(root, "ingredients", "demo", "high-openai-reference.png");
  const profileFile = path.join(root, "Profile-Image", "image5.png");
  await fs.mkdir(path.dirname(referenceFile), { recursive: true });
  await fs.mkdir(path.dirname(profileFile), { recursive: true });
  await fs.writeFile(referenceFile, pngStub(480, 360));
  await fs.writeFile(highReferenceFile, pngStub(1600, 900));
  await fs.writeFile(profileFile, Buffer.alloc(4096, 9));
  const prompt = buildHeroImageCodexPrompt({ source, spec, outputPath: paths.assetPng });

  if (!prompt.includes("USE the image_generation tool")) {
    throw new Error("prompt does not require image_generation");
  }
  if (!prompt.includes(paths.assetPng)) {
    throw new Error("prompt does not include exact output path");
  }
  if (!prompt.includes("NO Thai text") || !prompt.includes("lower 42%")) {
    throw new Error("prompt lost Vein-style text-free overlay discipline");
  }
  if (!prompt.includes("top-left corner calm for one or two topic tags")) {
    throw new Error("prompt should reserve top-left space for topic tags");
  }
  if (!prompt.includes("lower-right corner calm for Palm's profile signature avatar")) {
    throw new Error("prompt should reserve lower-right space for profile signature");
  }
  if (prompt.includes("top-right corner calm for a profile avatar")) {
    throw new Error("prompt should not reserve the old top-right profile slot");
  }

  let normalized = false;
  let compositedReference = "";
  const sourceWithReference: EngineSourcePack = {
    ...source,
    references: [
      {
        id: "ref-001",
        label: "Real topic reference",
        url: null,
        localPath: "ingredients/demo/reference.png",
        kind: "image",
      },
    ],
  };
  const picked = await pickSourceReferenceImage(sourceWithReference, root);
  if (picked?.relativePath !== "ingredients/demo/high-openai-reference.png") {
    throw new Error(`did not pick the best local source reference image: ${picked?.relativePath}`);
  }
  if (picked.width !== 1600 || picked.height !== 900) {
    throw new Error("picked reference image did not record usable dimensions");
  }
  const tinyReferenceFile = path.join(root, "ingredients", "tiny", "tiny.png");
  await fs.mkdir(path.dirname(tinyReferenceFile), { recursive: true });
  await fs.writeFile(tinyReferenceFile, pngStub(480, 360));
  const poorOnly = await pickSourceReferenceImage(
    {
      ...source,
      references: [
        {
          id: "tiny-ref",
          label: "Low-resolution topic thumbnail",
          url: null,
          localPath: "ingredients/tiny/tiny.png",
          kind: "image",
        },
      ],
    },
    root,
  );
  if (poorOnly) {
    throw new Error("low-resolution reference images should be skipped");
  }
  const openAiTags = buildHeroTags({
    ...sourceWithReference,
    title: "GPT-Realtime-2 field note",
    hook: "OpenAI voice agents are becoming an action layer.",
    sourceText: "OpenAI Build Hour covered GPT-Realtime-2, Codex, tool calling, and voice AI.",
  });
  if (openAiTags.join("|") !== "OpenAI|GPT-Realtime-2") {
    throw new Error(`bad hero tags: ${openAiTags.join("|")}`);
  }
  const incidentalHealthTags = buildHeroTags({
    ...sourceWithReference,
    title: "Voice as an action layer",
    hook: "OpenAI voice agents are operating tools and workflows.",
    facts: ["Parallel tool calling and preamble patterns matter for voice UX."],
    sourceText:
      "The transcript briefly mentioned healthcare vocabulary as one production example, but the post is about OpenAI voice AI.",
  });
  if (incidentalHealthTags.join("|") !== "OpenAI|Voice AI") {
    throw new Error(`incidental source mention hijacked tags: ${incidentalHealthTags.join("|")}`);
  }
  const claudeFableTags = buildHeroTags({
    ...sourceWithReference,
    title: "Claude Fable 5 and Claude Mythos 5",
    hook: "Anthropic released Claude Fable 5 with fallback handling for risky requests.",
    facts: ["Fable 5 can fall back to Claude Opus 4.8 for sensitive request classes."],
    sourceText:
      "Anthropic released Claude Fable 5. The long source text also mentions OpenAI in passing as market context.",
  });
  if (claudeFableTags.join("|") !== "Anthropic|Claude Fable 5") {
    throw new Error(`incidental company mention hijacked Claude tags: ${claudeFableTags.join("|")}`);
  }
  if (buildHeroTags(sourceWithReference).includes("AI-generated")) {
    throw new Error("hero tags should describe the topic, not the image-generation method");
  }
  const overlay = buildHeroTextOverlay({
    ...sourceWithReference,
    title: "Voice as an action layer",
    hook: "OpenAI เปิดตัว GPT-Realtime-2 voice model for tool-calling agents.",
    sourceText:
      "OpenAI เปิดตัว GPT-Realtime-2 โมเดลเสียงใหม่ที่เรียก tool พร้อมกัน คุยต่อเนื่องได้นานขึ้น และมี preamble ระหว่าง tool call.",
  });
  if (overlay.headline.join("|") !== "OpenAI เปิดตัว|GPT-Realtime-2") {
    throw new Error(`bad hero headline: ${overlay.headline.join("|")}`);
  }
  if (
    overlay.dek !==
    "Voice AI เริ่มสั่งงานได้จริง: โมเดลเสียงใหม่เรียก tool พร้อมกัน คุยต่อเนื่องได้นานขึ้น"
  ) {
    throw new Error(`bad hero dek: ${overlay.dek}`);
  }
  const claudeFableOverlay = buildHeroTextOverlay({
    ...sourceWithReference,
    title: "Claude Fable 5 and Claude Mythos 5",
    hook: "Anthropic released Claude Fable 5 with fallback handling for risky requests.",
    facts: ["Fable 5 can fall back to Claude Opus 4.8 for sensitive request classes."],
    sourceText:
      "Anthropic released Claude Fable 5. The long source text also mentions OpenAI in passing as market context.",
  });
  if (claudeFableOverlay.headline.join("|") !== "Claude Fable 5|AI ที่พร้อมทำงานจริง") {
    throw new Error(`bad Claude Fable hero headline: ${claudeFableOverlay.headline.join("|")}`);
  }
  if (!claudeFableOverlay.dek?.includes("workflow ยุค agentic AI")) {
    throw new Error(`bad Claude Fable hero dek: ${claudeFableOverlay.dek}`);
  }
  const codexSitesOverlay = buildHeroTextOverlay({
    ...sourceWithReference,
    title: "Codex Sites: build app แล้วได้ URL เลย แต่มี catch",
    hook: "ลอง @Sites แล้วให้มันทำ internal app กลับมาเป็น production URL ได้เลย แต่ตอนนี้ยังติด Business/Enterprise เท่านั้น",
    sourceText:
      "OpenAI เพิ่ม plugin ใหม่ชื่อ Sites เข้า Codex เมื่อ 2 มิถุนา 2026. ไม่มี staging by default และยังรองรับเฉพาะ ChatGPT Business / Enterprise.",
  });
  if (codexSitesOverlay.headline.join("|") !== "Codex Sites|build app ได้ URL") {
    throw new Error(`bad Codex Sites headline: ${codexSitesOverlay.headline.join("|")}`);
  }
  if (
    codexSitesOverlay.dek !==
    "ได้ production URL ทันที แต่ยังต้องระวัง Business/Enterprise และไม่มี staging"
  ) {
    throw new Error(`bad Codex Sites dek: ${codexSitesOverlay.dek}`);
  }
  const airbnbOverlay = buildHeroTextOverlay({
    ...sourceWithReference,
    title: "220 features ออกมา ผมเหลือ 3 อย่างที่ต้องดู",
    hook: "Airbnb ประกาศ 220 features มาในคืนเดียว ผมนั่ง read transcript ทั้งหมดแล้วมี 3 อย่างที่น่าสนใจจริง ๆ ที่เหลือเป็น noise ล้วน ๆ",
    sourceText: "Airbnb Summer Release announced AI listing setup, trip services, and boutique hotels.",
  });
  if (airbnbOverlay.headline.length !== 2) {
    throw new Error(`long generic title should not duplicate headline lines: ${airbnbOverlay.headline.join("|")}`);
  }
  if (airbnbOverlay.headline.join("|") !== "220 features ออกมา|ผมเหลือ 3 อย่างที่ต้องดู") {
    throw new Error(`generic title should split cleanly: ${airbnbOverlay.headline.join("|")}`);
  }
  if (airbnbOverlay.dek) {
    throw new Error(`generic overlay should not invent an awkward dek: ${airbnbOverlay.dek}`);
  }
  const html = buildReferenceCompositeHtml({
    spec,
    baseImagePath: paths.assetPng,
    referenceImagePath: referenceFile,
    referenceLabel: "Real topic reference",
    profileImagePath: profileFile,
    profileLabel: "Arutlee profile image",
    tags: openAiTags,
    textOverlay: overlay,
  });
  if (!html.includes("OpenAI") || !html.includes("GPT-Realtime-2")) {
    throw new Error("composite HTML did not render topic tags");
  }
  if (!html.includes("min-height: 64px;") || !html.includes("font-size: 32px;")) {
    throw new Error("topic tags should scale with the larger hero typography");
  }
  if (!html.includes("font-size: 78px;") || !html.includes("font-size: 34px;")) {
    throw new Error("hero overlay should use bounded typography");
  }
  if (
    !html.includes("OpenAI เปิดตัว") ||
    !html.includes("GPT-Realtime-2") ||
    !html.includes("Voice AI เริ่มสั่งงานได้จริง: โมเดลเสียงใหม่เรียก tool พร้อมกัน คุยต่อเนื่องได้นานขึ้น")
  ) {
    throw new Error("composite HTML did not render editable headline and dek text");
  }
  if (!html.includes('class="headline-line"') || !html.includes('class="dek"')) {
    throw new Error("composite HTML should expose editable text overlay classes");
  }
  if (html.includes(">Arutlee<")) {
    throw new Error("composite HTML should not render Arutlee as a tag");
  }
  if (!html.includes("right: 30px;") || !html.includes("bottom: 72px;")) {
    throw new Error("profile image should be positioned as a lower-right signature");
  }
  if (
    !html.includes("width: 165px;") ||
    !html.includes("left: -8px;") ||
    !html.includes("top: -1px;")
  ) {
    throw new Error("profile image should zoom image5 in by about 10% with the face centered");
  }
  if (
    !html.includes("top: 760px;") ||
    !html.includes("width: 930px;") ||
    !html.includes("font-size: 78px;") ||
    !html.includes("line-height: 1.08;") ||
    !html.includes("margin-top: 24px;") ||
    !html.includes("font-size: 34px;") ||
    !html.includes("font-weight: 430;")
  ) {
    throw new Error("headline overlay should use bounded typography and stay inside the frame");
  }
  if (!html.includes('"Söhne"') || !html.includes('"OpenAI Sans"')) {
    throw new Error("headline overlay should prefer an OpenAI-like font stack when available");
  }
  if (!html.includes("left: 168px;") || !html.includes("top: 390px;")) {
    throw new Error("reference image should sit nearer the middle of the hero");
  }
  const profile = await pickProfileImage(root);
  if (profile?.relativePath !== "Profile-Image/image5.png") {
    throw new Error("did not pick local profile image");
  }

  const generated = await generateHeroImage(sourceWithReference, spec, paths, {
    normalizeImage: async (_file, width, height) => {
      if (width !== 1080 || height !== 1350) {
        throw new Error(`bad normalize target ${width}x${height}`);
      }
      normalized = true;
    },
    composeReferenceLayer: async ({ reference, profile }) => {
      compositedReference = reference?.relativePath ?? "";
      return {
        baseLayerPath: "pieces/demo/proposals/20260604-100000/asset-base.png",
        referenceLayerPath: reference?.relativePath,
        referenceLayerLabel: reference?.label,
        profileLayerPath: profile?.relativePath,
        profileLayerLabel: profile?.label,
      };
    },
    runCodexImage: async ({ outputPath }) => {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, Buffer.alloc(4096, 2));
      return {
        path: paths.relative.assetPng,
        prompt: "imagegen prompt",
        stdout: "",
        stderr: "",
        timedOut: false,
        exitCode: 0,
      };
    },
    renderFallback: async () => {
      throw new Error("fallback should not run after successful imagegen");
    },
  });
  if (generated.provider !== "codex-image") throw new Error("imagegen provider not recorded");
  if (!normalized) throw new Error("imagegen output was not normalized");
  if (generated.referenceLayerPath !== "ingredients/demo/high-openai-reference.png") {
    throw new Error("reference layer was not recorded");
  }
  if (generated.profileLayerPath !== "Profile-Image/image5.png") {
    throw new Error("profile layer was not recorded");
  }
  if (compositedReference !== "ingredients/demo/high-openai-reference.png") {
    throw new Error("reference compositor did not run");
  }

  await fs.rm(paths.assetPng, { force: true });
  const fallback = await generateHeroImage(source, spec, paths, {
    runCodexImage: async () => ({
      path: null,
      prompt: "imagegen prompt",
      stdout: "",
      stderr: "no generated image",
      timedOut: false,
      exitCode: 1,
    }),
    renderFallback: async (_spec, fallbackPaths) => {
      await fs.mkdir(fallbackPaths.proposalDir, { recursive: true });
      await fs.writeFile(fallbackPaths.assetPng, Buffer.alloc(4096, 3));
      await fs.writeFile(fallbackPaths.assetHtml, "<html></html>", "utf8");
    },
  });
  if (fallback.provider !== "html-fallback") throw new Error("fallback provider not recorded");
  if (!fallback.fallbackReason?.includes("Codex imagegen did not produce")) {
    throw new Error("fallback reason not useful");
  }

  await fs.rm(root, { recursive: true, force: true });
}

main().catch((err) => {
  throw err;
});
