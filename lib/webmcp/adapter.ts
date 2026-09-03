import type { ModelContext, WebMCPTool } from "./types";

type ContextHost = { modelContext?: unknown } | null | undefined;

function isModelContext(value: unknown): value is ModelContext {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { registerTool?: unknown }).registerTool === "function",
  );
}

export function detectModelContext(
  documentHost: ContextHost,
  navigatorHost?: ContextHost,
): { context: ModelContext | null; source: "document" | "legacy-navigator" | "unavailable" } {
  if (isModelContext(documentHost?.modelContext)) {
    return { context: documentHost.modelContext, source: "document" };
  }
  if (isModelContext(navigatorHost?.modelContext)) {
    return { context: navigatorHost.modelContext, source: "legacy-navigator" };
  }
  return { context: null, source: "unavailable" };
}

export async function registerContextualTools(
  context: ModelContext,
  tools: WebMCPTool[],
  controller = new AbortController(),
): Promise<AbortController> {
  for (const tool of tools) {
    await context.registerTool(tool, { signal: controller.signal });
  }
  return controller;
}

export function boundedText(value: unknown, limit = 1_500): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length <= limit ? text : `${text.slice(0, limit - 18)}… [truncated]`;
}

export function toolText(value: unknown): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: boundedText(value) }] };
}
