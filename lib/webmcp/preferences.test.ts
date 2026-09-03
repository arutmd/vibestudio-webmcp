import {
  capabilityEnabled,
  createDefaultWebMCPPreferences,
  filterWebMCPTools,
  normalizeWebMCPPreferences,
  setCapabilityEnabled,
  webmcpCapabilities,
  webmcpToolNames,
} from "./preferences";
import type { WebMCPTool } from "./types";

const uniqueNames = new Set(webmcpToolNames);
if (uniqueNames.size !== 21 || uniqueNames.size !== webmcpToolNames.length) {
  throw new Error(`WebMCP catalog should contain 21 unique tools, received ${uniqueNames.size}`);
}

const defaults = createDefaultWebMCPPreferences();
if (!defaults.enabled || webmcpToolNames.some((name) => !defaults.tools[name])) {
  throw new Error("Existing WebMCP behavior was not preserved by the default preferences");
}

const restored = normalizeWebMCPPreferences({
  enabled: true,
  tools: { template_edit: false, unknown_tool: false },
});
if (restored.tools.template_edit || !restored.tools.selection_read || "unknown_tool" in restored.tools) {
  throw new Error("Stored WebMCP preferences were not safely normalized");
}

const templateCapability = webmcpCapabilities.find((capability) => capability.id === "templates");
if (!templateCapability) throw new Error("Template capability is missing");
const templatesOff = setCapabilityEnabled(defaults, templateCapability, false);
if (capabilityEnabled(templatesOff, templateCapability) || templatesOff.tools.template_list || templatesOff.tools.template_edit) {
  throw new Error("Capability toggle did not update each underlying tool");
}

const sampleTools = ["selection_read", "template_edit"].map((name) => ({
  name,
  title: name,
  description: name,
  inputSchema: {},
  execute: () => null,
})) satisfies WebMCPTool[];

const filtered = filterWebMCPTools(sampleTools, restored).map((tool) => tool.name);
if (filtered.join(",") !== "selection_read") {
  throw new Error(`Disabled tools must disappear from registration, received ${filtered.join(",")}`);
}

if (filterWebMCPTools(sampleTools, { ...defaults, enabled: false }).length !== 0) {
  throw new Error("The master switch did not remove every tool");
}
