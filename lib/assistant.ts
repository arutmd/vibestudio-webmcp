import { callClaude, resolveEngine, safeJSON, type Engine } from "./claude";
import { summarizePostQuality } from "./postQuality";
import { assessCaptureSource } from "./sourceQuality";
import type { InboxRecord, PieceRecord, PlatformId } from "./types";

export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantContext = {
  mode: "intake" | "workbench" | "desk";
  selectedPiece: PieceRecord | null;
  sourceRecords: InboxRecord[];
  status?: unknown;
};

export type AssistantPatch = Partial<
  Pick<
    PieceRecord,
    | "body"
    | "platform_variants"
    | "visual_prompt"
    | "cover_headline"
    | "cover_subheadline"
    | "cover_badge"
    | "notes"
  >
>;

export type AssistantAction =
  | {
      id: string;
      kind: "patch_piece";
      label: string;
      reason?: string;
      patch: AssistantPatch;
    }
  | {
      id: string;
      kind: "run_tool";
      label: string;
      reason?: string;
      tool: "draft" | "platform_pack" | "visual_prompt" | "audit";
    };

export type AssistantChatResponse = {
  reply: string;
  actions: AssistantAction[];
  engine: {
    provider: "claude" | "fallback";
    engine: Engine;
    daemon: boolean;
  };
};

export type AssistantChatInput = {
  message: string;
  history?: AssistantMessage[];
  context: AssistantContext;
};

type RawAssistantResponse = {
  reply?: unknown;
  actions?: unknown;
};

const PLATFORM_IDS: PlatformId[] = [
  "linkedin",
  "facebook",
  "instagram",
  "threads",
  "tiktok",
  "youtube",
];

const SYSTEM = `You are VibeStudio's floating operator assistant.

You help Palm produce consistent social posts from the current Studio screen, selected topic/tile/post, and visible intake captures.

Rules:
- Be concise, practical, and context-aware.
- Never say you changed the dashboard or saved a file. You can only propose actions.
- Prefer one or two high-value actions over many options.
- If text should change, return a patch_piece action. The UI will show an Apply button.
- If an existing Studio tool should run, return a run_tool action.
- Do not invent facts. If the source context is thin, say what is missing.
- If Palm names a visible intake capture, inspect the provided source records before saying you cannot see it.
- When a source is thin, do not add speaker names, feature examples, or content details unless they appear in the provided source records.
- Preserve Palm's style: grounded, specific, code-switched Thai/English when useful, not corporate.
- For image work, prefer text-free base image prompts and local overlay discipline.
- Be explicit about workflow limits: Ideate does not fetch a new transcript or run new research. Fetch is the enrichment step; Ideate uses the stored ingredient packet.

Return ONLY JSON:
{
  "reply": "short assistant response",
  "actions": [
    {
      "kind": "patch_piece",
      "label": "Apply revised LinkedIn copy",
      "reason": "why this helps",
      "patch": {
        "platform_variants": { "linkedin": "new text" }
      }
    },
    {
      "kind": "run_tool",
      "label": "Run quality check",
      "tool": "audit"
    }
  ]
}

Allowed patch fields:
- body
- platform_variants.linkedin/facebook/instagram/threads/tiktok/youtube
- visual_prompt
- cover_headline
- cover_subheadline
- cover_badge
- notes

Allowed tools:
- draft
- platform_pack
- visual_prompt
- audit`;

const WORKFLOW_FACTS = {
  fetch:
    "Fetch ingests a new user input from the Intake box. For URLs it attempts source extraction; for YouTube it attempts timed-text transcript extraction, then light research and image candidates. It stores those as an ingredient packet.",
  deepen:
    "Deepen source retries enrichment for an existing capture row and rewrites its ingredient packet. If YouTube still has no usable transcript, the capture remains locked and Palm should paste a full transcript or stronger source material into Fetch.",
  ideate:
    "Ideate opens platform selection and creates idea candidates from the stored capture raw text, ingredient packet, selected platforms, and topic hints. It does not fetch a new transcript or do another research pass. Thin URL/news sources are blocked before Ideate.",
  draft:
    "Draft writes the selected piece body from the stored source records or notes. It does not enrich missing source material.",
  sourceCoverage:
    "Use source_text_kind and source_text_chars to judge readiness. A YouTube capture with only a few hundred source characters is thin and likely missing the full transcript.",
};

