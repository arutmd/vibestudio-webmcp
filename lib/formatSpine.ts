import type { PieceFormat } from "./types";

export type SpineSection = {
  key: string;        // stable key, lowercase
  label: string;      // header label used in markdown and the UI
  placeholder: string;
};

const SPINES: Record<string, SpineSection[]> = {
  field_note: [
    { key: "hook", label: "Hook", placeholder: "The one line that earns the read" },
    { key: "body", label: "Body", placeholder: "What happened, concretely" },
    { key: "caveat", label: "Caveat", placeholder: "What this does not prove" },
  ],
  casefile_opd: [
    { key: "cc", label: "CC", placeholder: "Chief complaint" },
    { key: "pi", label: "PI", placeholder: "Present illness" },
    { key: "ph", label: "PH", placeholder: "Past history" },
    { key: "pe", label: "PE", placeholder: "Examination" },
    { key: "ix", label: "IX", placeholder: "Investigations" },
    { key: "tx", label: "TX", placeholder: "Treatment / takeaway" },
  ],
  casefile_ipd: [
    { key: "s", label: "S", placeholder: "Subjective" },
    { key: "o", label: "O", placeholder: "Objective" },
    { key: "a", label: "A", placeholder: "Assessment" },
    { key: "p", label: "P", placeholder: "Plan" },
  ],
  filter: [
    { key: "setup", label: "Setup", placeholder: "The flood of options" },
    { key: "filter", label: "Filter", placeholder: "The rule that cuts it down" },
    { key: "decision", label: "Decision", placeholder: "What survived and why" },
  ],
  anchor: [
    { key: "hook", label: "Hook", placeholder: "The claim" },
    { key: "body", label: "Body", placeholder: "The argument" },
    { key: "receipts", label: "Receipts", placeholder: "Numbers, dates, sources" },
  ],
  threads_card: [{ key: "quote", label: "Quote", placeholder: "One line, no fluff" }],
  experiment: [{ key: "body", label: "Body", placeholder: "Freeform" }],
};

export function spineFor(format: PieceFormat): SpineSection[] {
  if (format === "casefile") return SPINES.casefile_opd; // legacy alias
  return SPINES[format] ?? SPINES.experiment;
}

/** Split a markdown blob into spine parts by `## Label` headers.
 *  Content before the first known header goes to the first section. */
export function splitBody(body: string, spine: SpineSection[]): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const s of spine) parts[s.key] = "";
  const labelToKey = new Map(spine.map((s) => [s.label.toLowerCase(), s.key]));
  let currentKey = spine[0].key;
  for (const line of body.split("\n")) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    const key = m ? labelToKey.get(m[1].toLowerCase()) : undefined;
    if (key) {
      currentKey = key;
      continue;
    }
    parts[currentKey] += (parts[currentKey] ? "\n" : "") + line;
  }
  for (const k of Object.keys(parts)) parts[k] = parts[k].replace(/^\n+|\n+$/g, "");
  return parts;
}

/** Join spine parts back into one markdown blob with `##` headers.
 *  Empty sections are omitted so saved bodies stay clean. */
export function joinBody(parts: Record<string, string>, spine: SpineSection[]): string {
  return spine
    .filter((s) => (parts[s.key] ?? "").trim() !== "")
    .map((s) => `## ${s.label}\n${parts[s.key].trim()}`)
    .join("\n\n");
}
