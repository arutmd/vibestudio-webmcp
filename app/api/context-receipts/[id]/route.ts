import { NextRequest, NextResponse } from "next/server";
import { findById } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type { ContextReceipt } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const receipt = await findById<ContextReceipt>(FILES.contextReceipts, id);
  if (!receipt) return NextResponse.json({ error: "context receipt not found" }, { status: 404 });
  return NextResponse.json({ record: receipt });
}