export async function assistantChat(
  input: AssistantChatInput,
  opts: { daemon?: boolean } = {},
): Promise<AssistantChatResponse> {
  const engine = await resolveEngine();
  if (engine.engine === "none") {
    return fallbackAssistant(input, engine.engine, opts.daemon ?? false);
  }

  const prompt = buildPrompt(input);
  try {
    const text = await callClaude({
      system: SYSTEM,
      cacheSystem: true,
      messages: [{ role: "user", content: prompt }],
      maxTokens: 2200,
    });
    const parsed = safeJSON<RawAssistantResponse>(text, {});
    return {
      reply: cleanReply(parsed.reply) || fallbackReply(input),
      actions: sanitizeActions(parsed.actions, input.context.selectedPiece),
      engine: {
        provider: "claude",
        engine: engine.engine,
        daemon: opts.daemon ?? false,
      },
    };
  } catch (error) {
    const fallback = fallbackAssistant(input, engine.engine, opts.daemon ?? false);
    return {
      ...fallback,
      reply: `${fallback.reply}\n\nAssistant engine failed: ${(error as Error).message.slice(0, 180)}`,
    };
  }
}

function buildPrompt(input: AssistantChatInput): string {
  const piece = input.context.selectedPiece;
  const quality = piece ? summarizePostQuality(piece) : null;
  const safeContext = {
    mode: input.context.mode,
    workflowFacts: WORKFLOW_FACTS,
    selectedPiece: piece
      ? {
          id: piece.id,
          status: piece.status,
          format: piece.format,
          title: piece.title,
          hook: piece.hook,
          platforms: piece.platforms,
          lead_platform: piece.lead_platform,
          body: piece.body ?? "",
          platform_variants: piece.platform_variants ?? {},
          visual_prompt: piece.visual_prompt ?? "",
          hero_image_path: piece.hero_image_path ?? "",
          cover_background_path: piece.cover_background_path ?? "",
          cover_headline: piece.cover_headline ?? "",
          cover_subheadline: piece.cover_subheadline ?? "",
          scheduled_for: piece.scheduled_for ?? "",
          notes: piece.notes ?? "",
          quality,
        }
      : null,
    visibleOrSelectedSources: input.context.sourceRecords.slice(0, 8).map((record) => ({
      id: record.id,
      source: record.source,
      title: record.ingredients?.source_title ?? "",
      captured_at: record.captured_at,
      url: record.url ?? "",
      ingredient_folder: record.enrichment_path ?? "",
      source_text_kind: record.ingredients?.source_text_kind ?? "unknown",
      source_text_chars:
        record.ingredients?.source_text_chars ??
        record.ingredients?.source_text?.length ??
        0,
      source_readiness: assessCaptureSource(record),
      summary: record.ingredients?.summary ?? record.ingredients?.research_summary ?? "",
      key_claims: record.ingredients?.key_claims ?? [],
      research_sources: record.ingredients?.research_sources?.length ?? 0,
      image_candidates: record.ingredients?.image_candidates?.length ?? 0,
      notes: record.notes ?? "",
      raw_excerpt: record.raw.slice(0, 1600),
    })),
    recentHistory: (input.history ?? []).slice(-8),
  };

  return [
    "Current dashboard context:",
    JSON.stringify(safeContext, null, 2),
    "",
    "Palm asks:",
    input.message,
  ].join("\n");
}

