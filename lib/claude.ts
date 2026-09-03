import Anthropic from "@anthropic-ai/sdk";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

// ---------------------------------------------------------------------------
// Engine detection chain.
//
// Three backends, picked in order of preference. The whole studio still
// exposes the same `callClaude({system, messages, ...})` interface so route
// handlers don't care which backend is active.
//
//   1. ANTHROPIC_API_KEY set
//        -> Anthropic SDK direct. Highest fidelity, costs per-token.
//        -> Use when you specifically want API billing or features only the
//           SDK exposes (prompt caching with explicit cache_control markers).
//
//   2. `claude` CLI on PATH (no API key)
//        -> Spawn `claude -p` subprocess. Uses Palm's existing Claude Code
//           subscription auth (Pro / Max). $0 incremental cost as long as
//           subscription rate limits aren't exceeded. Officially supported
//           personal use of Claude Code.
//
//   3. Neither available
//        -> `callClaude` throws "engine not configured". Each AI route
//           catches and returns a deterministic fallback template so the
//           studio still works on a fresh checkout.
//
// CRITICAL: the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk` package)
// does NOT support subscription auth — it requires ANTHROPIC_API_KEY. Only
// the `claude` CLI binary itself uses subscription OAuth. So when no API
// key is set, we spawn the CLI as a subprocess, not the SDK package.
// ---------------------------------------------------------------------------

let cachedSdk: Anthropic | null | undefined;
let cachedCliPath: string | null | undefined;

function getSdkClient(): Anthropic | null {
  if (cachedSdk !== undefined) return cachedSdk;
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    cachedSdk = null;
    return null;
  }
  cachedSdk = new Anthropic({ apiKey: key });
  return cachedSdk;
}

// Look for the `claude` binary on PATH (and a couple of common install
// locations). Cached after first successful lookup.
async function findClaudeCli(): Promise<string | null> {
  if (cachedCliPath !== undefined) return cachedCliPath;
  const candidates = [
    process.env.CLAUDE_CLI_PATH?.trim(),
    path.join(os.homedir(), ".local", "bin", "claude"),
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
  ].filter((p): p is string => !!p);

  for (const p of candidates) {
    try {
      await fs.access(p, fs.constants.X_OK);
      cachedCliPath = p;
      return p;
    } catch {
      // try next
    }
  }
  // Fall back to PATH lookup via spawn `which claude`.
  cachedCliPath = await new Promise<string | null>((resolve) => {
    const w = spawn("which", ["claude"]);
    let out = "";
    w.stdout.on("data", (d) => (out += d.toString()));
    w.on("close", (code) => {
      if (code === 0) resolve(out.trim().split("\n")[0] || null);
      else resolve(null);
    });
    w.on("error", () => resolve(null));
  });
  return cachedCliPath;
}

export type Engine = "api" | "cli" | "none";

// Resolve which engine WILL be used on the next call. Used by /api/status to
// expose the active backend in the masthead chip.
export async function resolveEngine(): Promise<{
  engine: Engine;
  cliPath: string | null;
  apiKeyPresent: boolean;
  model: string;
}> {
  const apiKeyPresent = !!process.env.ANTHROPIC_API_KEY?.trim();
  if (apiKeyPresent) {
    return { engine: "api", cliPath: null, apiKeyPresent: true, model: MODEL };
  }
  const cliPath = await findClaudeCli();
  if (cliPath) {
    return { engine: "cli", cliPath, apiKeyPresent: false, model: MODEL };
  }
  return { engine: "none", cliPath: null, apiKeyPresent: false, model: MODEL };
}

export const MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";

export type ClaudeCallOptions = {
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  cacheSystem?: boolean;
  /** CLI engine only: tool names to allow, e.g. ["WebFetch", "WebSearch"].
   *  Default stays no tools. Ignored by the SDK engine. */
  allowedTools?: string[];
};

export async function callClaude(opts: ClaudeCallOptions): Promise<string> {
  const sdk = getSdkClient();
  if (sdk) return callViaSdk(sdk, opts);

  const cliPath = await findClaudeCli();
  if (cliPath) return callViaCli(cliPath, opts);

  throw new Error(
    "engine not configured: set ANTHROPIC_API_KEY or install the `claude` CLI",
  );
}

// ---- Backend 1: Anthropic SDK direct ---------------------------------------

async function callViaSdk(
  client: Anthropic,
  opts: ClaudeCallOptions,
): Promise<string> {
  type SystemBlock = {
    type: "text";
    text: string;
    cache_control?: { type: "ephemeral" };
  };
  const systemValue: string | SystemBlock[] | undefined = opts.system
    ? opts.cacheSystem === false
      ? opts.system
      : [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }]
    : undefined;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 2048,
    system: systemValue as unknown as Anthropic.Messages.MessageCreateParamsNonStreaming["system"],
    messages: opts.messages,
  });
  return res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n")
    .trim();
}

