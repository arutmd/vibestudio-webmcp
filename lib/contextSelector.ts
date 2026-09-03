import type { BrainCategory, BrainRecord, ContextPurpose, InspirationRecord } from "./types";

const ALWAYS: readonly BrainCategory[] = ["identity", "audience", "content_goal"];
const PROCEDURE: readonly BrainCategory[] = ["voice", "production_rule"];

function words(value: string): Set<string> {
  return new Set(
    value
      .toLocaleLowerCase()
      .split(/[^\p{L}\p{N}_-]+/u)
      .map((word) => word.trim())
      .filter((word) => word.length >= 3),
  );
}

function relevance(
  record: BrainRecord,
  inspiration: InspirationRecord | null,
  pieceId: string | null,
): number {
  if (pieceId && record.source_id === pieceId) return 120;
  if (!inspiration) return 0;
  if (record.source_id === inspiration.id) return 100;
  const sourceWords = words(
    [inspiration.title, inspiration.caption, inspiration.saved_reason, inspiration.reaction_note].join(" "),
  );
  let score = 0;
  for (const token of [...record.tags, ...words(record.text)]) {
    if (sourceWords.has(token.toLocaleLowerCase())) score += 1;
  }
  return score;
}

function takeCategory(records: BrainRecord[], category: BrainCategory, max: number): BrainRecord[] {
  return records.filter((record) => record.category === category).slice(0, max);
}

export function selectBrainContext(input: {
  records: BrainRecord[];
  inspiration: InspirationRecord | null;
  purpose: ContextPurpose;
  pieceId?: string | null;
}): { selected: BrainRecord[]; examples: BrainRecord[]; summary: string } {
  const active = input.records.filter((record) => record.status === "active");
  const selected: BrainRecord[] = [];
  for (const category of ALWAYS) selected.push(...takeCategory(active, category, 2));
  for (const category of PROCEDURE) selected.push(...takeCategory(active, category, 3));

  const taste = active
    .filter((record) => record.category === "visual_taste" || record.category === "learning")
    .map((record) => ({
      record,
      score: relevance(record, input.inspiration, input.pieceId ?? null),
    }))
    .sort((a, b) => b.score - a.score || b.record.created_at.localeCompare(a.record.created_at))
    .slice(0, 2)
    .map(({ record }) => record);
  selected.push(...taste);

  const examples = active
    .filter((record) => record.category === "example" && record.source_type === "published_example")
    .slice(0, 2);
  selected.push(...examples);

  const unique = [...new Map(selected.map((record) => [record.id, record])).values()];
  const labels: Record<BrainCategory, string> = {
    identity: "Identity",
    audience: "Audience",
    voice: "Voice",
    visual_taste: "Taste",
    content_goal: "Goal",
    production_rule: "Rules",
    example: "Example",
    learning: "Learning",
  };
  // The compact agent packet must preserve the relevant taste or learning and
  // its purpose instead of blindly slicing them off after long identity text.
  const summaryOrder = [
    ...unique.filter((record) => ALWAYS.includes(record.category)),
    ...unique.filter((record) => record.category === "visual_taste" || record.category === "learning"),
    ...unique.filter((record) => PROCEDURE.includes(record.category)),
    ...unique.filter((record) => record.category === "example"),
  ];
  const compact = (value: string, max = 86) =>
    value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
  const lines = summaryOrder.map(
    (record) => `${labels[record.category]}: ${compact(record.text)}`,
  );
  const tail: string[] = [];
  if (input.inspiration) {
    tail.push(
      `Source reaction: ${compact(
        `${input.inspiration.reaction}${input.inspiration.reaction_note ? ` — ${input.inspiration.reaction_note}` : ""}`,
        150,
      )}`,
    );
  }
  tail.push(
    input.purpose === "session_create"
      ? "Purpose: session_create. Use carousel-v1. Start from the creator brief and preserve these Template rules throughout the Session."
      : `Purpose: ${input.purpose}. Use carousel-v1. Transform the source; do not imitate it.`,
  );
  const tailText = tail.join("\n");
  const bodyBudget = 1500 - tailText.length - 1;
  const bodyLines: string[] = [];
  let bodyLength = 0;
  for (const line of lines) {
    const nextLength = bodyLength + (bodyLines.length ? 1 : 0) + line.length;
    if (nextLength > bodyBudget) break;
    bodyLines.push(line);
    bodyLength = nextLength;
  }
  const summary = [...bodyLines, ...tail].join("\n");
  return { selected: unique, examples, summary };
}
