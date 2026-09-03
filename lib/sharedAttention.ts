export type SharedAttentionKind = "inspiration" | "memory" | "slide" | "text" | "annotation";

export type SharedAttentionSurface = "inspire" | "piece" | "schedule" | "template";

export type SharedAttentionPoint = {
  x: number;
  y: number;
};

export type SharedAttentionGeometry = {
  surface: SharedAttentionSurface;
  mode: "point" | "drawing";
  points: SharedAttentionPoint[];
};

export type SharedAttentionRole = "change" | "reference" | "compare" | "preserve";

export type SharedAttentionRange = {
  field: string;
  start: number;
  end: number;
};

export type SharedAttentionSelection = {
  key: string;
  kind: SharedAttentionKind;
  entityId: string;
  parentId?: string;
  label: string;
  preview: string;
  role: SharedAttentionRole;
  version?: number;
  range?: SharedAttentionRange;
  geometry?: SharedAttentionGeometry;
};

export const SHARED_ATTENTION_LIMIT = 12;

export function toggleSharedAttention(
  current: SharedAttentionSelection[],
  incoming: SharedAttentionSelection,
  limit = SHARED_ATTENTION_LIMIT,
): SharedAttentionSelection[] {
  if (current.some((item) => item.key === incoming.key)) {
    return current.filter((item) => item.key !== incoming.key);
  }
  if (current.length >= limit) return current;
  return [...current, incoming];
}

export function addSharedAttention(
  current: SharedAttentionSelection[],
  incoming: SharedAttentionSelection,
  limit = SHARED_ATTENTION_LIMIT,
): SharedAttentionSelection[] {
  const index = current.findIndex((item) => item.key === incoming.key);
  if (index >= 0) return current.map((item, itemIndex) => itemIndex === index ? incoming : item);
  if (current.length >= limit) return current;
  return [...current, incoming];
}

export function setSharedAttentionRole(
  current: SharedAttentionSelection[],
  key: string,
  role: SharedAttentionRole,
): SharedAttentionSelection[] {
  return current.map((item) => item.key === key ? { ...item, role } : item);
}

export function dismissAttentionAnnotations(
  current: SharedAttentionSelection[],
): SharedAttentionSelection[] {
  return current.filter((item) => item.kind !== "annotation");
}

export function selectedTextRange(element: HTMLElement): SharedAttentionRange & { text: string } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!element.contains(range.commonAncestorContainer)) return null;

  const before = range.cloneRange();
  before.selectNodeContents(element);
  before.setEnd(range.startContainer, range.startOffset);
  const text = selection.toString().trim();
  if (!text) return null;
  const start = before.toString().length;
  return { field: element.dataset.attentionField ?? "text", start, end: start + selection.toString().length, text };
}
