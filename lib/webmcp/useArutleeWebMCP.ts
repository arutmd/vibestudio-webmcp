"use client";

import { useEffect, useRef, useState } from "react";
import { createToolDefinitions } from "./tools";
import { detectModelContext, registerContextualTools } from "./adapter";
import type { ArutleeView } from "./types";
import type { SharedAttentionSelection } from "../sharedAttention";
import { filterWebMCPTools, type WebMCPPreferences } from "./preferences";

export type WebMCPState = "ready" | "legacy-preview" | "unavailable" | "disabled" | "error";

export function useArutleeWebMCP(input: {
  view: ArutleeView;
  selectedInspirationId: string | null;
  selectedPieceId: string | null;
  attentionSelections: SharedAttentionSelection[];
  preferences: WebMCPPreferences;
}): WebMCPState {
  const [state, setState] = useState<WebMCPState>("unavailable");
  const attentionRef = useRef(input.attentionSelections);
  attentionRef.current = input.attentionSelections;

  useEffect(() => {
    const controller = new AbortController();
    if (!input.preferences.enabled) {
      setState("disabled");
      return () => controller.abort();
    }
    const documentHost = document as Document & { modelContext?: unknown };
    const navigatorHost = navigator as Navigator & { modelContext?: unknown };
    const detected = detectModelContext(documentHost, navigatorHost);
    if (!detected.context) {
      setState("unavailable");
      return () => controller.abort();
    }
    const tools = filterWebMCPTools(createToolDefinitions({
      ...input,
      getAttentionSelections: () => attentionRef.current,
      dispatch: (detail) => {
        window.dispatchEvent(new CustomEvent("arutlee:data-changed", { detail }));
      },
    }), input.preferences);
    registerContextualTools(detected.context, tools, controller)
      .then(() => setState(detected.source === "document" ? "ready" : "legacy-preview"))
      .catch(() => {
        if (!controller.signal.aborted) setState("error");
      });
    return () => controller.abort();
  }, [input.view, input.selectedInspirationId, input.selectedPieceId, input.preferences]);

  return state;
}
