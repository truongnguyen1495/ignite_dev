"use client";

import { useEffect, useState } from "react";

const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 140;

// One hidden, shared measurer node (not one per element) — every call runs
// synchronously on the main thread (set styles, read scrollHeight/Width,
// done), so nothing ever interleaves two computations against it.
let measurerEl: HTMLDivElement | null = null;
function getMeasurer(): HTMLDivElement {
  if (measurerEl) return measurerEl;
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.visibility = "hidden";
  el.style.pointerEvents = "none";
  el.style.top = "-9999px";
  el.style.left = "-9999px";
  el.style.whiteSpace = "pre-wrap";
  el.style.wordBreak = "break-word";
  document.body.appendChild(el);
  measurerEl = el;
  return el;
}

// Binary search for the largest font size in [MIN_FONT_SIZE, MAX_FONT_SIZE]
// that renders `content` inside a box of `innerWidth`×`innerHeight` without
// overflowing either axis — the same "measure with a hidden clone" idea as
// AnchorDots' zoom compensation elsewhere in this feature, just solving for
// font size instead of screen scale.
function measureFit(content: string, innerWidth: number, innerHeight: number, fontFamily: string, bold: boolean): number {
  const el = getMeasurer();
  el.style.fontFamily = fontFamily;
  el.style.fontWeight = bold ? "700" : "400";
  el.style.width = innerWidth + "px";
  el.textContent = content || " ";
  let lo = MIN_FONT_SIZE;
  let hi = MAX_FONT_SIZE;
  let best = MIN_FONT_SIZE;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    el.style.fontSize = mid + "px";
    const fits = el.scrollHeight <= innerHeight && el.scrollWidth <= innerWidth + 1;
    if (fits) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

// Returns `fallback` (the element's own saved `fontSize`) unless `enabled`
// (autoFontSize) is on, in which case it returns the live fit-to-box size —
// recomputed whenever the box or the text itself changes, e.g. every resize
// tick. Callers pass the element's own inner padding (matches whatever
// WhiteboardElementRenderer's JSX actually applies) so the measured box
// matches the real rendered one exactly.
export function useAutoFitFontSize(params: {
  enabled: boolean;
  content: string;
  width: number;
  height: number;
  paddingX: number;
  paddingY: number;
  bold: boolean;
  fallback: number;
}): number {
  const { enabled, content, width, height, paddingX, paddingY, bold, fallback } = params;
  const [size, setSize] = useState(fallback);

  useEffect(() => {
    if (!enabled) return;
    const innerW = Math.max(1, width - paddingX);
    const innerH = Math.max(1, height - paddingY);
    const fontFamily = getComputedStyle(document.body).fontFamily;
    setSize(measureFit(content, innerW, innerH, fontFamily, bold));
  }, [enabled, content, width, height, paddingX, paddingY, bold]);

  return enabled ? size : fallback;
}
