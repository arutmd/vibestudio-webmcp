import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { generateTemplateBackgroundWithCodex } from "@/lib/codexImage";
import {
  buildTemplateBackgroundPrompt,
  templateBackgroundCompositions,
  templateBackgroundVariabilities,
  type TemplateBackgroundComposition,
  type TemplateBackgroundVariability,
} from "@/lib/templateBackground";

export const dynamic = "force-dynamic";

function cleanDirection(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\b(render|write|add)\s+(thai|english)?\s*(headline|text|logo|watermark)s?\b/gi, "")
    .trim()
    .slice(0, 1800);
}

function isVariability(value: string): value is TemplateBackgroundVariability {
  return templateBackgroundVariabilities.includes(value as TemplateBackgroundVariability);
}

function isComposition(value: string): value is TemplateBackgroundComposition {
  return templateBackgroundCompositions.includes(value as TemplateBackgroundComposition);
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "valid form data required" }, { status: 400 });
  }

  const direction = cleanDirection(String(form.get("direction") || ""));
  if (!direction) {
    return NextResponse.json({ error: "generation direction required" }, { status: 400 });
  }

  const rawVariability = String(form.get("variability") || "balanced");
  const rawComposition = String(form.get("composition") || "quiet-top");
  if (!isVariability(rawVariability) || !isComposition(rawComposition)) {
    return NextResponse.json({ error: "invalid template generation settings" }, { status: 400 });
  }

  const reference = form.get("reference");
  const referenceUrl = String(form.get("referenceUrl") || "");
  let referencePath: string | undefined;
  let referenceName: string | undefined;
  if (reference instanceof File && reference.size > 0) {
    if (reference.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "reference image must be 12MB or smaller" }, { status: 400 });
    }
    if (!/^image\/(png|jpeg|webp)$/.test(reference.type)) {
      return NextResponse.json({ error: "reference must be a PNG, JPEG, or WebP image" }, { status: 400 });
    }
    referenceName = reference.name.slice(0, 180);
    const extension = path.extname(referenceName).toLowerCase().match(/^\.(png|jpe?g|webp)$/)?.[0] || ".png";
    const safeName = `reference-${Date.now()}${extension}`;
    const referenceDir = path.join(process.cwd(), "public", "template-studio", "references");
    await fs.mkdir(referenceDir, { recursive: true });
    referencePath = path.join(referenceDir, safeName);
    await fs.writeFile(referencePath, Buffer.from(await reference.arrayBuffer()));
  } else if (/^\/template-studio\/uploads\/asset-[a-zA-Z0-9._-]+$/.test(referenceUrl)) {
    const candidate = path.join(process.cwd(), "public", "template-studio", "uploads", path.basename(referenceUrl));
    const stat = await fs.stat(candidate).catch(() => null);
    if (stat?.isFile()) {
      referencePath = candidate;
      referenceName = path.basename(candidate);
    }
  }

  const prompt = buildTemplateBackgroundPrompt({
    direction,
    variability: rawVariability,
    composition: rawComposition,
    referenceName,
  });

  const result = await generateTemplateBackgroundWithCodex({
    prompt,
    headline: String(form.get("sampleHeadline") || "Reusable creator template"),
    referencePath,
  });

  if (!result.path) {
    return NextResponse.json(
      {
        error: result.timedOut
          ? "Image generation timed out before a sample was ready."
          : "Image generation did not produce a usable sample.",
        timedOut: result.timedOut,
        exitCode: result.exitCode,
        stderr: result.stderr.slice(-1200),
        stdout: result.stdout.slice(-1200),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    path: result.path,
    prompt: result.prompt,
    timedOut: result.timedOut,
    exitCode: result.exitCode,
  });
}
