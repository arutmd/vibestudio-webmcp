import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "components/creator/StudioShell.tsx"), "utf8");
const shellTag = source.match(/<main\s+[\s\S]*?\n\s*>/)?.[0] ?? "";
const workspaceTag = source.match(/<div className="creator-workspace"[\s\S]*?>/)?.[0] ?? "";

assert.match(
  shellTag,
  /onContextMenuCapture=/,
  "the full VibeStudio shell must own the native context-menu override",
);
assert.match(shellTag, /onPointerDownCapture=\{beginPointing\}/);
assert.match(shellTag, /onPointerMoveCapture=\{continuePointing\}/);
assert.match(shellTag, /onPointerUpCapture=\{finishPointing\}/);
assert.doesNotMatch(
  workspaceTag,
  /onContextMenu|onPointerDown|onPointerMove|onPointerUp/,
  "the gesture must not be limited to the central workspace",
);
