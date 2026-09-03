import type { SharedAttentionSelection, SharedAttentionSurface } from "../sharedAttention";

export type ArutleeView = SharedAttentionSurface;

export type ToolExecutionContext = { signal?: AbortSignal };

export type WebMCPTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
    destructiveHint?: boolean;
  };
  execute: (input: unknown, context?: ToolExecutionContext) => Promise<unknown> | unknown;
};

export type ModelContext = {
  registerTool: (
    tool: WebMCPTool,
    options?: { signal?: AbortSignal },
  ) => Promise<unknown> | unknown;
};

export type ToolEnvironment = {
  view: ArutleeView;
  selectedInspirationId: string | null;
  selectedPieceId: string | null;
  attentionSelections?: SharedAttentionSelection[];
  getAttentionSelections?: () => SharedAttentionSelection[];
  fetcher?: typeof fetch;
  dispatch?: (detail: Record<string, unknown>) => void;
};
