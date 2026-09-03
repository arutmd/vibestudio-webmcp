import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PROJECT_ROOT } from "../paths";

export type CodexRunOptions = {
  projectRoot?: string;
  prompt: string;
  timeoutMs?: number;
  codexPath?: string;
  model?: string;
  outputSchema?: unknown;
};

export type CodexRunResult = {
  json: unknown;
  stdout: string;
  stderr: string;
  lastMessage: string;
  exitCode: number | null;
  timedOut: boolean;
};

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_MODEL = process.env.ARUTLEE_CODEX_MODEL?.trim() || "gpt-5.4-mini";
const SAFE_ENV_KEYS = [
  "CODEX_HOME",
  "HOME",
  "LANG",
  "LC_ALL",
  "LOGNAME",
  "PATH",
  "SHELL",
  "TMPDIR",
  "USER",
];

export async function findCodexCli(): Promise<string | null> {
  const candidates = [
    process.env.CODEX_CLI_PATH?.trim(),
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    path.join(os.homedir(), ".local", "bin", "codex"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      await fs.access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // Try the next known install path.
    }
  }
  return null;
}

export async function hasCodexCli(): Promise<boolean> {
  return Boolean(await findCodexCli());
}

export function buildCodexArgs(input: {
  projectRoot: string;
  lastMessagePath: string;
  model?: string;
  outputSchemaPath?: string;
}): string[] {
  const args = [
    "exec",
    "--json",
    "--ignore-user-config",
    "--skip-git-repo-check",
    "--ephemeral",
    "--sandbox",
    "read-only",
    "-m",
    input.model || DEFAULT_MODEL,
    "-C",
    input.projectRoot,
    "--output-last-message",
    input.lastMessagePath,
  ];
  if (input.outputSchemaPath) {
    args.push("--output-schema", input.outputSchemaPath);
  }
  args.push("-");
  return args;
}

type EnvMap = Record<string, string | undefined>;

export function buildCodexEnv(env: EnvMap): EnvMap {
  const next: EnvMap = {};
  for (const key of SAFE_ENV_KEYS) {
    if (env[key]) next[key] = env[key];
  }
  return next;
}

export function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  if (start < 0) throw new Error("No JSON object found in Codex output.");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }
    if (char === "\"") {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(text.slice(start, i + 1));
      }
    }
  }

  throw new Error("Incomplete JSON object in Codex output.");
}

export function extractFinalMessageFromJsonl(text: string): string {
  let final = "";
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      const event = JSON.parse(trimmed) as {
        type?: string;
        item?: { type?: string; text?: string };
      };
      if (
        event.type === "item.completed" &&
        event.item?.type === "agent_message" &&
        typeof event.item.text === "string"
      ) {
        final = event.item.text;
      }
    } catch {
      // Ignore non-JSON warning lines from the CLI.
    }
  }
  return final;
}

export async function runCodexJson(options: CodexRunOptions): Promise<CodexRunResult> {
  const projectRoot = options.projectRoot ?? PROJECT_ROOT;
  const codex = options.codexPath ?? (await findCodexCli());
  if (!codex) throw new Error("Codex CLI was not found on this machine.");

  const lastMessage = path.join(
    os.tmpdir(),
    `arutlee-codex-${process.pid}-${Date.now()}.json`,
  );
  const schemaPath = options.outputSchema
    ? path.join(os.tmpdir(), `arutlee-codex-schema-${process.pid}-${Date.now()}.json`)
    : undefined;
  if (schemaPath) {
    await fs.writeFile(schemaPath, JSON.stringify(options.outputSchema), "utf8");
  }
  const args = buildCodexArgs({
    projectRoot,
    lastMessagePath: lastMessage,
    model: options.model,
    outputSchemaPath: schemaPath,
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;

  const child = spawn(/* turbopackIgnore: true */ codex, args, {
    cwd: projectRoot,
    env: buildCodexEnv(process.env) as NodeJS.ProcessEnv,
  });
  child.stdin.end(options.prompt, "utf8");

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
    setTimeout(() => child.kill("SIGKILL"), 2_000).unref();
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.on("close", resolve);
    child.on("error", reject);
  }).finally(() => clearTimeout(timeout));

  const lastText = await fs.readFile(lastMessage, "utf8").catch(() => "");
  fs.unlink(lastMessage).catch(() => {});
  if (schemaPath) fs.unlink(schemaPath).catch(() => {});
  if (timedOut || exitCode !== 0) {
    const detail = [lastText, extractFinalMessageFromJsonl(stdout), stderr]
      .filter(Boolean)
      .join("\n")
      .slice(0, 800);
    throw new Error(
      timedOut
        ? `Codex CLI timed out after ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms. ${detail}`
        : `Codex CLI exited with code ${exitCode}. ${detail}`,
    );
  }
  const finalText = lastText || extractFinalMessageFromJsonl(stdout);
  const json = extractJsonObject(finalText);
  return { json, stdout, stderr, lastMessage: lastText, exitCode, timedOut };
}
