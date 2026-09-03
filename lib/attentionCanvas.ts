export type AttentionCanvasRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type AttentionCanvasElement = {
  width: number;
  height: number;
  style: {
    left: string;
    top: string;
    width: string;
    height: string;
  };
};

export function syncAttentionCanvas(
  canvas: AttentionCanvasElement,
  rect: AttentionCanvasRect,
  ratio: number,
): void {
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  canvas.style.left = `${rect.left}px`;
  canvas.style.top = `${rect.top}px`;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
}
