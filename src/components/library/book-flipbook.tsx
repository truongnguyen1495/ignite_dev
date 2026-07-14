"use client";

import { useEffect, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { Loader2 } from "lucide-react";
import type { BookPageData } from "@/lib/library-book-elements";
import { BookPage } from "./book-page";
import { BookPageThumbnail } from "./book-page-thumbnail";
import { FlipbookChrome } from "./flipbook-chrome";
import { FLIPBOOK_DEFAULTS } from "./flipbook-defaults";
import { useFlipbookZoom } from "./use-flipbook-zoom";
import { useFullscreen } from "./use-fullscreen";
import { isPagedSpread, isLastSpread, type FlipbookOrientation } from "./flipbook-spread";

type PagesResponse = {
  pages: BookPageData[];
  bookWidth: number | null;
  bookHeight: number | null;
  backgroundImageUrl: string | null;
};

type PageFlipHandle = { pageFlip(): { flipPrev(): void; flipNext(): void; flip(page: number): void } };

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
  const flipRef = useRef<PageFlipHandle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(containerRef);
  const zoom = useFlipbookZoom();

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

  const { pages, bookWidth, bookHeight, backgroundImageUrl } = data;
  const aspect = bookWidth / bookHeight;
  const totalPages = pages.length;
  const spread = isPagedSpread(orientation, currentPage, totalPages);
  const canPrev = currentPage > 0;
  const canNext = !isLastSpread(orientation, currentPage, totalPages);

  return (
    <FlipbookChrome
      containerRef={containerRef}
      backgroundImageUrl={backgroundImageUrl}
      isFullscreen={isFullscreen}
      pageLabel={`Trang ${spread ? `${currentPage + 1}-${currentPage + 2}` : currentPage + 1}/${totalPages}`}
      onFirst={() => flipRef.current?.pageFlip().flip(0)}
      onPrev={() => flipRef.current?.pageFlip().flipPrev()}
      onNext={() => flipRef.current?.pageFlip().flipNext()}
      onLast={() => flipRef.current?.pageFlip().flip(totalPages - 1)}
      canPrev={canPrev}
      canNext={canNext}
      zoomed={zoom.zoomed}
      onToggleZoom={zoom.toggleZoom}
      onToggleFullscreen={() => void toggleFullscreen()}
      thumbnailCount={totalPages}
      currentPage={currentPage}
      onSelectPage={(i) => flipRef.current?.pageFlip().flip(i)}
      renderThumbnail={(i) => (
        <BookPageThumbnail page={pages[i]} bookWidth={bookWidth} bookHeight={bookHeight} width={64} />
      )}
      bookArea={
        <div
          ref={zoom.wrapperRef}
          className={`relative flex w-full max-w-full justify-center px-4 ${
            zoom.zoomed ? "overflow-hidden" : "overflow-x-auto"
          }`}
        >
          <div style={{ transform: zoom.transform, transition: zoom.transition }}>
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
                <BookPage
                  key={i}
                  page={page}
                  bookWidth={bookWidth}
                  bookHeight={bookHeight}
                  // A landscape spread shows two pages on screen at once (see
                  // isPagedSpread) — both need live video/audio, not just the
                  // one currentPage tracks, or the right-hand page's iframe
                  // never mounts and its video/audio placeholder stays inert.
                  isActive={i === currentPage || (spread && i === currentPage + 1)}
                />
              ))}
            </HTMLFlipBook>
          </div>
          {zoom.overlayHandlers && (
            <div
              className="absolute inset-0 z-30 cursor-grab touch-none active:cursor-grabbing"
              {...zoom.overlayHandlers}
            />
          )}
        </div>
      }
    />
  );
}