// ---- Backend 2: `claude` CLI subprocess -----------------------------------
//
// Equivalent to:
//   claude -p "<flattened user message>"
//          --system-prompt "<system>"
//          --output-format json
//          --tools ""              (no tool use, just respond)
//                                  or --allowed-tools <names> when
//                                  opts.allowedTools is provided (research calls)
//          --no-session-persistence
//          --model <MODEL>
//          --setting-sources ""    (skip user/project/local settings load)
//
// Run from a temp working directory so Claude Code doesn't auto-discover the
// studio's CLAUDE.md or settings (which would inflate the cached system
// prompt with content unrelated to the task).
//
// Auth: the CLI itself reads OAuth from `~/.claude/` when ANTHROPIC_API_KEY
// is unset. We force the env var to empty in the child so even if it's set
// in the parent process the CLI uses subscription auth.

type CliResponse = {
  type: string;
  subtype: string;
  is_error: boolean;
  result?: string;
  api_error_status?: string | null;
  duration_ms?: number;
  total_cost_usd?: number;
  usage?: Record<string, unknown>;
  permission_denials?: unknown[];
};

async function callViaCli(
  cliPath: string,
  opts: ClaudeCallOptions,
): Promise<string> {
  // Flatten the message history into a single user prompt. The CLI's `-p`
  // mode only accepts a single user message. For one-shot prompts (which is
  // what the studio uses everywhere) we just take the last user turn; if the
  // caller passed a multi-turn transcript we join them with separators.
  const userPrompt =
    opts.messages.length === 1
      ? opts.messages[0].content
      : opts.messages
          .map((m) => `[${m.role}]\n${m.content}`)
          .join("\n\n---\n\n");

  const args: string[] = [
    "-p",
    userPrompt,
    "--output-format",
    "json",
    ...(opts.allowedTools && opts.allowedTools.length > 0
      ? ["--allowed-tools", opts.allowedTools.join(",")]
      : ["--tools", ""]),
    "--no-session-persistence",
    "--model",
    MODEL,
    "--setting-sources",
    "",
  ];
  if (opts.system) {
    args.push("--system-prompt", opts.system);
  }

  // Force subscription auth: clear the API key in the child so the CLI
  // falls through to OAuth from `~/.claude/`. Parent process's key (if any)
  // would have caused the SDK path to be picked above; we're here precisely
  // because no key is set.
  const childEnv = { ...process.env };
  delete childEnv.ANTHROPIC_API_KEY;

  const proc = spawn(cliPath, args, {
    cwd: os.tmpdir(),
    env: childEnv,
  });

  let stdout = "";
  let stderr = "";
  proc.stdout.on("data", (d) => (stdout += d.toString()));
  proc.stderr.on("data", (d) => (stderr += d.toString()));

  const exitCode: number = await new Promise((resolve, reject) => {
    proc.on("close", (code) => resolve(code ?? -1));
    proc.on("error", (err) => reject(err));
  });

  if (exitCode !== 0) {
    throw new Error(
      `claude CLI exited ${exitCode}: ${stderr.slice(0, 400) || stdout.slice(0, 400)}`,
    );
  }

  // Output is a single JSON object (one line). Parse and extract `result`.
  let parsed: CliResponse;
  try {
    parsed = JSON.parse(stdout) as CliResponse;
  } catch {
    throw new Error(
      `claude CLI returned non-JSON output: ${stdout.slice(0, 200)}`,
    );
  }
  if (parsed.is_error) {
    throw new Error(
      `claude CLI error (${parsed.api_error_status ?? parsed.subtype}): ${
        parsed.result ?? "unknown"
      }`,
    );
  }
  return (parsed.result ?? "").trim();
}

// ---- Shared JSON parser (unchanged) ---------------------------------------
//
// Extract the first balanced JSON object or array from the text. Handles
// fenced code blocks, leading/trailing prose, and stray braces inside string
// literals.

export function safeJSON<T>(text: string, fallback: T): T {
  if (!text) return fallback;
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // fall through
  }
  const extracted = extractBalanced(cleaned);
  if (extracted) {
    try {
      return JSON.parse(extracted) as T;
    } catch {
      // fall through
    }
  }
  return fallback;
}

function extractBalanced(s: string): string | null {
  let start = -1;
  let opener = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "{" || s[i] === "[") {
      start = i;
      opener = s[i];
      break;
    }
  }
  if (start === -1) return null;
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === '"') {
        inStr = false;
      }
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === opener) depth++;
    else if (c === closer) {
      depth--;
      if (depth === 0) {
        return s.slice(start, i + 1);
      }
    }
  }
  return null;
}

// ---- Compatibility shim ---------------------------------------------------
// The old code exported `getClient()` returning the Anthropic SDK or null.
// Some callers (status route, etc.) still import it. Keep it but note that
// it only reflects backend 1 — call `resolveEngine()` for the full picture.
export function getClient(): Anthropic | null {
  return getSdkClient();
}
