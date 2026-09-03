import assert from "node:assert/strict";
import { syncAttentionCanvas } from "./attentionCanvas";

const canvas = {
  width: 0,
  height: 0,
  style: { left: "", top: "", width: "", height: "" },
};

syncAttentionCanvas(
  canvas,
  { left: 204, top: 0, width: 897.5, height: 1617.6 },
  1.616,
);

assert.deepEqual(
  canvas,
  {
    width: 1450,
    height: 2614,
    style: {
      left: "204px",
      top: "0px",
      width: "897.5px",
      height: "1617.6px",
    },
  },
  "the canvas bitmap may use device pixels, but its visible CSS box must exactly match the workspace",
);
