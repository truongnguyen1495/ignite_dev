"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { Loader2 } from "lucide-react";
import type { BookPageData } from "@/lib/library-book-elements";
import { BookPage } from "./book-page";
import { BookPageThumbnail } from "./book-page-thumbnail";
import { FlipbookChrome } from "./flipbook-chrome";
import { FLIPBOOK_DEFAULTS } from "./flipbook-defaults";
import { useFlipbookZoom } from "./use-flipbook-zoom";
import { useFullscreen } from "./use-fullscreen";
import { useFlipbookSound } from "./use-flipbook-sound";
import { isPagedSpread, isLastSpread, withBlankPad, type FlipbookOrientation } from "./flipbook-spread";

type PagesResponse = {
  pages: BookPageData[];
  bookWidth: number | null;
  bookHeight: number | null;
  backgroundImageUrl: string | null;
};

// turnToPage jumps instantly (no page-turn animation) — used for
// first/last/thumbnail-click "go to page" actions, since animating a flip
// through every intervening page (what .flip() does) can take a very long
// time on a book with hundreds of pages. flipPrev/flipNext stay animated —
// those are literal single-page turns where the animation is the point.
type PageFlipHandle = {
  pageFlip(): { flipPrev(): void; flipNext(): void; turnToPage(page: number): void };
};

// A completely empty page — used only to pad an odd-length book to even
// length (see withBlankPad in flipbook-spread.ts) so the real last page
// still lands alone like the cover, instead of pairing with the
// second-to-last. Rendered by the ordinary BookPage component: empty
// `elements` already paints as a plain white page with no extra cases
// needed there.
const BLANK_BOOK_PAGE: BookPageData = { backgroundColor: null, backgroundImageUrl: null, elements: [] };

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
  const { muted, toggleMuted, playFlipSound } = useFlipbookSound();

  // See withBlankPad in flipbook-spread.ts — must run every render (hooks
  // can't be conditional), so it's fine that `data` may still be null here
  // before the fetch resolves; withBlankPad no-ops on an empty array.
  const pages = useMemo(() => withBlankPad(data?.pages ?? [], BLANK_BOOK_PAGE), [data]);

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

  if (!data || !data.bookWidth || !data.bookHeight || pages.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải {title}...
      </div>
    );
  }

  const { bookWidth, bookHeight, backgroundImageUrl } = data;
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
      onFirst={() => flipRef.current?.pageFlip().turnToPage(0)}
      onPrev={() => flipRef.current?.pageFlip().flipPrev()}
      onNext={() => flipRef.current?.pageFlip().flipNext()}
      onLast={() => flipRef.current?.pageFlip().turnToPage(totalPages - 1)}
      canPrev={canPrev}
      canNext={canNext}
      zoomed={zoom.zoomed}
      onToggleZoom={zoom.toggleZoom}
      onToggleFullscreen={() => void toggleFullscreen()}
      muted={muted}
      onToggleMuted={toggleMuted}
      thumbnailCount={totalPages}
      currentPage={currentPage}
      onSelectPage={(i) => flipRef.current?.pageFlip().turnToPage(i)}
      renderThumbnail={(i) => (
        <BookPageThumbnail page={pages[i]} bookWidth={bookWidth} bookHeight={bookHeight} width={64} />
      )}
      bookArea={
        <div
          ref={zoom.wrapperRef}
          // overflow-y-hidden isn't decorative — per the CSS overflow spec, a
          // computed overflow-y of visible gets forced to auto whenever
          // overflow-x isn't visible, so overflow-x-auto alone silently
          // opts this div into a vertical scrollbar too. Invisible while the
          // book stayed small; became a real visible scrollbar once sizing
          // grew the book close to this band's height (any sub-pixel
          // rounding slop in react-pageflip's own box was enough to trigger
          // it). Explicit overflow-y-hidden clips that harmless slop instead
          // of scrolling it.
          className={`relative flex h-full w-full max-w-full justify-center px-4 ${
            zoom.zoomed ? "overflow-hidden" : "overflow-x-auto overflow-y-hidden"
          }`}
        >
          <div className="w-full" style={{ transform: zoom.transform, transition: zoom.transition }}>
            <HTMLFlipBook
              {...FLIPBOOK_DEFAULTS}
              ref={flipRef}
              width={500}
              height={Math.round(500 / aspect)}
              size="stretch"
              minWidth={280}
              maxWidth={1600}
              minHeight={Math.round(280 / aspect)}
              maxHeight={Math.round(1600 / aspect)}
              showCover
              maxShadowOpacity={0.5}
              className={`shadow-lg flipbook-page-curve flipbook-book ${spread ? "flipbook-spread" : ""}`}
              onFlip={(e: { data: number }) => {
                setCurrentPage(e.data);
                playFlipSound();
              }}
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
