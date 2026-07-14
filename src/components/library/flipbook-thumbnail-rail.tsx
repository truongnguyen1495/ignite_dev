"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Horizontal jump-to-page strip shared by BookFlipbook and PdfFlipbook —
// each caller supplies its own per-page thumbnail render (a scaled dataURL
// <img> for PDF, a mini BookPage render for INTERACTIVE) since the two
// formats have no thumbnail representation in common.
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
    <div className="flex w-full max-w-full gap-2 overflow-x-auto px-4 py-1">
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
            i === currentPage ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50"
          }`}
        >
          {renderThumbnail(i)}
        </button>
      ))}
    </div>
  );
}
