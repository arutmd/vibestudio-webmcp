import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { PROJECT_ROOT } from "@/lib/paths";

export const dynamic = "force-dynamic";

// Serves project-relative files (e.g. pieces/<id>/hero-*.png) from inside the
// parent project root. Path-traversal protection: we resolve and assert the
// resolved absolute path stays under PROJECT_ROOT, and we only allow specific
// subdirectories that are expected to hold media.

const ALLOWED_PREFIXES = ["pieces/", "data/", "ingredients/", "Profile-Image/"];

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

export async function GET(req: NextRequest) {
  const rawPath = req.nextUrl.searchParams.get("path");
  if (!rawPath) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }
  if (!ALLOWED_PREFIXES.some((p) => rawPath.startsWith(p))) {
    return NextResponse.json({ error: "path not allowed" }, { status: 403 });
  }
  const resolved = path.resolve(PROJECT_ROOT, rawPath);
  if (!resolved.startsWith(PROJECT_ROOT + path.sep)) {
    return NextResponse.json({ error: "path traversal blocked" }, { status: 403 });
  }
  let buf: Buffer;
  try {
    buf = await fs.readFile(resolved);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    throw err;
  }
  const ext = path.extname(resolved).toLowerCase();
  const type = MIME[ext] ?? "application/octet-stream";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=60",
    },
  });
}
