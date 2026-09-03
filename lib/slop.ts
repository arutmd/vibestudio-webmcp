// Rule-based slop test. Mirrors the indicator list in 17-no-slop-test.md.
// This is the deterministic first pass; the AI firewall in /api/ai/firewall
// adds qualitative judgment on top, but every fail here is binary and final.

export type SlopHit = {
  category:
    | "vocab"
    | "claims"
    | "structure"
    | "voice"
    | "ai_tells"
    | "visuals"
    | "origin";
  severity: "block" | "warn";
  message: string;
  excerpt?: string;
};

// Every banned phrase is from 03-content-pillars-and-series.md "Don't" list +
// 17-no-slop-test.md AI-vocabulary tells. Each entry is matched as a regex
// with word boundaries so legitimate uses inside Thai loanwords or quoted
// references don't trip the gate. Phrases that contain non-word characters
// (`'s`, `=`, `-`) get a custom regex.
const BANNED_PATTERNS: { phrase: string; re: RegExp }[] = [
  { phrase: "game changer", re: /\bgame[- ]?changer\b/i },
  { phrase: "10x your", re: /\b10\s*x\s+your\b/i },
  { phrase: "10x productivity", re: /\b10\s*x\s+productivity\b/i },
  { phrase: "ai is the future", re: /\bai is the future\b/i },
  { phrase: "the future is here", re: /\bthe future is here\b/i },
  { phrase: "delve", re: /\bdelve\b/i },
  { phrase: "crucial", re: /\bcrucial\b/i },
  { phrase: "comprehensive", re: /\bcomprehensive\b/i },
  { phrase: "robust", re: /\brobust\b/i },
  { phrase: "nuanced", re: /\bnuanced\b/i },
  { phrase: "multifaceted", re: /\bmultifaceted\b/i },
  { phrase: "furthermore", re: /\bfurthermore\b/i },
  { phrase: "moreover", re: /\bmoreover\b/i },
  { phrase: "here's the kicker", re: /here['’]s the kicker/i },
  { phrase: "here's the thing", re: /here['’]s the thing/i },
  { phrase: "let me break this down", re: /\blet me break this down\b/i },
  { phrase: "the bottom line", re: /\bthe bottom line\b/i },
  { phrase: "mind = blown", re: /mind\s*=\s*blown/i },
  { phrase: "mind-blown", re: /\bmind[- ]blown\b/i },
  { phrase: "save thousands", re: /\bsave thousands\b/i },
  { phrase: "this will change everything", re: /\bthis will change everything\b/i },
  { phrase: "just a small thought", re: /\bjust a small thought\b/i },
  { phrase: "i'm not an expert but", re: /i['’]m not an expert but/i },
];

// Embellishment claims that require Palm-personal verification. Allowed only if
// the post explicitly cites a source Palm has personally validated.
// AI-smell phrases Palm explicitly rejected (2026-06-10) as "stupid and
// AI-generated" during the Claude Fable 5 explainer rewrite. Hard block,
// same as BANNED_PATTERNS, but kept separate so the list stays auditable
// against that feedback.
const AI_SMELL_PATTERNS: { phrase: string; re: RegExp }[] = [
  { phrase: "production primitive", re: /\bproduction primitives?\b/i },
  { phrase: "demo toy", re: /\bdemo toys?\b/i },
  { phrase: "operator lens", re: /\boperator lens\b/i },
  { phrase: "builder's lens", re: /\bbuilder['’]s lens\b/i },
  { phrase: "agent signal", re: /\bagent signals?\b/i },
  {
    phrase: "serious software engineering worker",
    re: /\bserious software engineering workers?\b/i,
  },
  { phrase: "company-reported claim", re: /\bcompany[- ]reported claims?\b/i },
];

const EMBELLISHMENT_PATTERNS = [
  /near[- ]?zero hallucination/i,
  /infinite[- ]?like context/i,
  /infinite context/i,
  /(replace|replacing) (all|every) jobs?/i,
  /\b1\s*B\+?\s*(views|impressions)\b/i,
  /\b\d{2,}x\s+(faster|better|smarter|cheaper)\b/i,
];

const EMOJI = /\p{Extended_Pictographic}/gu;

export function runSlopTest(text: string): SlopHit[] {
  const hits: SlopHit[] = [];
  if (!text) return hits;

  // Em-dashes — banned anywhere by feedback_no_em_dash.md.
  if (text.includes("—") || text.includes("–")) {
    hits.push({
      category: "voice",
      severity: "block",
      message: "Em-dash or en-dash found. Use commas, semicolons, parens, or hyphens.",
    });
  }

  // Strip fenced code blocks and inline code so quoted snippets don't trip
  // the vocab gate. The remaining prose is what gets scanned.
  const prose = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ");
  for (const { phrase, re } of BANNED_PATTERNS) {
    if (re.test(prose)) {
      hits.push({
        category: "vocab",
        severity: "block",
        message: `Banned phrase: "${phrase}" (see 17-no-slop-test.md AI-vocabulary tells).`,
      });
    }
  }

  for (const { phrase, re } of AI_SMELL_PATTERNS) {
    if (re.test(prose)) {
      hits.push({
        category: "ai_tells",
        severity: "block",
        message: `AI-smell phrase: "${phrase}" (rejected by Palm, 2026-06-10).`,
      });
    }
  }

  for (const pat of EMBELLISHMENT_PATTERNS) {
    const m = text.match(pat);
    if (m) {
      hits.push({
        category: "claims",
        severity: "block",
        message: `Embellishment: "${m[0]}". Either remove or verify with a source.`,
        excerpt: m[0],
      });
    }
  }

  // Emoji walls: 4+ emojis in a row OR > 6 emojis total in a short post.
  const emojis = text.match(EMOJI) ?? [];
  if (emojis.length > 6 && text.length < 600) {
    hits.push({
      category: "structure",
      severity: "block",
      message: `${emojis.length} emojis in a short post reads as templated wall.`,
    });
  }
  // Run-of-emojis pattern.
  if (/(\p{Extended_Pictographic}\s*){4,}/u.test(text)) {
    hits.push({
      category: "structure",
      severity: "block",
      message: "Emoji wall detected (4+ in a row).",
    });
  }

  // Listicle without position-taking: a >= 5-bullet list with no "this matters
  // / this is overrated" reasoning. We approximate by looking for a list of
  // bullets and the absence of any opinion verbs.
  const bullets = text.match(/^[\s]*[-*]\s+/gm) ?? [];
  const positionVerbs = /\b(matters|overrated|skip|underrated|ignore|wrong|right|better|worse|prefer|hate|love|breaks|fails|broken)\b/i;
  if (bullets.length >= 5 && !positionVerbs.test(text)) {
    hits.push({
      category: "structure",
      severity: "warn",
      message: "Listicle without a position. Compress or take a side.",
    });
  }

  // Generic AI-creator section structure.
  if (/✨\s*Feature breakdown|🌟\s*Why this matters|👇\s*Link in comments?/i.test(text)) {
    hits.push({
      category: "structure",
      severity: "block",
      message: "Templated AI-creator section structure detected.",
    });
  }

  // ChatGPT-default voice: "I'd be happy to ...", "Certainly!", "As an AI ..."
  if (/\b(as an ai|i('|'')d be happy to|certainly!|in conclusion,)\b/i.test(text)) {
    hits.push({
      category: "ai_tells",
      severity: "block",
      message: "ChatGPT-default phrasing detected.",
    });
  }

  return hits;
}

export function slopVerdict(hits: SlopHit[]): "pass" | "fail" | "near_miss" {
  if (hits.some((h) => h.severity === "block")) return "fail";
  if (hits.some((h) => h.severity === "warn")) return "near_miss";
  return "pass";
}
