import { createServer, type IncomingMessage } from "node:http";
import { assistantChat, type AssistantChatInput } from "../lib/assistant";
import { resolveEngine } from "../lib/claude";

const PORT = Number(process.env.ARUTLEE_ASSISTANT_DAEMON_PORT ?? 4331);
const HOST = "127.0.0.1";

const server = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "GET" && req.url === "/health") {
    const engine = await resolveEngine();
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: true,
        engine: engine.engine,
        model: engine.model,
      }),
    );
    return;
  }

  if (req.method === "POST" && req.url === "/chat") {
    try {
      const body = (await readJson(req)) as AssistantChatInput;
      const response = await assistantChat(body, { daemon: true });
      res.statusCode = 200;
      res.end(JSON.stringify(response));
    } catch (error) {
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(PORT, HOST, () => {
  console.log(`Arutlee assistant daemon listening on http://${HOST}:${PORT}`);
});

async function readJson(req: IncomingMessage): Promise<unknown> {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk.toString();
    if (raw.length > 200_000) throw new Error("request too large");
  }
  return raw ? JSON.parse(raw) : {};
}
