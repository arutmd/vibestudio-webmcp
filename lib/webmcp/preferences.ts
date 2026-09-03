import type { WebMCPTool } from "./types";

export const WEBMCP_PREFERENCES_KEY = "vibestudio.webmcp-preferences.v1";

export type WebMCPToolName =
  | "selection_read"
  | "session_list"
  | "session_start"
  | "session_connect"
  | "session_read"
  | "inspire_list"
  | "inspire_open"
  | "inspire_react"
  | "inspire_save"
  | "source_follow"
  | "template_context"
  | "carousel_create"
  | "carousel_read"
  | "carousel_update"
  | "carousel_finish"
  | "piece_status"
  | "piece_undo"
  | "schedule_list"
  | "piece_schedule"
  | "template_list"
  | "template_edit";

export type WebMCPCapabilityId = "context" | "sessions" | "inspiration" | "creation" | "schedule" | "templates";

export type WebMCPToolAccess = "read" | "change";

export type WebMCPToolCatalogEntry = {
  name: WebMCPToolName;
  title: string;
  description: string;
  access: WebMCPToolAccess;
};

export type WebMCPCapability = {
  id: WebMCPCapabilityId;
  title: string;
  description: string;
  tools: WebMCPToolCatalogEntry[];
};

export type WebMCPPreferences = {
  enabled: boolean;
  tools: Record<WebMCPToolName, boolean>;
};

export const webmcpCapabilities: WebMCPCapability[] = [
  {
    id: "context",
    title: "Shared context",
    description: "Let the agent understand exactly what you point at and which Template rules apply.",
    tools: [
      { name: "selection_read", title: "Read Talking about", description: "Read selected text, references, pointers, and drawings.", access: "read" },
      { name: "template_context", title: "Read Template context", description: "Read the bounded brand, voice, audience, and visual rules for the current work.", access: "read" },
    ],
  },
  {
    id: "sessions",
    title: "Sessions",
    description: "Find, open, and connect the Codex task to VibeStudio workspaces.",
    tools: [
      { name: "session_list", title: "List Sessions", description: "See recent content Sessions and their stage.", access: "read" },
      { name: "session_read", title: "Read Session", description: "Read the selected Session, version, and connection receipt.", access: "read" },
      { name: "session_start", title: "Start Session", description: "Create a new working Session from a natural-language brief.", access: "change" },
      { name: "session_connect", title: "Connect Session", description: "Join Codex to the selected Session using its bounded receipt.", access: "change" },
    ],
  },
  {
    id: "inspiration",
    title: "Inspiration",
    description: "Browse sources and teach VibeStudio what is useful to your taste.",
    tools: [
      { name: "inspire_list", title: "List inspiration", description: "See the latest items in your multimodal inspiration feed.", access: "read" },
      { name: "inspire_open", title: "Open inspiration", description: "Open one inspiration item in the shared workspace.", access: "change" },
      { name: "inspire_react", title: "React to inspiration", description: "Like or dislike an item so the Template can learn from it.", access: "change" },
      { name: "inspire_save", title: "Save inspiration", description: "Save an item with your reason or note.", access: "change" },
      { name: "source_follow", title: "Follow source", description: "Add a creator, channel, publication, or website to Inspire.", access: "change" },
    ],
  },
  {
    id: "creation",
    title: "Content creation",
    description: "Create and revise carousel Sessions while keeping the reusable Template consistent.",
    tools: [
      { name: "carousel_create", title: "Create carousel", description: "Create a carousel Session from inspiration and a brief.", access: "change" },
      { name: "carousel_read", title: "Read carousel", description: "Read the selected carousel slides and current version.", access: "read" },
      { name: "carousel_update", title: "Update carousel", description: "Change selected slides or fields in the working version.", access: "change" },
      { name: "carousel_finish", title: "Finish carousel", description: "Run the quality gate and mark a carousel ready.", access: "change" },
      { name: "piece_status", title: "Change stage", description: "Move a Session between draft, ready, and scheduled stages.", access: "change" },
      { name: "piece_undo", title: "Undo last change", description: "Restore the previous working version for a Session.", access: "change" },
    ],
  },
  {
    id: "schedule",
    title: "Schedule",
    description: "Review what is ready and place approved work on the content calendar.",
    tools: [
      { name: "schedule_list", title: "Read schedule", description: "See ready, upcoming, and live work.", access: "read" },
      { name: "piece_schedule", title: "Schedule content", description: "Add an approved Session to the calendar.", access: "change" },
    ],
  },
  {
    id: "templates",
    title: "Template Studio",
    description: "Read and evolve the reusable visual system behind every generated output.",
    tools: [
      { name: "template_list", title: "Read Template", description: "Read the current Template rules, versions, and status.", access: "read" },
      { name: "template_edit", title: "Edit Template", description: "Change reusable Template rules in the working version.", access: "change" },
    ],
  },
];

export const webmcpToolNames = webmcpCapabilities.flatMap((capability) => capability.tools.map((tool) => tool.name));

export function createDefaultWebMCPPreferences(): WebMCPPreferences {
  return {
    enabled: true,
    tools: Object.fromEntries(webmcpToolNames.map((name) => [name, true])) as Record<WebMCPToolName, boolean>,
  };
}

export function normalizeWebMCPPreferences(value: unknown): WebMCPPreferences {
  const defaults = createDefaultWebMCPPreferences();
  if (!value || typeof value !== "object") return defaults;
  const candidate = value as { enabled?: unknown; tools?: unknown };
  const storedTools = candidate.tools && typeof candidate.tools === "object"
    ? candidate.tools as Record<string, unknown>
    : {};
  return {
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : defaults.enabled,
    tools: Object.fromEntries(webmcpToolNames.map((name) => [
      name,
      typeof storedTools[name] === "boolean" ? storedTools[name] : defaults.tools[name],
    ])) as Record<WebMCPToolName, boolean>,
  };
}

export function filterWebMCPTools(tools: WebMCPTool[], preferences: WebMCPPreferences): WebMCPTool[] {
  if (!preferences.enabled) return [];
  return tools.filter((tool) => preferences.tools[tool.name as WebMCPToolName] !== false);
}

export function capabilityEnabled(preferences: WebMCPPreferences, capability: WebMCPCapability): boolean {
  return capability.tools.every((tool) => preferences.tools[tool.name]);
}

export function setCapabilityEnabled(
  preferences: WebMCPPreferences,
  capability: WebMCPCapability,
  enabled: boolean,
): WebMCPPreferences {
  const tools = { ...preferences.tools };
  for (const tool of capability.tools) tools[tool.name] = enabled;
  return { ...preferences, tools };
}
