import { boundedText, toolText } from "./adapter";
import type { ToolEnvironment, WebMCPTool } from "./types";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function schema(properties: Record<string, unknown>, required: string[] = []): Record<string, unknown> {
  return { type: "object", properties, ...(required.length ? { required } : {}), additionalProperties: false };
}

async function request(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
): Promise<unknown> {
  const response = await fetcher(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? `${response.status} ${url}`);
  }
  return data;
}

function jsonInit(method: string, body: unknown, signal?: AbortSignal): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  };
}

const readAnnotations = { readOnlyHint: true, untrustedContentHint: false } as const;
const sourceAnnotations = { readOnlyHint: true, untrustedContentHint: true } as const;

// Keep the receipt returned by a newly-created Session available in the current
// browser workspace. This also preserves continuity on stateless public demo
// hosts where two API routes may run in separate serverless instances.
const liveSessionRecords = new Map<string, Record<string, unknown>>();

function sessionToolReceipt(record: Record<string, unknown>): Record<string, unknown> {
  return {
    session_id: record.id,
    connection_id: record.session_connection_id ?? null,
    connection_status: record.session_connection_status ?? "waiting",
    connected_agent: record.session_agent_label ?? null,
    connected_at: record.session_connected_at ?? null,
    output: record.session_output ?? record.visual_output ?? "carousel",
    title: record.title,
    brief: record.session_brief ?? record.hook,
    status: record.status,
    version: record.current_version ?? 1,
    context_receipt_id: record.context_receipt_id ?? null,
    instruction: `Use Session ${String(record.id ?? "")} as the shared workspace. Read its Template receipt before changing slides.`,
  };
}

