import { NextResponse } from "next/server";
import { callClaude, resolveEngine, MODEL } from "@/lib/claude";

export const dynamic = "force-dynamic";

// Live health check for the AI engine. Unlike /api/status (which only reports
// whether an engine is *configured*), this route makes a real round-trip and
// reports verified responsiveness + latency. Used by StatusBar to show a
// trustworthy "Claude is up" indicator.
//
// Cost: ~10 input + ~5 output tokens per call on API, or one subscription
// request on CLI. The frontend pings on mount and on click only — no polling.

export async function GET() {
  const engine = await resolveEngine();
  if (engine.engine === "none") {
    return NextResponse.json({
      ok: false,
      engine: "none",
      model: null,
      latency_ms: 0,
      error: "no engine configured",
    });
  }

  const start = Date.now();
  try {
    const text = await callClaude({
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      maxTokens: 5,
    });
    const latency_ms = Date.now() - start;
    const ok = text.trim().toUpperCase().includes("OK");
    return NextResponse.json({
      ok,
      engine: engine.engine,
      model: MODEL,
      latency_ms,
      response: text.slice(0, 100),
    });
  } catch (err) {
    const latency_ms = Date.now() - start;
    return NextResponse.json({
      ok: false,
      engine: engine.engine,
      model: MODEL,
      latency_ms,
      error: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
  }
}
