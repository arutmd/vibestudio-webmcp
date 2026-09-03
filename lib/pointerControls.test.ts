import assert from "node:assert/strict";
import { pointerButtonsMask, pointerGestureAction } from "./pointerControls";

assert.equal(pointerGestureAction("right", 2), "point");
assert.equal(pointerGestureAction("right", 0), "dismiss");
assert.equal(pointerGestureAction("right", 1), "pass");
assert.equal(pointerButtonsMask("right"), 2);

assert.equal(pointerGestureAction("left", 0), "point");
assert.equal(pointerGestureAction("left", 0, true), "point");
assert.equal(pointerGestureAction("left", 2), "dismiss");
assert.equal(pointerGestureAction("left", 1), "pass");
assert.equal(pointerButtonsMask("left"), 1);

for (const interactiveTarget of [false, true]) {
  assert.equal(
    pointerGestureAction("right", 2, interactiveTarget),
    pointerGestureAction("left", 0, interactiveTarget),
    "the configured pointing button must behave identically after inversion",
  );
  assert.equal(
    pointerGestureAction("right", 0, interactiveTarget),
    pointerGestureAction("left", 2, interactiveTarget),
    "the configured dismiss button must behave identically after inversion",
  );
}
