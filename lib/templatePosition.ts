export type TemplateElementPosition = {
  x: number;
  y: number;
};

const HORIZONTAL_LIMIT = 160;
const VERTICAL_LIMIT = 180;

function finite(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeTemplatePosition(position: TemplateElementPosition): TemplateElementPosition {
  return {
    x: Math.round(clamp(finite(position.x), -HORIZONTAL_LIMIT, HORIZONTAL_LIMIT)),
    y: Math.round(clamp(finite(position.y), -VERTICAL_LIMIT, VERTICAL_LIMIT)),
  };
}

export function moveTemplatePosition(
  origin: TemplateElementPosition,
  delta: TemplateElementPosition,
): TemplateElementPosition {
  return normalizeTemplatePosition({
    x: finite(origin.x) + finite(delta.x),
    y: finite(origin.y) + finite(delta.y),
  });
}
