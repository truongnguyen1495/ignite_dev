"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from "pdfjs-dist";
import HTMLFlipBook from "react-pageflip";
import { Loader2 } from "lucide-react";
import { PdfPage } from "./pdf-page";
import { FlipbookChrome } from "./flipbook-chrome";
import { FLIPBOOK_DEFAULTS } from "./flipbook-defaults";
import { useFlipbookZoom } from "./use-flipbook-zoom";
import { useFullscreen } from "./use-fullscreen";
import { useFlipbookSound } from "./use-flipbook-sound";
import { useAvailableHeight } from "./use-available-height";
import { isPagedSpread, isLastSpread, type FlipbookOrientation } from "./flipbook-spread";

const RENDER_SCALE = 1.5;
const JPEG_QUALITY = 0.85;

// turnToPage jumps instantly (no page-turn animation) — used for
// first/last/thumbnail-click "go to page" actions, since animating a flip
// through every intervening page (what .flip() does) can take a very long
// time on a book with hundreds of pages. flipPrev/flipNext stay animated —
// those are literal single-page turns where the animation is the point.
type PageFlipHandle = {
  pageFlip(): { flipPrev(): void; flipNext(): void; turnToPage(page: number): void };
};

// One "slot" the flipbook actually renders — either a real PDF page (1-based
// `realPage`, matching pdfjs's own numbering) or the blank filler inserted
// right after the cover when `numPages` is odd (see withBlankPad's comment
// in flipbook-spread.ts for why it goes there and not at the very end). A
// PDF file can't have a page literally inserted into it, so this mapping is
// display-only — pdfjs/the render queue never know the blank slot exists.
type DisplaySlot = { blank: true } | { blank: false; realPage: number };

function buildDisplaySlots(numPages: number): DisplaySlot[] {
  if (numPages % 2 === 0) {
    return Array.from({ length: numPages }, (_, i) => ({ blank: false, realPage: i + 1 }));
  }
  const slots: DisplaySlot[] = [{ blank: false, realPage: 1 }, { blank: true }];
  for (let p = 2; p <= numPages; p++) slots.push({ blank: false, realPage: p });
  return slots;
}

