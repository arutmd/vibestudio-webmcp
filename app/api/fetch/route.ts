import { NextRequest, NextResponse } from "next/server";
import { extractFirstUrl } from "@/lib/capture";
import { fetchIngredientCapture } from "@/lib/fetchIngredients";

export const dynamic = "force-dynamic";

const MAX_TEXT_LEN = 220_000;

export async function POST(req: NextRequest) {
  let body: { text?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text && !body.url) {
    return NextResponse.json({ error: "text or url required" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LEN) {
    return NextResponse.json(
      { error: `source text exceeds ${MAX_TEXT_LEN} chars` },
      { status: 400 },
    );
  }

  const url = body.url || extractFirstUrl(text) || undefined;
  const result = await fetchIngredientCapture({ url, text });
  return NextResponse.json(result);
}
