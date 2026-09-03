import { isBlockedDemoPath } from "./demoMode";

for (const path of [
  "/api/assistant/chat",
  "/api/status/ping",
  "/api/fetch",
  "/api/scrape",
  "/api/upload",
  "/api/publish/buffer",
  "/api/publish/webhook",
  "/api/metrics/sync",
]) {
  if (!isBlockedDemoPath(path)) throw new Error(`expected ${path} to be blocked`);
}

for (const path of [
  "/",
  "/api/status",
  "/api/inspirations",
  "/api/brain/context",
  "/api/sessions",
  "/api/pieces/demo/status",
  "/api/activity/demo/undo",
  "/api/file",
]) {
  if (isBlockedDemoPath(path)) throw new Error(`expected ${path} to remain available`);
}