function fallbackAssistant(
  input: AssistantChatInput,
  engine: Engine,
  daemon: boolean,
): AssistantChatResponse {
  const piece = input.context.selectedPiece;
  const actions: AssistantAction[] = [];
  if (piece?.body?.trim()) {
    actions.push({
      id: "fallback-platform-pack",
      kind: "run_tool",
      label: "Generate platform text",
      tool: "platform_pack",
      reason: "This post already has a body, so the next useful step is platform copy.",
    });
  } else if (piece) {
    actions.push({
      id: "fallback-draft",
      kind: "run_tool",
      label: "Draft the post",
      tool: "draft",
      reason: "This tile needs base text before platform work.",
    });
  }
  if (piece && !piece.visual_prompt) {
    actions.push({
      id: "fallback-visual",
      kind: "run_tool",
      label: "Create image prompt",
      tool: "visual_prompt",
      reason: "A good hero image starts with a clean visual direction.",
    });
  }

  return {
    reply: fallbackReply(input),
    actions: actions.slice(0, 2),
    engine: { provider: "fallback", engine, daemon },
  };
}

function fallbackReply(input: AssistantChatInput): string {
  const piece = input.context.selectedPiece;
  if (!piece) {
    return "I can help once you select a topic tile or post. For now, capture a topic in Intake or pick an existing piece.";
  }
  const quality = summarizePostQuality(piece);
  return `I see "${piece.title || piece.hook || piece.id}". Current state: ${piece.status}. ${quality.label}: ${quality.detail}.`;
}

function cleanReply(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 2400);
}

function sanitizeActions(value: unknown, piece: PieceRecord | null): AssistantAction[] {
  if (!Array.isArray(value)) return [];
  const actions: AssistantAction[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const kind = raw.kind;
    const label =
      typeof raw.label === "string" && raw.label.trim()
        ? raw.label.trim().slice(0, 80)
        : "";
    const reason =
      typeof raw.reason === "string" && raw.reason.trim()
        ? raw.reason.trim().slice(0, 240)
        : undefined;
    if (!label) continue;

    if (kind === "patch_piece") {
      if (!piece) continue;
      const patch = sanitizePatch(raw.patch);
      if (!Object.keys(patch).length) continue;
      actions.push({
        id: `patch-${actions.length + 1}`,
        kind: "patch_piece",
        label,
        reason,
        patch,
      });
    }

    if (kind === "run_tool") {
      const tool = raw.tool;
      if (
        tool === "draft" ||
        tool === "platform_pack" ||
        tool === "visual_prompt" ||
        tool === "audit"
      ) {
        actions.push({
          id: `tool-${actions.length + 1}`,
          kind: "run_tool",
          label,
          reason,
          tool,
        });
      }
    }

    if (actions.length >= 3) break;
  }
  return actions;
}

function sanitizePatch(value: unknown): AssistantPatch {
  if (!value || typeof value !== "object") return {};
  const raw = value as Record<string, unknown>;
  const patch: AssistantPatch = {};

  if (typeof raw.body === "string") patch.body = raw.body.slice(0, 12_000);
  if (typeof raw.visual_prompt === "string") {
    patch.visual_prompt = raw.visual_prompt.slice(0, 5_000);
  }
  if (typeof raw.cover_headline === "string") {
    patch.cover_headline = raw.cover_headline.slice(0, 140);
  }
  if (typeof raw.cover_subheadline === "string") {
    patch.cover_subheadline = raw.cover_subheadline.slice(0, 220);
  }
  if (typeof raw.cover_badge === "string") {
    patch.cover_badge = raw.cover_badge.slice(0, 40);
  }
  if (typeof raw.notes === "string") patch.notes = raw.notes.slice(0, 5_000);

  if (raw.platform_variants && typeof raw.platform_variants === "object") {
    const variants: Partial<Record<PlatformId, string>> = {};
    const rawVariants = raw.platform_variants as Record<string, unknown>;
    for (const platform of PLATFORM_IDS) {
      const text = rawVariants[platform];
      if (typeof text === "string") variants[platform] = text.slice(0, 8_000);
    }
    if (Object.keys(variants).length) patch.platform_variants = variants;
  }

  return patch;
}
