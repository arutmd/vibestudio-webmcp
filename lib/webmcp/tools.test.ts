import { boundedText, detectModelContext } from "./adapter";
import { assertBoundedToolResult, createToolDefinitions, toolNames } from "./tools";
import type { ModelContext } from "./types";

async function main(): Promise<void> {

const noopFetch = (async () => new Response(JSON.stringify({ records: [] }), {
  status: 200,
  headers: { "Content-Type": "application/json" },
})) as typeof fetch;

const inspire = createToolDefinitions({
  view: "inspire",
  selectedInspirationId: "inspiration-20260831-001",
  selectedPieceId: null,
  fetcher: noopFetch,
});
const piece = createToolDefinitions({
  view: "piece",
  selectedInspirationId: null,
  selectedPieceId: "field-note-20260831-001",
  fetcher: noopFetch,
});
const template = createToolDefinitions({
  view: "template",
  selectedInspirationId: null,
  selectedPieceId: null,
  fetcher: noopFetch,
});
const schedule = createToolDefinitions({
  view: "schedule",
  selectedInspirationId: null,
  selectedPieceId: null,
  fetcher: noopFetch,
});

const inspireNames = toolNames(inspire);
if (inspireNames.join(",") !== "selection_read,session_list,session_start,session_connect,session_read,inspire_list,inspire_open,inspire_react,inspire_save,source_follow,template_context,carousel_create") {
  throw new Error(`unexpected Inspire tools: ${inspireNames.join(",")}`);
}
const pieceNames = toolNames(piece);
if (pieceNames.join(",") !== "selection_read,session_list,session_start,session_connect,session_read,carousel_read,template_context,carousel_update,carousel_finish,piece_status,piece_undo") {
  throw new Error(`unexpected Piece tools: ${pieceNames.join(",")}`);
}
if (toolNames(template).join(",") !== "selection_read,session_list,session_start,session_connect,session_read,template_list,template_edit") {
  throw new Error("Template tool set is not contextual");
}
if (toolNames(schedule).join(",") !== "selection_read,session_list,session_start,session_connect,session_read,schedule_list,piece_schedule") {
  throw new Error("Schedule tool set is not contextual");
}
if ([...inspireNames, ...pieceNames, ...toolNames(template), ...toolNames(schedule)].some((name) => /publish|delete|shell|path|url/.test(name))) {
  throw new Error("unsafe tool entered the WebMCP action surface");
}
if (!inspire.find((tool) => tool.name === "inspire_list")?.annotations?.readOnlyHint) {
  throw new Error("Inspire list is missing read-only annotation");
}
if (!inspire.find((tool) => tool.name === "inspire_list")?.annotations?.untrustedContentHint) {
  throw new Error("external source results are not marked untrusted");
}
if (!piece.find((tool) => tool.name === "session_read")?.annotations?.readOnlyHint) {
  throw new Error("Session receipt read is missing its read-only annotation");
}

const sessionCalls: Array<{ url: string; init?: RequestInit }> = [];
const sessionFetch = (async (url: string | URL | Request, init?: RequestInit) => {
  const key = String(url);
  sessionCalls.push({ url: key, init });
  if (key === "/api/pieces/field-note-20260831-001") {
    return new Response(JSON.stringify({ record: {
      id: "field-note-20260831-001",
      title: "Shared Session",
      hook: "One brief",
      status: "draft",
      skill_id: "carousel-v1",
      current_version: 1,
      session_connection_id: "receipt-123",
      session_connection_status: "waiting",
    } }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (key.endsWith("/connect")) {
    return new Response(JSON.stringify({ receipt: {
      session_id: "field-note-20260831-001",
      connection_id: "receipt-123",
      connection_status: "connected",
    } }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  throw new Error(`unexpected Session test request: ${key}`);
}) as typeof fetch;
const sessionChanges: Array<Record<string, unknown>> = [];
const sessionTools = createToolDefinitions({
  view: "piece",
  selectedInspirationId: null,
  selectedPieceId: "field-note-20260831-001",
  fetcher: sessionFetch,
  dispatch: (detail) => sessionChanges.push(detail),
});
await sessionTools.find((tool) => tool.name === "session_connect")?.execute({
  idempotency_key: "test.session.connect.1",
});
if (sessionCalls.length !== 2 || !String(sessionCalls[1].init?.body).includes("receipt-123")) {
  throw new Error("Session connect did not exchange the selected Session receipt");
}
if (sessionChanges[0]?.view !== "piece" || sessionChanges[0]?.id !== "field-note-20260831-001") {
  throw new Error("Session connect did not open the shared workspace");
}

const selected = createToolDefinitions({
  view: "piece",
  selectedInspirationId: null,
  selectedPieceId: "field-note-20260831-001",
  attentionSelections: [{
    key: "text:field-note-20260831-001:2:body:4-12",
    kind: "text",
    entityId: "field-note-20260831-001:2",
    parentId: "field-note-20260831-001",
    label: "Slide 2 · body selection",
    preview: "one exact phrase",
    role: "change",
    version: 4,
    range: { field: "body", start: 4, end: 12 },
  }],
  fetcher: noopFetch,
});
const selectedResult = selected.find((tool) => tool.name === "selection_read")?.execute({});
if (!JSON.stringify(selectedResult).includes("one exact phrase")) {
  throw new Error("shared attention did not reach the agent tool");
}

let liveSelections = [] as NonNullable<Parameters<typeof createToolDefinitions>[0]["attentionSelections"]>;
const liveSelectionTools = createToolDefinitions({
  view: "inspire",
  selectedInspirationId: null,
  selectedPieceId: null,
  getAttentionSelections: () => liveSelections,
  fetcher: noopFetch,
});
liveSelections = [{
  key: "annotation:piece:live",
  kind: "annotation",
  entityId: "piece:live",
  label: "Drawing on Session",
  preview: "latest selection",
  role: "change",
  geometry: {
    surface: "piece",
    mode: "drawing",
    points: [{ x: 0.2, y: 0.3 }, { x: 0.4, y: 0.35 }],
  },
}];
const liveSelectionResult = liveSelectionTools.find((tool) => tool.name === "selection_read")?.execute({});
if (!JSON.stringify(liveSelectionResult).includes("latest selection") || !JSON.stringify(liveSelectionResult).includes("drawing")) {
  throw new Error("shared attention tool returned a stale selection snapshot");
}

const context: ModelContext = { registerTool: () => undefined };
if (detectModelContext({ modelContext: context }).source !== "document") {
  throw new Error("current WebMCP feature detection failed");
}
if (detectModelContext({}, { modelContext: context }).source !== "legacy-navigator") {
  throw new Error("legacy preview detection failed");
}
if (detectModelContext({}).source !== "unavailable") {
  throw new Error("unavailable WebMCP state was misreported");
}

const long = { value: "x".repeat(4_000) };
if (boundedText(long).length > 1_500 || !assertBoundedToolResult(long)) {
  throw new Error("WebMCP result was not bounded");
}

}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
