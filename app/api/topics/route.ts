import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { FILES } from "@/lib/paths";
import type { Topic } from "@/lib/types";

export const dynamic = "force-dynamic";

// Parse the seed-topics list out of 03-content-pillars-and-series.md so the
// studio always reflects the canonical doc. Topics live as numbered list items
// of shape: "1. **Title.** *(format-tags)* description..."
//
// Stop conditions inside the seed-topics block:
//   - the next h2 ("## something else") ends the section.
//   - any h3 ("### Production order" / "### Sub") inside the seed-topics block
//     stops topic *accumulation* (sub-section text shouldn't be appended to a
//     topic) but does NOT terminate the parser. This way, if a future doc has
//     "### Production order" then "### More topics", the parser keeps looking
//     for h2 to terminate.

function parseTopics(md: string): Topic[] {
  const out: Topic[] = [];
  const lines = md.split("\n");
  let inSeed = false;
  let suspended = false; // we're inside an h3 sub-section — skip until next h3 or h2
  let buffer: string[] = [];
  let currentNumber = 0;

  const flush = () => {
    if (!currentNumber || buffer.length === 0) return;
    const text = buffer.join(" ").trim();
    const titleMatch = text.match(/\*\*([^*]+)\*\*/);
    const title = titleMatch?.[1]?.trim() ?? text.slice(0, 80);
    const tagsMatch = text.match(/\*\(([^)]+)\)\*/);
    const formatTags = tagsMatch
      ? tagsMatch[1].split(/[,/]/).map((s) => s.trim()).filter(Boolean)
      : [];
    const stripped = text
      .replace(/\*\*([^*]+)\*\*/, "")
      .replace(/\*\(([^)]+)\)\*/, "")
      .trim();
    out.push({
      id: `topic-${currentNumber}`,
      number: currentNumber,
      title: title.replace(/\.$/, ""),
      formatTags,
      notes: stripped.slice(0, 600),
    });
  };

  for (const line of lines) {
    if (/^##\s+Seed topics/i.test(line)) {
      inSeed = true;
      suspended = false;
      continue;
    }
    if (!inSeed) continue;

    // h2 terminates the seed-topics block.
    if (/^##\s/.test(line)) {
      flush();
      buffer = [];
      currentNumber = 0;
      break;
    }

    // h3 toggles a sub-section: lines belonging to it are ignored for topic
    // parsing. This lets "### Production order" coexist with future h3 peers
    // without prematurely breaking out.
    if (/^###\s/.test(line)) {
      flush();
      buffer = [];
      currentNumber = 0;
      suspended = true;
      continue;
    }

    if (suspended) continue;

    const m = line.match(/^(\d+)\.\s+(.*)$/);
    if (m) {
      flush();
      currentNumber = parseInt(m[1], 10);
      buffer = [m[2]];
    } else if (currentNumber > 0) {
      buffer.push(line.trim());
    }
  }
  // End-of-file flush in case the doc ends without a terminating h2.
  flush();

  // Deduplicate by `number` in case of ill-formed input.
  const seen = new Set<number>();
  return out.filter((t) => {
    if (seen.has(t.number)) return false;
    seen.add(t.number);
    return true;
  });
}

export async function GET() {
  try {
    const md = await fs.readFile(FILES.topicsDoc, "utf8");
    const topics = parseTopics(md);
    return NextResponse.json({ topics });
  } catch {
    return NextResponse.json({ topics: [] });
  }
}
