import assert from "node:assert/strict";
import { moveTemplatePosition, normalizeTemplatePosition } from "./templatePosition";

assert.deepEqual(
  moveTemplatePosition({ x: 0, y: 0 }, { x: 48, y: 32 }),
  { x: 48, y: 32 },
  "dragging must change the selected element's position",
);

assert.deepEqual(
  moveTemplatePosition({ x: 140, y: 170 }, { x: 80, y: 80 }),
  { x: 160, y: 180 },
  "movement must stay inside the safe template bounds",
);

assert.deepEqual(
  normalizeTemplatePosition({ x: Number.NaN, y: -240 }),
  { x: 0, y: -180 },
  "invalid coordinates must recover safely",
);
