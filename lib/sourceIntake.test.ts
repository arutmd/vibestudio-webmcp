import assert from "node:assert/strict";
import { coerceSourceIntake, parseSourceIntake } from "./sourceIntake";

const link = parseSourceIntake("https://youtube.com/@OpenAIDevs");
assert.equal(link.mode, "link");
assert.equal(link.platform, "youtube");
assert.equal(link.display_name, "OpenAIDevs");
assert.equal(link.profile_url, "https://youtube.com/@OpenAIDevs");

const text = parseSourceIntake("Follow Lenny's Podcast for product storytelling");
assert.equal(text.mode, "text");
assert.equal(text.display_name, "Lenny's Podcast");
assert.equal(text.profile_url, null);

const mixed = parseSourceIntake("https://instagram.com/fatherphi I like the calm visual explanations");
assert.equal(mixed.mode, "mixed");
assert.equal(mixed.platform, "instagram");
assert.match(mixed.note, /calm visual explanations/);

const coerced = coerceSourceIntake({
  platform: "tiktok",
  display_name: "A better name",
  handle: "@better name",
  profile_url: "https://invented.example",
  note: "Fast hooks",
}, "Follow a better name on TikTok");
assert.equal(coerced.platform, "tiktok");
assert.equal(coerced.profile_url, null, "the model must never invent a URL");
assert.equal(coerced.handle, "better-name");