export function createToolDefinitions(environment: ToolEnvironment): WebMCPTool[] {
  const fetcher = environment.fetcher ?? fetch;
  const changed = (detail: Record<string, unknown>) => environment.dispatch?.(detail);
  const tools: WebMCPTool[] = [
    {
      name: "selection_read",
      title: "Read shared attention",
      description: "Read the exact objects the creator placed in the visible Talking about tray, including edit, reference, compare, or preserve roles.",
      inputSchema: schema({}),
      annotations: {
        readOnlyHint: true,
        // Shared attention can contain creator-selected external inspiration.
        // Keep this conservative even when the tray is currently empty.
        untrustedContentHint: true,
      },
      execute: () => {
        const attentionSelections = environment.getAttentionSelections?.()
          ?? environment.attentionSelections
          ?? [];
        return toolText({
          view: environment.view,
          count: attentionSelections.length,
          instruction: attentionSelections.length
            ? "Treat these as the creator's explicit shared attention. Respect each item's role and version."
            : "The creator has not selected anything. Ask them to point at or add the exact objects instead of guessing.",
          selections: attentionSelections.map((item) => ({
            key: item.key,
            kind: item.kind,
            role: item.role,
            label: item.label,
            preview: boundedText(item.preview, 180),
            entity_id: item.entityId,
            parent_id: item.parentId ?? null,
            version: item.version ?? null,
            range: item.range ?? null,
            geometry: item.geometry ?? null,
          })),
        });
      },
    },
    {
      name: "session_list",
      title: "List VibeStudio Sessions",
      description: "List the creator's shared VibeStudio Sessions and show which one is waiting for an agent or already connected.",
      inputSchema: schema({}),
      annotations: readAnnotations,
      execute: async (_input, context) => {
        const data = object(await request(fetcher, "/api/sessions", { signal: context?.signal }));
        const sessions = Array.isArray(data.sessions) ? data.sessions : [];
        const cached = [...liveSessionRecords.values()].map(sessionToolReceipt);
        const seen = new Set(sessions.map((value) => String(object(value).session_id ?? "")));
        return toolText({
          selected_session_id: environment.selectedPieceId,
          sessions: [...cached.filter((value) => !seen.has(String(value.session_id ?? ""))), ...sessions].slice(0, 12),
        });
      },
    },
    {
      name: "session_start",
      title: "Start a VibeStudio Session",
      description: "Create and open a new shared creator Session from one natural-language brief. The current browser agent connects through a VibeStudio receipt; this does not claim or create a native Codex task id.",
      inputSchema: schema({
        brief: { type: "string", maxLength: 1200 },
        title: { type: "string", maxLength: 300 },
        output: { type: "string", enum: ["carousel"] },
        agent_label: { type: "string", maxLength: 60 },
        idempotency_key: { type: "string", maxLength: 120 },
      }, ["brief", "idempotency_key"]),
      annotations: { readOnlyHint: false, destructiveHint: false, untrustedContentHint: false },
      execute: async (input, context) => {
        const value = object(input);
        const data = object(await request(fetcher, "/api/sessions", jsonInit("POST", {
          brief: value.brief,
          title: value.title,
          output: value.output ?? "carousel",
          origin: "webmcp",
          connect: true,
          agent_label: value.agent_label ?? "Codex",
          idempotency_key: value.idempotency_key,
        }, context?.signal)));
        const receipt = object(data.receipt);
        const record = object(data.record);
        if (record.id) liveSessionRecords.set(String(record.id), record);
        changed({ entity: "piece", id: receipt.session_id, select: true, view: "piece" });
        return toolText(receipt);
      },
    },
    {
      name: "session_connect",
      title: "Connect to the current Session",
      description: "Connect this browser agent to a VibeStudio Session created by the human. If session_id is omitted, connect to the currently open Session.",
      inputSchema: schema({
        session_id: { type: "string", maxLength: 80 },
        agent_label: { type: "string", maxLength: 60 },
        idempotency_key: { type: "string", maxLength: 120 },
      }, ["idempotency_key"]),
      annotations: { readOnlyHint: false, destructiveHint: false, untrustedContentHint: false },
      execute: async (input, context) => {
        const value = object(input);
        const id = String(value.session_id ?? environment.selectedPieceId ?? "");
        if (!id) throw new Error("Open a VibeStudio Session or provide session_id first");
        const cached = liveSessionRecords.get(id);
        if (cached) {
          const connected = {
            ...cached,
            session_connection_status: "connected",
            session_agent_label: value.agent_label ?? "Codex",
            session_connected_at: new Date().toISOString(),
          };
          liveSessionRecords.set(id, connected);
          changed({ entity: "piece", id, select: true, view: "piece" });
          return toolText(sessionToolReceipt(connected));
        }
        const currentData = object(await request(fetcher, `/api/pieces/${encodeURIComponent(id)}`, { signal: context?.signal }));
        const current = object(currentData.record);
        const data = object(await request(fetcher, `/api/sessions/${encodeURIComponent(id)}/connect`, jsonInit("POST", {
          connection_id: current.session_connection_id,
          agent_label: value.agent_label ?? "Codex",
          idempotency_key: value.idempotency_key,
        }, context?.signal)));
        const receipt = object(data.receipt);
        changed({ entity: "piece", id, select: true, view: "piece" });
        return toolText(receipt);
      },
    },
    {
      name: "session_read",
      title: "Read a VibeStudio Session",
      description: "Read the shared Session receipt, brief, Template receipt id, current version, and connection state. If session_id is omitted, read the currently open Session.",
      inputSchema: schema({ session_id: { type: "string", maxLength: 80 } }),
      annotations: readAnnotations,
      execute: async (input, context) => {
        const value = object(input);
        const id = String(value.session_id ?? environment.selectedPieceId ?? "");
        if (!id) throw new Error("Open a VibeStudio Session or provide session_id first");
        const cached = liveSessionRecords.get(id);
        if (cached) return toolText(sessionToolReceipt(cached));
        const data = object(await request(fetcher, `/api/pieces/${encodeURIComponent(id)}`, { signal: context?.signal }));
        const record = object(data.record);
        return toolText(sessionToolReceipt(record));
      },
    },
  ];

  if (environment.view === "inspire") {
    tools.push(
      {
        name: "inspire_list",
        title: "List inspiration",
        description: "List saved inspiration in the current VibeStudio Inspire view.",
        inputSchema: schema({}),
        annotations: sourceAnnotations,
        execute: async (_input, context) => {
          const data = object(await request(fetcher, "/api/inspirations", { signal: context?.signal }));
          const records = Array.isArray(data.records) ? data.records : [];
          return toolText(records.filter((value) => object(value).status !== "archived").map((value) => {
            const record = object(value);
            const creator = object(record.creator);
            return {
              id: record.id,
              title: record.title,
              creator: creator.display_name ?? null,
              reaction: record.reaction,
              saved: record.status === "saved",
              selected: record.id === environment.selectedInspirationId,
            };
          }));
        },
      },
      {
        name: "inspire_open",
        title: "Open inspiration",
        description: "Select one saved inspiration in the visible VibeStudio workspace.",
        inputSchema: schema({ inspiration_id: { type: "string", maxLength: 80 } }, ["inspiration_id"]),
        annotations: { readOnlyHint: false, untrustedContentHint: true, destructiveHint: false },
        execute: async (input, context) => {
          const id = String(object(input).inspiration_id ?? "");
          const data = await request(fetcher, `/api/inspirations/${encodeURIComponent(id)}`, { signal: context?.signal });
          changed({ entity: "inspiration", id, select: true });
          return toolText(data);
        },
      },
      {
        name: "inspire_react",
        title: "React to inspiration",
        description: "Save an explicit like, dislike, or neutral reaction and its editable memory evidence.",
        inputSchema: schema({
          inspiration_id: { type: "string", maxLength: 80 },
          reaction: { type: "string", enum: ["like", "dislike", "none"] },
          note: { type: "string", maxLength: 600 },
          expected_version: { type: "integer", minimum: 1 },
          idempotency_key: { type: "string", maxLength: 120 },
        }, ["inspiration_id", "reaction", "idempotency_key"]),
        annotations: { readOnlyHint: false, untrustedContentHint: true, destructiveHint: false },
        execute: async (input, context) => {
          const value = object(input);
          const id = String(value.inspiration_id ?? "");
          const data = await request(fetcher, `/api/inspirations/${encodeURIComponent(id)}`, jsonInit("PATCH", {
            reaction: value.reaction,
            reaction_note: value.note ?? "",
            expected_version: value.expected_version,
            idempotency_key: value.idempotency_key,
          }, context?.signal));
          changed({ entity: "inspiration", id });
          return toolText(data);
        },
      },
      {
        name: "inspire_save",
        title: "Save inspiration",
        description: "Save or remove one feed item from the creator's taste library without deleting it.",
        inputSchema: schema({
          inspiration_id: { type: "string", maxLength: 80 },
          saved: { type: "boolean" },
          expected_version: { type: "integer", minimum: 1 },
          idempotency_key: { type: "string", maxLength: 120 },
        }, ["inspiration_id", "saved", "idempotency_key"]),
        annotations: { readOnlyHint: false, untrustedContentHint: true, destructiveHint: false },
        execute: async (input, context) => {
          const value = object(input);
          const id = String(value.inspiration_id ?? "");
          const data = await request(fetcher, `/api/inspirations/${encodeURIComponent(id)}`, jsonInit("PATCH", {
            status: value.saved === false ? "feed" : "saved",
            expected_version: value.expected_version,
            idempotency_key: value.idempotency_key,
          }, context?.signal));
          changed({ entity: "inspiration", id });
          return toolText(data);
        },
      },
      {
        name: "source_follow",
        title: "Follow inspiration source",
        description: "Follow a creator, channel, publication, or website from one natural-language field containing a link, free text, or both.",
        inputSchema: schema({
          source: { type: "string", maxLength: 1200 },
          idempotency_key: { type: "string", maxLength: 120 },
        }, ["source", "idempotency_key"]),
        annotations: { readOnlyHint: false, untrustedContentHint: true, destructiveHint: false },
        execute: async (input, context) => {
          const value = object(input);
          const interpreted = object(await request(fetcher, "/api/ai/source-intake", jsonInit("POST", {
            input: value.source,
          }, context?.signal)));
          const draft = object(interpreted.draft);
          const data = await request(fetcher, "/api/creators", jsonInit("POST", {
            ...draft,
            status: "active",
            idempotency_key: value.idempotency_key,
          }, context?.signal));
          changed({ entity: "creator" });
          return toolText(data);
        },
      },
      brainContextTool(fetcher, environment, "carousel_create"),
      {
        name: "carousel_create",
        title: "Create carousel draft",
        description: "Validate and save one original seven-slide Draft linked to its source and context receipt.",
        inputSchema: schema({
          inspiration_id: { type: "string", maxLength: 80 },
          receipt_id: { type: "string", maxLength: 80 },
          title: { type: "string", maxLength: 300 },
          hook: { type: "string", maxLength: 600 },
          body: { type: "string", maxLength: 4000 },
          transformation_note: { type: "string", maxLength: 700 },
          slides: { type: "array", minItems: 7, maxItems: 7, items: { type: "object" } },
          idempotency_key: { type: "string", maxLength: 120 },
        }, ["inspiration_id", "receipt_id", "title", "transformation_note", "slides", "idempotency_key"]),
        annotations: { readOnlyHint: false, untrustedContentHint: true, destructiveHint: false },
        execute: async (input, context) => {
          const value = object(input);
          const data = object(await request(fetcher, "/api/pieces", jsonInit("POST", {
            inspiration_id: value.inspiration_id,
            context_receipt_id: value.receipt_id,
            skill_id: "carousel-v1",
            skill_version: "1.0.0",
            title: value.title,
            hook: value.hook ?? "",
            body: value.body ?? "",
            transformation_note: value.transformation_note,
            carousel: value.slides,
            idempotency_key: value.idempotency_key,
          }, context?.signal)));
          const record = object(data.record);
          changed({ entity: "piece", id: record.id, select: true, view: "piece" });
          return toolText({ piece_id: record.id, status: "draft", slide_count: Array.isArray(record.carousel) ? record.carousel.length : 0 });
        },
      },
    );
  }

  if (environment.view === "piece" && environment.selectedPieceId) {
    const currentId = environment.selectedPieceId;
    tools.push(
      {
        name: "carousel_read",
        title: "Read current carousel",
        description: "Read the selected carousel story, source lineage, context receipt, and current visual state.",
        inputSchema: schema({}),
        annotations: sourceAnnotations,
        execute: async (_input, context) => {
          const data = object(await request(fetcher, `/api/pieces/${encodeURIComponent(currentId)}`, { signal: context?.signal }));
          const record = object(data.record);
          return toolText({
            id: record.id,
            version: record.current_version ?? 1,
            status: record.status,
            inspiration_id: record.inspiration_id,
            context_receipt_id: record.context_receipt_id,
            transformation_note: record.transformation_note,
            carousel: record.carousel,
          });
        },
      },
      brainContextTool(fetcher, environment, "carousel_revise"),
      {
        name: "carousel_update",
        title: "Update one carousel slide",
        description: "Revise only one named slide with version checking and recoverable activity history.",
        inputSchema: schema({
          piece_id: { type: "string", maxLength: 80 },
          slide_index: { type: "integer", minimum: 1, maximum: 7 },
          title: { type: "string", maxLength: 180 },
          body: { type: "string", maxLength: 700 },
          visual_cue: { type: "string", maxLength: 500 },
          reason: { type: "string", maxLength: 300 },
          expected_version: { type: "integer", minimum: 1 },
          idempotency_key: { type: "string", maxLength: 120 },
        }, ["piece_id", "slide_index", "reason", "idempotency_key"]),
        annotations: { readOnlyHint: false, destructiveHint: false },
        execute: async (input, context) => {
          const value = object(input);
          if (value.piece_id !== currentId) throw new Error("piece_id must match the selected piece");
          const data = await request(fetcher, `/api/pieces/${encodeURIComponent(currentId)}/carousel`, jsonInit("PATCH", value, context?.signal));
          changed({ entity: "piece", id: currentId });
          return toolText(data);
        },
      },
      {
        name: "carousel_finish",
        title: "Finish carousel",
        description: "Create only missing visual layers and render all seven final creator-branded slides.",
        inputSchema: schema({
          piece_id: { type: "string", maxLength: 80 },
          expected_version: { type: "integer", minimum: 1 },
          idempotency_key: { type: "string", maxLength: 120 },
        }, ["piece_id", "idempotency_key"]),
        annotations: { readOnlyHint: false, destructiveHint: false },
        execute: async (input, context) => {
          const value = object(input);
          if (value.piece_id !== currentId) throw new Error("piece_id must match the selected piece");
          const data = await request(fetcher, `/api/pieces/${encodeURIComponent(currentId)}/finish`, jsonInit("POST", value, context?.signal));
          changed({ entity: "piece", id: currentId });
          return toolText(data);
        },
      },
      {
        name: "piece_status",
        title: "Set Draft or Ready",
        description: "Move the selected carousel only between Draft and Ready.",
        inputSchema: schema({
          piece_id: { type: "string", maxLength: 80 },
          status: { type: "string", enum: ["draft", "ready"] },
          expected_version: { type: "integer", minimum: 1 },
          idempotency_key: { type: "string", maxLength: 120 },
        }, ["piece_id", "status", "idempotency_key"]),
        annotations: { readOnlyHint: false, destructiveHint: false },
        execute: async (input, context) => {
          const value = object(input);
          if (value.piece_id !== currentId) throw new Error("piece_id must match the selected piece");
          const data = await request(fetcher, `/api/pieces/${encodeURIComponent(currentId)}/status`, jsonInit("POST", value, context?.signal));
          changed({ entity: "piece", id: currentId });
          return toolText(data);
        },
      },
      {
        name: "piece_undo",
        title: "Undo a piece change",
        description: "Undo one recoverable activity when no newer human edit would be overwritten.",
        inputSchema: schema({ activity_id: { type: "string", maxLength: 80 } }, ["activity_id"]),
        annotations: { readOnlyHint: false, destructiveHint: false },
        execute: async (input, context) => {
          const id = String(object(input).activity_id ?? "");
          const data = await request(fetcher, `/api/activity/${encodeURIComponent(id)}/undo`, jsonInit("POST", {}, context?.signal));
          changed({ entity: "piece", id: currentId });
          return toolText(data);
        },
      },
    );
  }

  if (environment.view === "schedule") {
    tools.push(
      {
        name: "schedule_list",
        title: "List publishing schedule",
        description: "List creator sessions that are Ready, Scheduled, or Live, including their planned time and platforms.",
        inputSchema: schema({}),
        annotations: readAnnotations,
        execute: async (_input, context) => {
          const data = object(await request(fetcher, "/api/pieces", { signal: context?.signal }));
          const records = Array.isArray(data.records) ? data.records : [];
          return toolText(records.map((value) => {
            const record = object(value);
            return {
              id: record.id,
              title: record.title,
              status: record.status,
              scheduled_for: record.scheduled_for ?? null,
              platforms: record.platforms ?? [],
            };
          }));
        },
      },
      {
        name: "piece_schedule",
        title: "Schedule a creator session",
        description: "Place one Ready creator session on the publishing schedule. This does not publish it.",
        inputSchema: schema({
          piece_id: { type: "string", maxLength: 80 },
          scheduled_for: { type: "string", maxLength: 80 },
        }, ["piece_id", "scheduled_for"]),
        annotations: { readOnlyHint: false, destructiveHint: false },
        execute: async (input, context) => {
          const value = object(input);
          const id = String(value.piece_id ?? "");
          const data = await request(fetcher, `/api/pieces/${encodeURIComponent(id)}`, jsonInit("PATCH", {
            status: "scheduled",
            scheduled_for: value.scheduled_for,
          }, context?.signal));
          changed({ entity: "piece", id });
          return toolText(data);
        },
      },
    );
  }

  if (environment.view === "template") {
    tools.push(
      {
        name: "template_list",
        title: "List creator template",
        description: "List editable VibeStudio Template rules using optional category, status, or text filters.",
        inputSchema: schema({
          category: { type: "string", maxLength: 40 },
          status: { type: "string", enum: ["active", "proposed", "archived"] },
          q: { type: "string", maxLength: 120 },
        }),
        annotations: readAnnotations,
        execute: async (input, context) => {
          const value = object(input);
          const params = new URLSearchParams();
          for (const key of ["category", "status", "q"] as const) {
            if (value[key]) params.set(key, String(value[key]));
          }
          const data = await request(fetcher, `/api/brain?${params.toString()}`, { signal: context?.signal });
          return toolText(data);
        },
      },
      {
        name: "template_edit",
        title: "Edit creator template",
        description: "Add, edit, archive, or restore one bounded VibeStudio Template rule with provenance and version checks.",
        inputSchema: schema({
          action: { type: "string", enum: ["add", "edit", "archive", "restore"] },
          record_id: { type: "string", maxLength: 80 },
          category: { type: "string", maxLength: 40 },
          text: { type: "string", maxLength: 700 },
          tags: { type: "array", maxItems: 12, items: { type: "string", maxLength: 60 } },
          expected_version: { type: "integer", minimum: 1 },
          idempotency_key: { type: "string", maxLength: 120 },
        }, ["action", "idempotency_key"]),
        annotations: { readOnlyHint: false, destructiveHint: false },
        execute: async (input, context) => {
          const value = object(input);
          const action = String(value.action ?? "");
          const id = String(value.record_id ?? "");
          const url = action === "add" ? "/api/brain" : `/api/brain/${encodeURIComponent(id)}`;
          const body = action === "archive"
            ? { status: "archived", actor: "codex", expected_version: value.expected_version, idempotency_key: value.idempotency_key }
            : action === "restore"
              ? { status: "active", actor: "codex", expected_version: value.expected_version, idempotency_key: value.idempotency_key }
              : { ...value, actor: "codex", authored_by: "arutlee", source_type: "direct_edit" };
          const data = await request(fetcher, url, jsonInit(action === "add" ? "POST" : "PATCH", body, context?.signal));
          changed({ entity: "brain", id });
          return toolText(data);
        },
      },
    );
  }
  return tools;
}

function brainContextTool(
  fetcher: typeof fetch,
  environment: ToolEnvironment,
  purpose: "carousel_create" | "carousel_revise",
): WebMCPTool {
  return {
    name: "template_context",
    title: "Get creator template context",
    description: "Create a bounded receipt with only the VibeStudio Template rules relevant to this carousel task.",
    inputSchema: schema({
      inspiration_id: { type: "string", maxLength: 80 },
      piece_id: { type: "string", maxLength: 80 },
    }),
    annotations: { readOnlyHint: true, untrustedContentHint: purpose === "carousel_create" },
    execute: async (input, context) => {
      const value = object(input);
      const data = await request(fetcher, "/api/brain/context", jsonInit("POST", {
        purpose,
        skill_id: "carousel-v1",
        inspiration_id: value.inspiration_id ?? environment.selectedInspirationId ?? undefined,
        piece_id: value.piece_id ?? environment.selectedPieceId ?? undefined,
      }, context?.signal));
      return toolText(data);
    },
  };
}

export function toolNames(tools: WebMCPTool[]): string[] {
  return tools.map((tool) => tool.name);
}

export function assertBoundedToolResult(value: unknown): boolean {
  return boundedText(value).length <= 1_500;
}
