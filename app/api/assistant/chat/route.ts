import { NextRequest, NextResponse } from "next/server";
import {
  assistantChat,
  type AssistantChatInput,
  type AssistantChatResponse,
} from "@/lib/assistant";

export const dynamic = "force-dynamic";

const DAEMON_URL =
  process.env.ARUTLEE_ASSISTANT_DAEMON_URL?.trim() ||
  "http://127.0.0.1:4331";

export async function POST(req: NextRequest) {
  let body: AssistantChatInput;
  try {
    body = (await req.json()) as AssistantChatInput;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const daemon = await tryDaemon(body);
  if (daemon) return NextResponse.json(daemon);

  const response = await assistantChat(body, { daemon: false });
  return NextResponse.json(response);
}

async function tryDaemon(
  body: AssistantChatInput,
): Promise<AssistantChatResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(`${DAEMON_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as AssistantChatResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
