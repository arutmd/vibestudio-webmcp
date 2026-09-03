// Cariva / Vein firewall — the asymmetric filter from 01-executive-summary.md.
// False negatives (skipping a borderline post that would have been fine) are
// cheap. False positives (publishing something that crosses the line) are not.
// Default to block on any direct keyword hit; warn on origin-context drift.

export type FirewallHit = {
  severity: "block" | "warn";
  reason: string;
  excerpt?: string;
};

// Direct product / company / customer / internal-artifact references.
const HARD_KEYWORDS = [
  "vein-app",
  "vein hq",
  "vein-hq",
  "vein.healthcare",
  "vein platform",
  "vein dashboard",
  "vein onboarding",
  "vein backoffice",
  "cariva",
  "samitivej",
  "ama-summary",
  "ama summary",
  "icd10",
  "icd-10 chatbot",
  "asr opd",
  "opd-c_",
  "mor-asr",
  "yoku-qc",
  "onglove qc",
];

// Origin-context drift patterns. These don't necessarily name Vein/Cariva but
// the only way the author would know them is from those work contexts.
const SOFT_PATTERNS = [
  /hospital chatbot/i,
  /clinical (?:asr|chatbot|llm)/i,
  /grading\s+\d+\s+chatbot/i,
  /opd[- ]?c\s*\d+/i,
  /our (?:hospital|clinic|company)['']?s/i,
  /my (?:startup|company)['']?s (?:internal|proprietary)/i,
];

export function runFirewall(text: string): FirewallHit[] {
  const hits: FirewallHit[] = [];
  if (!text) return hits;
  const lower = text.toLowerCase();

  for (const kw of HARD_KEYWORDS) {
    if (lower.includes(kw)) {
      hits.push({
        severity: "block",
        reason: `Hard keyword "${kw}" — Vein / Cariva firewall.`,
        excerpt: kw,
      });
    }
  }

  for (const pat of SOFT_PATTERNS) {
    const m = text.match(pat);
    if (m) {
      hits.push({
        severity: "warn",
        reason: `Origin-context drift near "${m[0]}". Default to skip unless explicitly reframed.`,
        excerpt: m[0],
      });
    }
  }

  return hits;
}

export function firewallVerdict(hits: FirewallHit[]): "pass" | "fail" | "near_miss" {
  if (hits.some((h) => h.severity === "block")) return "fail";
  if (hits.some((h) => h.severity === "warn")) return "near_miss";
  return "pass";
}
