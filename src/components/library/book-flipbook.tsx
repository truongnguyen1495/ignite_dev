"use client";

import { useEffect, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { BookPageData } from "@/lib/library-book-elements";
import { BookPage } from "./book-page";
import { FLIPBOOK_DEFAULTS } from "./flipbook-defaults";
import { isPagedSpread, isLastSpread, type FlipbookOrientation } from "./flipbook-spread";

type PagesResponse = {
  pages: BookPageData[];
  bookWidth: number | null;
  bookHeight: number | null;
};

// Renders an INTERACTIVE-format LibraryItem (fetched from
// /api/library/[itemId]/pages, the same access-gated route for both trial
// and full reads) as a page-turn flipbook, mirroring PdfFlipbook's overall
// shape — but elements render live and instantly (no pdfjs rasterization or
// render queue needed) since there's no PDF to parse.
export function BookFlipbook({ itemId, title }: { itemId: string; title: string }) {
  const [data, setData] = useState<PagesResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [orientation, setOrientation] = useState<FlipbookOrientation>("portrait");
  const [error, setError] = useState<string | null>(null);
  const flipRef = useRef<{ pageFlip(): { flipPrev(): void; flipNext(): void } } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/library/${itemId}/pages`);
        if (!res.ok) throw new Error("request failed");
        const json = (await res.json()) as PagesResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Không tải được nội dung sách.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  if (error) {
    return <p className="flex h-[80vh] items-center justify-center text-sm text-danger">{error}</p>;
  }

  if (!data || !data.bookWidth || !data.bookHeight || data.pages.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải {title}...
      </div>
    );
  }

  const { pages, bookWidth, bookHeight } = data;
  const aspect = bookWidth / bookHeight;
  const totalPages = pages.length;
  const spread = isPagedSpread(orientation, currentPage, totalPages);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex w-full max-w-full justify-center overflow-x-auto px-4">
        <HTMLFlipBook
          {...FLIPBOOK_DEFAULTS}
          ref={flipRef}
          width={500}
          height={Math.round(500 / aspect)}
          size="stretch"
          minWidth={280}
          maxWidth={1000}
          minHeight={Math.round(280 / aspect)}
          maxHeight={Math.round(1000 / aspect)}
          showCover
          maxShadowOpacity={0.5}
          className={`shadow-lg flipbook-page-curve flipbook-book ${spread ? "flipbook-spread" : ""}`}
          onFlip={(e: { data: number }) => setCurrentPage(e.data)}
          onChangeOrientation={(e: { data: FlipbookOrientation }) => setOrientation(e.data)}
          onInit={(e: { data: { mode: FlipbookOrientation } }) => setOrientation(e.data.mode)}
        >
          {pages.map((page, i) => (
            <BookPage key={i} page={page} bookWidth={bookWidth} bookHeight={bookHeight} isActive={i === currentPage} />
          ))}
        </HTMLFlipBook>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted">
        <button
          type="button"
          onClick={() => flipRef.current?.pageFlip().flipPrev()}
          disabled={currentPage <= 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-surface-hover disabled:opacity-40"
          aria-label="Trang trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span>
          Trang {spread ? `${currentPage + 1}-${currentPage + 2}` : currentPage + 1}/{totalPages}
        </span>
        <button
          type="button"
          onClick={() => flipRef.current?.pageFlip().flipNext()}
          disabled={isLastSpread(orientation, currentPage, totalPages)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-surface-hover disabled:opacity-40"
          aria-label="Trang sau"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
