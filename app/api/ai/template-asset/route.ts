import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const asset = form?.get("asset");
  if (!(asset instanceof File) || asset.size === 0) {
    return NextResponse.json({ error: "image asset required" }, { status: 400 });
  }
  if (asset.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "image asset must be 12MB or smaller" }, { status: 400 });
  }
  if (!/^image\/(png|jpeg|webp)$/.test(asset.type)) {
    return NextResponse.json({ error: "asset must be a PNG, JPEG, or WebP image" }, { status: 400 });
  }

  const extension = path.extname(asset.name).toLowerCase().match(/^\.(png|jpe?g|webp)$/)?.[0] || ".png";
  const filename = `asset-${Date.now()}${extension}`;
  const outputDir = path.join(process.cwd(), "public", "template-studio", "uploads");
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, filename), Buffer.from(await asset.arrayBuffer()));

  return NextResponse.json({
    ok: true,
    name: asset.name.slice(0, 180),
    path: `/template-studio/uploads/${filename}`,
  });
}
