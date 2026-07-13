"use client";

import { useEffect, useState, type RefObject } from "react";

const DESIRED_MAX_PAGE_WIDTH = 900;
const MIN_PAGE_WIDTH = 240;

// react-pageflip only keeps a single page per "leaf" while its container is
// narrower than 2x the configured page width — once the container is wide
// enough, it pairs pages into a left/right two-page spread instead (see
// calculateBoundsRect in page-flip's source: orientation flips to
// "landscape" whenever blockWidth >= 2 * width). These book/newsletter
// pages are each a standalone full-page design, never meant to be read as a
// spread, so instead of letting react-pageflip choose (which favors spreads
// on any desktop-width screen), we always solve for a page width that keeps
// the container under that threshold.
function solvePageWidth(containerWidth: number): number {
  const capped = Math.min(containerWidth, DESIRED_MAX_PAGE_WIDTH);
  const width = containerWidth > 2 * capped ? Math.ceil(containerWidth / 2) + 1 : capped;
  return Math.max(MIN_PAGE_WIDTH, Math.round(width));
}

// Tracks `containerRef`'s rendered width and resolves it to a single-page
// width for react-pageflip's `size="fixed"` mode. Rounded to the nearest 10px
// so ordinary sub-pixel resize churn doesn't force a remount — changing
// react-pageflip's width/size requires a full remount (its width/size props
// are only read once, at construction; see BookFlipbook/PdfFlipbook, which
// key the <HTMLFlipBook> on this value for that reason).
export function useFlipbookPageWidth(containerRef: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(500);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const containerWidth = entries[0]?.contentRect.width;
      if (!containerWidth) return;
      const rounded = Math.round(solvePageWidth(containerWidth) / 10) * 10;
      setWidth((prev) => (prev === rounded ? prev : rounded));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  return width;
}
