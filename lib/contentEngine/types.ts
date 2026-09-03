import type { InboxRecord, PieceFormat, PieceRecord, PlatformId } from "../types";

export type EngineStage =
  | "not_started"
  | "source"
  | "text"
  | "visual"
  | "render"
  | "qa"
  | "ready"
  | "approved"
  | "rejected"
  | "error";

export type EngineDecision = "pending" | "approved" | "rejected";

export type EngineApproval = {
  decision: EngineDecision;
  decidedAt: string | null;
  reason?: string;
};

export type EngineReviewState = {
  slug: string;
  proposalId: string;
  text: EngineApproval;
  image: EngineApproval;
  updatedAt: string;
};

export type EngineSourceReference = {
  id: string;
  label: string;
  url: string | null;
  localPath: string | null;
  kind?: "source" | "image";
  source?: string;
  width?: number;
  height?: number;
};

export type EngineSourcePack = {
  pieceId: string;
  slug: string;
  title: string;
  hook: string;
  format: PieceFormat;
  platforms: PlatformId[];
  sourceText: string;
  notes: string;
  references: EngineSourceReference[];
  sourceIds: string[];
  facts: string[];
  createdAt: string;
};

export type EnginePlatformVariants = Partial<Record<PlatformId, string>>;

export type EngineTextProposal = {
  title: string;
  hook: string;
  body: string;
  platformVariants: EnginePlatformVariants;
  visualPrompt: string;
  provider: "codex" | "claude" | "fallback";
  fallbackReason?: string;
};

export type EngineVisualTemplateId =
  | "operator_note"
  | "interface_callout"
  | "source_card";

export type EngineVisualTemplate = {
  id: EngineVisualTemplateId;
  label: string;
  background: string;
  panel: string;
  accent: string;
  text: string;
  muted: string;
};

export type EngineVisualSpec = {
  templateId: EngineVisualTemplateId;
  width: number;
  height: number;
  title: string;
  subtitle: string;
  badge: string;
  footer: string;
  prompt: string;
  palette: EngineVisualTemplate;
};

export type EngineImageProvider = "codex-image" | "html-fallback";

export type EngineImageResult = {
  provider: EngineImageProvider;
  path: string;
  prompt: string;
  baseLayerPath?: string;
  referenceLayerPath?: string;
  referenceLayerLabel?: string;
  profileLayerPath?: string;
  profileLayerLabel?: string;
  fallbackReason?: string;
  stdout?: string;
  stderr?: string;
  timedOut?: boolean;
  exitCode?: number | null;
};

export type EngineQaCheck = {
  id: string;
  label: string;
  result: "pass" | "warn" | "fail";
  detail: string;
};

export type EngineQaResult = {
  verdict: "pass" | "warn" | "fail";
  checks: EngineQaCheck[];
  generatedAt: string;
};

export type EngineArtifactPaths = {
  projectRoot: string;
  slug: string;
  proposalId: string;
  pieceDir: string;
  referencesDir: string;
  proposalsDir: string;
  proposalDir: string;
  platformsDir: string;
  sourceMd: string;
  sourceFactsJson: string;
  briefMd: string;
  proposalJson: string;
  textMd: string;
  visualSpecTs: string;
  assetHtml: string;
  assetPng: string;
  qaJson: string;
  notesMd: string;
  reviewStateJson: string;
  platformPosts: Record<PlatformId, string>;
  relative: {
    pieceDir: string;
    proposalDir: string;
    sourceMd: string;
    sourceFactsJson: string;
    briefMd: string;
    proposalJson: string;
    textMd: string;
    visualSpecTs: string;
    assetHtml: string;
    assetPng: string;
    qaJson: string;
    notesMd: string;
    reviewStateJson: string;
    platformPosts: Record<PlatformId, string>;
  };
};

export type EngineRunInput = {
  piece: PieceRecord;
  inboxRecords: InboxRecord[];
  projectRoot?: string;
  proposalId?: string;
  now?: Date;
  buildText?: (source: EngineSourcePack) => Promise<EngineTextProposal>;
  generateImage?: (
    source: EngineSourcePack,
    spec: EngineVisualSpec,
    paths: EngineArtifactPaths,
  ) => Promise<EngineImageResult>;
  renderImage?: (spec: EngineVisualSpec, paths: EngineArtifactPaths) => Promise<void>;
  /** Called at each stage boundary so the caller can persist progress. */
  onStage?: (stage: EngineStage) => Promise<void>;
};

export type EngineRunResult = {
  pieceId: string;
  slug: string;
  proposalId: string;
  stage: EngineStage;
  source: EngineSourcePack;
  text: EngineTextProposal;
  visualSpec: EngineVisualSpec;
  image: EngineImageResult;
  qa: EngineQaResult;
  reviewState: EngineReviewState;
  paths: EngineArtifactPaths;
};
