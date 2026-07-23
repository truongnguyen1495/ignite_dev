"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { BookPageData } from "@/lib/library-book-elements";
import { BookPage } from "@/components/library/book-page";

// Full-screen preview of the book as the READER renders it — literally the
// same BookPage component the flipbook uses (proven pixel-faithful to the
// design data by direct production measurement), fed the editor's live
// in-memory pages so UNSAVED changes show too. This exists because the
// editor canvas (600px design view) and the reader page (arbitrary scaled
// size) look different enough at a glance that the user believed the reader
// was mis-sizing blocks; a one-click true-render view answers that without
// leaving the editor. No page-flip engine here on purpose — the flip
// animation is cosmetic, and mounting react-pageflip costs remount/sizing
// complexity this modal doesn't need.
export function EditorPreview({
  pages,
  bookWidth,
  bookHeight,
  startIndex,
  onClose,
}: {
  pages: BookPageData[];
  bookWidth: number;
  bookHeight: number;
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(() => Math.min(startIndex, pages.length - 1));

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(pages.length - 1, i + 1));
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, pages.length]);

  const page = pages[index];
  if (!page) return null;

  // Height-first sizing capped by width: the page keeps the book's exact
  // aspect (same numbers the flipbook derives everything from) and fits
  // within the viewport either way.
  const heightExpr = `min(82vh, ${((bookHeight / bookWidth) * 88).toFixed(2)}vw)`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 p-6">
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng xem trước"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="overflow-hidden rounded-md bg-white shadow-2xl"
        style={{ aspectRatio: `${bookWidth} / ${bookHeight}`, height: heightExpr }}
      >
        <BookPage page={page} bookWidth={bookWidth} bookHeight={bookHeight} isActive />
      </div>

      <div className="flex items-center gap-3 text-sm text-white">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          aria-label="Trang trước"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span>
          Trang {index + 1}/{pages.length} — đúng như học viên nhìn thấy (kể cả thay đổi chưa lưu)
        </span>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
          disabled={index === pages.length - 1}
          aria-label="Trang sau"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
