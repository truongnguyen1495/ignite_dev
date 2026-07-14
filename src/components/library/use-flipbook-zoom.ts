"use client";

import { useRef, useState, type PointerEvent } from "react";

const ZOOM_SCALE = 1.8;

// Toggleable magnifier zoom for the flipbook reader: click to zoom in at a
// fixed scale, drag to pan around the zoomed spread, click again to reset.
// While zoomed, page-turning is intentionally frozen — the caller renders a
// pointer-capturing overlay (using overlayHandlers) on top of the flipbook
// so drags pan instead of accidentally flipping a page.
export function useFlipbookZoom() {
  const [zoomed, setZoomed] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  function toggleZoom() {
    setZoomed((z) => !z);
    setPan({ x: 0, y: 0 });
  }

  function clampPan(next: { x: number; y: number }) {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return next;
    const maxX = (rect.width * (ZOOM_SCALE - 1)) / 2;
    const maxY = (rect.height * (ZOOM_SCALE - 1)) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan(clampPan({ x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy }));
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return {
    zoomed,
    toggleZoom,
    wrapperRef,
    transform: zoomed ? `translate(${pan.x}px, ${pan.y}px) scale(${ZOOM_SCALE})` : undefined,
    transition: draggingRef.current ? "none" : "transform 0.2s ease",
    overlayHandlers: zoomed
      ? {
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: handlePointerUp,
          onPointerLeave: handlePointerUp,
        }
      : null,
  };
}