// Renders a PDF (served from `src`, same access-gated API route the plain
// iframe viewer already uses) as a page-turn flipbook. Pages are rasterized
// to JPEG data URLs lazily — one at a time in reading order — rather than
// all upfront, so a long book doesn't block the first page behind minutes of
// canvas rendering; jumping ahead via flip/thumbnail bumps that page (and
// its neighbor) to the front of the queue instead of waiting in line.
export function PdfFlipbook({
  src,
  title,
  backgroundImageUrl,
}: {
  src: string;
  title: string;
  backgroundImageUrl?: string | null;
}) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [aspect, setAspect] = useState<number | null>(null); // width / height
  const [pages, setPages] = useState<(string | null)[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [orientation, setOrientation] = useState<FlipbookOrientation>("portrait");
  const [error, setError] = useState<string | null>(null);
  const [showThumbnails, setShowThumbnails] = useState(true);

  const docRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const pagesRef = useRef<(string | null)[]>([]);
  const queueRef = useRef<number[]>([]);
  const renderingRef = useRef(false);
  const flipRef = useRef<PageFlipHandle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(containerRef);
  const zoom = useFlipbookZoom();
  const { muted, toggleMuted, playFlipSound } = useFlipbookSound();
  const availableHeight = useAvailableHeight(zoom.wrapperRef);

  const displaySlots = useMemo(() => (numPages ? buildDisplaySlots(numPages) : []), [numPages]);

  const renderPage = useCallback(async (pageNumber: number) => {
    const doc = docRef.current;
    if (!doc || pagesRef.current[pageNumber - 1]) return;
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    pagesRef.current[pageNumber - 1] = dataUrl;
    setPages([...pagesRef.current]);
  }, []);

  const drainQueue = useCallback(async () => {
    if (renderingRef.current) return;
    renderingRef.current = true;
    while (queueRef.current.length > 0) {
      const next = queueRef.current.shift()!;
      if (!pagesRef.current[next - 1]) {
        try {
          await renderPage(next);
        } catch {
          // Leave that page's slot null — its placeholder just keeps
          // spinning rather than crashing the whole flipbook over one
          // malformed page.
        }
      }
    }
    renderingRef.current = false;
  }, [renderPage]);

  const prioritize = useCallback(
    (pageNumber: number) => {
      queueRef.current = [
        pageNumber,
        pageNumber + 1,
        ...queueRef.current.filter((p) => p !== pageNumber && p !== pageNumber + 1),
      ].filter((p) => p >= 1 && p <= (numPages ?? 0));
      void drainQueue();
    },
    [drainQueue, numPages]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const loadingTask = pdfjsLib.getDocument({ url: src });
        loadingTaskRef.current = loadingTask;
        const doc = await loadingTask.promise;
        if (cancelled) return;
        docRef.current = doc;
        const firstPage = await doc.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        if (cancelled) return;
        setAspect(viewport.width / viewport.height);
        setNumPages(doc.numPages);
        pagesRef.current = new Array(doc.numPages).fill(null);
        queueRef.current = Array.from({ length: doc.numPages }, (_, i) => i + 1);
        setPages([...pagesRef.current]);
        void drainQueue();
      } catch {
        if (!cancelled) setError("Không tải được file PDF để xem dạng flipbook.");
      }
    })();
    return () => {
      cancelled = true;
      queueRef.current = [];
      void loadingTaskRef.current?.destroy();
    };
    // Intentionally only re-runs when the source changes — drainQueue is
    // stable enough via its own refs that re-subscribing here would just
    // restart the whole load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (error) {
    return <p className="flex h-[80vh] items-center justify-center text-sm text-danger">{error}</p>;
  }

  if (!numPages || !aspect) {
    return (
      <div className="flex h-[80vh] items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải {title}...
      </div>
    );
  }

  const totalDisplayPages = displaySlots.length;
  const spread = isPagedSpread(orientation, currentPage, totalDisplayPages);
  const canPrev = currentPage > 0;
  const canNext = !isLastSpread(orientation, currentPage, totalDisplayPages);

  // react-pageflip's own wrapper box sizes itself from *width* alone (a CSS
  // padding-bottom-percentage trick — see use-available-height.ts' comment),
  // completely ignoring how much height its real parent actually has. A
  // single page's rendered height always equals its rendered width divided
  // by `aspect`, regardless of portrait vs. landscape spread (a spread just
  // places two pages side by side at the same height, it doesn't stack
  // them) — so capping *width* to `availableHeight * aspect` is what
  // actually keeps the book from rendering taller than the real space below
  // the toolbar and above the thumbnail rail.
  const maxWidth = availableHeight ? Math.max(280, Math.min(1600, Math.floor(availableHeight * aspect))) : 1600;

  // Prefetches whichever *real* PDF page(s) sit at/near a given display
  // index — a blank slot has nothing to rasterize, so it forwards to its
  // neighbor instead of no-op'ing (the neighbor is what actually becomes
  // visible right after the blank page in a spread).
  function prioritizeDisplayIndex(displayIndex: number) {
    const slot = displaySlots[displayIndex];
    if (slot && !slot.blank) {
      prioritize(slot.realPage);
      return;
    }
    const next = displaySlots[displayIndex + 1];
    if (next && !next.blank) prioritize(next.realPage);
  }

  function jumpTo(displayIndex: number) {
    flipRef.current?.pageFlip().turnToPage(displayIndex);
    prioritizeDisplayIndex(displayIndex);
  }

  return (
    <FlipbookChrome
      containerRef={containerRef}
      backgroundImageUrl={backgroundImageUrl}
      isFullscreen={isFullscreen}
      pageLabel={`Trang ${
        spread ? `${currentPage + 1}-${currentPage + 2}` : currentPage + 1
      }/${totalDisplayPages}`}
      onFirst={() => jumpTo(0)}
      onPrev={() => {
        flipRef.current?.pageFlip().flipPrev();
      }}
      onNext={() => {
        flipRef.current?.pageFlip().flipNext();
      }}
      onLast={() => jumpTo(totalDisplayPages - 1)}
      canPrev={canPrev}
      canNext={canNext}
      zoomed={zoom.zoomed}
      onToggleZoom={zoom.toggleZoom}
      onToggleFullscreen={() => void toggleFullscreen()}
      muted={muted}
      onToggleMuted={toggleMuted}
      showThumbnails={showThumbnails}
      onToggleThumbnails={() => setShowThumbnails((v) => !v)}
      thumbnailCount={totalDisplayPages}
      currentPage={currentPage}
      onSelectPage={jumpTo}
      renderThumbnail={(i) => {
        const slot = displaySlots[i];
        if (!slot || slot.blank) {
          return <div className="h-16 w-12 bg-white" />;
        }
        const dataUrl = pages[slot.realPage - 1];
        return dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={`Trang ${i + 1}`} className="h-16 w-auto bg-white object-contain" />
        ) : (
          <div className="flex h-16 w-12 items-center justify-center bg-white">
            <Loader2 className="h-3 w-3 animate-spin text-muted" />
          </div>
        );
      }}
      bookArea={
        <div
          ref={zoom.wrapperRef}
          // overflow-y-hidden isn't decorative — see the matching comment in
          // book-flipbook.tsx: overflow-x-auto alone silently forces
          // overflow-y to auto too (CSS overflow spec), which only became a
          // visible scrollbar once the book grew tall enough for
          // react-pageflip's own box to occasionally exceed this band by a
          // sub-pixel amount.
          className={`relative flex h-full w-full max-w-full justify-center px-4 ${
            zoom.zoomed ? "overflow-hidden" : "overflow-x-auto overflow-y-hidden"
          }`}
        >
          <div className="w-full" style={{ transform: zoom.transform, transition: zoom.transition }}>
            {availableHeight === null ? (
              // react-pageflip only reads its sizing props once, at the
              // moment it first constructs its internal instance (see
              // use-available-height.ts) — mounting it before the real
              // available space is known would bake in the wrong maxWidth
              // permanently, so it waits one tick for a real measurement
              // instead of a placeholder-then-correct flash.
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted" />
              </div>
            ) : (
              <HTMLFlipBook
                {...FLIPBOOK_DEFAULTS}
                // Remounts (fresh instance, correct sizing baked in) only
                // when the space genuinely changes enough to matter —
                // fullscreen toggle, thumbnail-rail toggle, a real window
                // resize — not on every sub-pixel ResizeObserver tick.
                key={Math.round(maxWidth / 20)}
                ref={flipRef}
                width={500}
                height={Math.round(500 / aspect)}
                size="stretch"
                minWidth={280}
                maxWidth={maxWidth}
                minHeight={Math.round(280 / aspect)}
                maxHeight={Math.round(maxWidth / aspect)}
                startPage={currentPage}
                showCover
                maxShadowOpacity={0.5}
                className={`shadow-lg flipbook-page-curve flipbook-book ${spread ? "flipbook-spread" : ""}`}
                onFlip={(e: { data: number }) => {
                  setCurrentPage(e.data);
                  playFlipSound();
                  prioritizeDisplayIndex(e.data);
                }}
                onChangeOrientation={(e: { data: FlipbookOrientation }) => setOrientation(e.data)}
                onInit={(e: { data: { mode: FlipbookOrientation } }) => setOrientation(e.data.mode)}
              >
                {displaySlots.map((slot, i) =>
                  slot.blank ? (
                    <PdfPage key={i} dataUrl={null} pageNumber={i + 1} blank />
                  ) : (
                    <PdfPage key={i} dataUrl={pages[slot.realPage - 1]} pageNumber={i + 1} />
                  )
                )}
              </HTMLFlipBook>
            )}
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
