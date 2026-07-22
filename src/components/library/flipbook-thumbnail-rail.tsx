"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { thumbnailGapBefore } from "./flipbook-spread";

// Horizontal jump-to-page strip shared by BookFlipbook and PdfFlipbook —
// each caller supplies its own per-page thumbnail render (a scaled dataURL
// <img> for PDF, a mini BookPage render for INTERACTIVE) since the two
// formats have no thumbnail representation in common.
//
// Spacing isn't uniform: two thumbnails that open together as one spread
// sit right next to each other (a hairline gap), while a bigger gap marks
// the boundary between spreads (and around the lone cover/back-cover) — so
// the rail visually communicates the same pairing you see on the page
// itself (see thumbnailGapBefore in flipbook-spread.ts).
export function FlipbookThumbnailRail({
  count,
  currentPage,
  onSelect,
  renderThumbnail,
}: {
  count: number;
  currentPage: number;
  onSelect: (index: number) => void;
  renderThumbnail: (index: number) => ReactNode;
}) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current[currentPage]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [currentPage]);

  if (count <= 1) return null;

  return (
    <div className="no-scrollbar flex w-full max-w-full items-start gap-0.5 overflow-x-auto px-4 py-1">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`Trang ${i + 1}`}
          aria-current={i === currentPage}
          className={`shrink-0 overflow-hidden rounded border transition-colors ${
            thumbnailGapBefore(i) ? "ml-2.5" : ""
          } ${i === currentPage ? "border-primary ring-2 ring-[var(--primary-border-strong)]" : "border-border hover:border-primary/50"}`}
        >
          {renderThumbnail(i)}
        </button>
      ))}
    </div>
  );
}
