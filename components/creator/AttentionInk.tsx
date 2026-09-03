"use client";

import { useEffect, useRef } from "react";
import type {
  SharedAttentionGeometry,
  SharedAttentionSelection,
  SharedAttentionSurface,
} from "@/lib/sharedAttention";
import { syncAttentionCanvas } from "@/lib/attentionCanvas";

export function AttentionInk(props: {
  surface: SharedAttentionSurface;
  selections: SharedAttentionSelection[];
  draft: SharedAttentionGeometry | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const host = canvas.parentElement;
    if (!host) return;

    const draw = () => {
      const rect = host.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      syncAttentionCanvas(canvas, rect, ratio);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);
      context.lineCap = "round";
      context.lineJoin = "round";

      const drawings = props.selections
        .filter((item) => item.kind === "annotation" && item.geometry?.surface === props.surface)
        .map((item) => item.geometry as SharedAttentionGeometry);
      if (props.draft?.surface === props.surface) drawings.push(props.draft);

      for (const drawing of drawings) {
        const points = drawing.points.map((point) => ({ x: point.x * rect.width, y: point.y * rect.height }));
        if (!points.length) continue;
        context.strokeStyle = "rgba(255, 119, 94, 0.96)";
        context.fillStyle = "rgba(255, 119, 94, 0.2)";
        context.lineWidth = 3;
        context.shadowColor = "rgba(0, 0, 0, 0.35)";
        context.shadowBlur = 8;
        if (drawing.mode === "point" || points.length === 1) {
          context.beginPath();
          context.arc(points[0].x, points[0].y, 9, 0, Math.PI * 2);
          context.fill();
          context.stroke();
          context.beginPath();
          context.arc(points[0].x, points[0].y, 2.5, 0, Math.PI * 2);
          context.fillStyle = "rgba(255, 255, 255, 0.96)";
          context.fill();
          continue;
        }
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        for (const point of points.slice(1)) context.lineTo(point.x, point.y);
        context.stroke();
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(host);
    window.addEventListener("resize", draw);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [props.draft, props.selections, props.surface]);

  return <canvas ref={canvasRef} className="creator-attention-ink" aria-hidden="true" />;
}
