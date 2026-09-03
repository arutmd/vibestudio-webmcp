import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { isValidId } from "@/lib/jsonl";
import { PIECES_DIR } from "@/lib/paths";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "expected multipart form-data" }, { status: 400 });
  }
  const pieceId = form.get("pieceId");
  const file = form.get("file");
  const variant = (form.get("variant") as string | null)?.trim() || "hero";

  if (typeof pieceId !== "string" || !isValidId(pieceId)) {
    return NextResponse.json({ error: "valid pieceId required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `unsupported type ${file.type}; allowed: ${[...ALLOWED_TYPES].join(", ")}` },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `file too large (${file.size} bytes; max ${MAX_BYTES})` },
      { status: 413 },
    );
  }
  if (!/^[a-z0-9-]+$/.test(variant) || variant.length > 32) {
    return NextResponse.json({ error: "invalid variant name" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = EXT_BY_TYPE[file.type] ?? "bin";
  const dir = path.join(PIECES_DIR, pieceId);
  // Add a short hash to bust browser caches when an upload replaces an
  // existing file with the same variant name.
  const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 8);
  const filename = `${variant}-${hash}.${ext}`;
  const fullPath = path.join(dir, filename);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(fullPath, buf);

  // Return a project-relative path so it round-trips through pieces.jsonl.
  const relative = `pieces/${pieceId}/${filename}`;
  return NextResponse.json({
    ok: true,
    path: relative,
    bytes: buf.length,
    type: file.type,
  });
}
