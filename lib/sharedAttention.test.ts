import {
  addSharedAttention,
  dismissAttentionAnnotations,
  setSharedAttentionRole,
  toggleSharedAttention,
  type SharedAttentionSelection,
} from "./sharedAttention";

const slide: SharedAttentionSelection = {
  key: "slide:piece-1:2",
  kind: "slide",
  entityId: "piece-1:2",
  parentId: "piece-1",
  label: "Slide 2",
  preview: "A precise second slide",
  role: "change",
  version: 3,
};

const added = toggleSharedAttention([], slide);
if (added.length !== 1 || added[0]?.key !== slide.key) throw new Error("selection was not added");
if (toggleSharedAttention(added, slide).length !== 0) throw new Error("selection was not removed");

const replaced = addSharedAttention(added, { ...slide, preview: "Updated snapshot", version: 4 });
if (replaced.length !== 1 || replaced[0]?.version !== 4) throw new Error("selection snapshot was not refreshed");

const referenced = setSharedAttentionRole(replaced, slide.key, "reference");
if (referenced[0]?.role !== "reference") throw new Error("selection role was not updated");

const blocked = toggleSharedAttention(added, { ...slide, key: "memory:1", kind: "memory" }, 1);
if (blocked.length !== 1) throw new Error("selection limit was not enforced");

const annotation: SharedAttentionSelection = {
  key: "annotation:inspire:1",
  kind: "annotation",
  entityId: "inspire:1",
  label: "Point on Inspire",
  preview: "A temporary pointer",
  role: "reference",
};
const dismissed = dismissAttentionAnnotations([slide, annotation]);
if (dismissed.length !== 1 || dismissed[0]?.key !== slide.key) {
  throw new Error("left-click dismissal must remove annotations but preserve saved references");
}
