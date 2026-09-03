import { NextRequest, NextResponse } from "next/server";
import { deleteIngredientFolder } from "@/lib/ingredientFolder";
import { deleteById, findById, isValidId } from "@/lib/jsonl";
import { FILES } from "@/lib/paths";
import type { InboxRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const record = await findById<InboxRecord>(FILES.inbox, id);
  if (!record) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ record });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const existing = await findById<InboxRecord>(FILES.inbox, id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  await deleteIngredientFolder(existing.enrichment_path);
  const deleted = await deleteById<InboxRecord>(FILES.inbox, id);
  if (!deleted) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ deleted });
}
