import {
  buildCodexArgs,
  buildCodexEnv,
  extractFinalMessageFromJsonl,
  extractJsonObject,
} from "./codexProvider";

const args = buildCodexArgs({
  projectRoot: "/tmp/project",
  lastMessagePath: "/tmp/last.json",
  model: "gpt-5.4-mini",
  outputSchemaPath: "/tmp/schema.json",
});
if (args[0] !== "exec") throw new Error("Codex args should use exec");
if (!args.includes("--json")) throw new Error("Codex args should request JSON events");
if (!args.includes("--ignore-user-config")) throw new Error("embedded Codex runs must skip unrelated user tools and MCP servers");
if (!args.includes("--skip-git-repo-check")) throw new Error("missing git skip flag");
if (!args.includes("--ephemeral")) throw new Error("missing ephemeral flag");
if (!args.includes("--sandbox") || !args.includes("read-only")) {
  throw new Error("missing read-only sandbox");
}
if (!args.includes("--output-last-message")) throw new Error("missing last message arg");
if (!args.includes("--output-schema")) throw new Error("missing output schema arg");
if (args.at(-1) !== "-") throw new Error("prompt should be read from stdin");

const parsed = extractJsonObject('noise {"title":"A","nested":{"ok":true}} trailing') as {
  title: string;
  nested: { ok: boolean };
};
if (parsed.title !== "A" || !parsed.nested.ok) throw new Error("bad JSON extraction");

const quoted = extractJsonObject('{"body":"keep } inside string"}') as { body: string };
if (quoted.body !== "keep } inside string") throw new Error("string brace broke parser");

const final = extractFinalMessageFromJsonl([
  '{"type":"thread.started"}',
  '{"type":"item.completed","item":{"type":"agent_message","text":"{\\"ok\\":true}"}}',
].join("\n"));
if (final !== '{"ok":true}') throw new Error("did not extract final message");

const env = buildCodexEnv({
  HOME: "/home/palm",
  PATH: "/bin",
  OPENAI_API_KEY: "secret",
  SOME_TOKEN: "secret",
});
if (env.OPENAI_API_KEY || env.SOME_TOKEN) throw new Error("secret env leaked");
if (env.HOME !== "/home/palm" || env.PATH !== "/bin") throw new Error("safe env missing");
