const BLOCKED_DEMO_ROUTES = [
  "/api/assistant",
  "/api/status/ping",
  "/api/fetch",
  "/api/scrape",
  "/api/upload",
  "/api/publish/buffer",
  "/api/publish/webhook",
  "/api/metrics/sync",
];

export function isBlockedDemoPath(pathname: string): boolean {
  return BLOCKED_DEMO_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
