import { strict as assert } from "node:assert";
import { runSlopTest, slopVerdict } from "./slop";

// AI-smell phrases Palm explicitly rejected (2026-06-10). Every one must be
// a binary block, category ai_tells, and fail the verdict.
const rejected = [
  "production primitive",
  "demo toy",
  "operator lens",
  "builder's lens",
  "agent signal",
  "serious software engineering worker",
  "company-reported claim",
];

for (const phrase of rejected) {
  const hits = runSlopTest(`Fable 5 looks like a ${phrase} to me.`);
  const smell = hits.filter((h) => h.category === "ai_tells");
  assert.ok(smell.length > 0, `expected ai_tells hit for "${phrase}"`);
  assert.equal(smell[0].severity, "block", `expected block for "${phrase}"`);
  assert.equal(slopVerdict(hits), "fail", `expected fail verdict for "${phrase}"`);
}

// Curly-apostrophe variant.
assert.ok(
  runSlopTest("Through a builder’s lens, this is big.").some(
    (h) => h.category === "ai_tells" && h.severity === "block",
  ),
  "expected block for curly-apostrophe builder’s lens",
);

// Plural variants.
{
  const smell = runSlopTest("These are production primitives, not demo toys.").filter(
    (h) => h.category === "ai_tells",
  );
  assert.ok(smell.length >= 2, "expected both plural phrases to hit");
}

// Unhyphenated variant.
assert.ok(
  runSlopTest("That is a company reported claim.").some(
    (h) => h.category === "ai_tells" && h.severity === "block",
  ),
  "expected block for unhyphenated company reported claim",
);

// Quoted code must not trip the gate.
assert.equal(
  runSlopTest('ดู config ตรงนี้ `mode: "production primitive"` แล้วค่อยคุยกัน').filter(
    (h) => h.category === "ai_tells",
  ).length,
  0,
  "inline code should not trip the AI-smell gate",
);

// Clean selective-explainer copy passes.
assert.equal(
  slopVerdict(
    runSlopTest(
      "Fable 5 ทำคะแนนสูงสุดใน FrontierCode แม้ใช้แค่ medium effort. ผมยังไม่รีบเชื่อเลขนี้เต็มร้อยนะ",
    ),
  ),
  "pass",
  "clean copy should pass",
);

console.log("slop.test.ts ok");
