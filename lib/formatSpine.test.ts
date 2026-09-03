import { strict as assert } from "node:assert";
import { spineFor, splitBody, joinBody } from "./formatSpine";

// spine lookup
assert.deepEqual(spineFor("field_note").map((s) => s.label), ["Hook", "Body", "Caveat"]);
assert.deepEqual(spineFor("casefile_opd").map((s) => s.label), ["CC", "PI", "PH", "PE", "IX", "TX"]);
assert.deepEqual(spineFor("casefile").map((s) => s.label), ["CC", "PI", "PH", "PE", "IX", "TX"]); // legacy alias
assert.deepEqual(spineFor("casefile_ipd").map((s) => s.label), ["S", "O", "A", "P"]);
assert.deepEqual(spineFor("filter").map((s) => s.label), ["Setup", "Filter", "Decision"]);
assert.deepEqual(spineFor("anchor").map((s) => s.label), ["Hook", "Body", "Receipts"]);
assert.deepEqual(spineFor("threads_card").map((s) => s.label), ["Quote"]);
assert.deepEqual(spineFor("experiment").map((s) => s.label), ["Body"]);

// split: headers route content to sections
const spine = spineFor("field_note");
const body = "## Hook\nthe hook line\n\n## Body\nmain text\n\n## Caveat\nsmall print";
const parts = splitBody(body, spine);
assert.equal(parts.hook.trim(), "the hook line");
assert.equal(parts.body.trim(), "main text");
assert.equal(parts.caveat.trim(), "small print");

// split: headerless legacy body lands in the first section, nothing lost
const legacy = splitBody("just one blob of text", spine);
assert.equal(legacy.hook.trim(), "just one blob of text");
assert.equal(legacy.body, "");

// join: roundtrip reproduces headered markdown
const joined = joinBody(parts, spine);
assert.ok(joined.includes("## Hook"));
assert.ok(joined.includes("## Caveat"));
assert.deepEqual(splitBody(joined, spine), parts);

console.log("formatSpine.test.ts ok");
