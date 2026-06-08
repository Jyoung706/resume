// ============================================
// ResizeHandle — 드래그 리사이즈 핸들
// Design Layer: props 기반 (로직 없음)
//
// 좌측/우측 사이드바 크기 조절용 범용 핸들
// mousedown → mousemove로 delta 전달 → 부모가 width 조절
// ============================================

import { useCallback } from "react";
import clsx from "clsx";
import "./ResizeHandle.scss";

// ============================================
// Props
// ============================================

export interface ResizeHandleProps {
  /** 리사이즈 방향 */
  direction?: "horizontal" | "vertical";
  /** 드래그 중 delta(px) 전달 — 매 mousemove마다 호출 */
  onResize: (delta: number) => void;
  /** 드래그 종료 시 호출 */
  onResizeEnd?: () => void;
  className?: string;
}

// ============================================
// ResizeHandle
// ============================================

export function ResizeHandle({
  direction = "horizontal",
  onResize,
  onResizeEnd,
  className,
}: ResizeHandleProps) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startPos = direction === "horizontal" ? e.clientX : e.clientY;
      let lastPos = startPos;

      const onMouseMove = (ev: MouseEvent) => {
        const currentPos = direction === "horizontal" ? ev.clientX : ev.clientY;
        const delta = currentPos - lastPos;
        lastPos = currentPos;
        onResize(delta);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        onResizeEnd?.();
      };

      document.body.style.cursor =
        direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [direction, onResize, onResizeEnd],
  );

  return (
    <div
      className={clsx(
        "ResizeHandle",
        `ResizeHandle--${direction}`,
        className,
      )}
      onMouseDown={handleMouseDown}
    />
  );
}
