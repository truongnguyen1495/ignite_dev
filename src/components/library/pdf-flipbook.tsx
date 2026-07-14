"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from "pdfjs-dist";
import HTMLFlipBook from "react-pageflip";
import { Loader2 } from "lucide-react";
import { PdfPage } from "./pdf-page";
import { FlipbookChrome } from "./flipbook-chrome";
import { FLIPBOOK_DEFAULTS } from "./flipbook-defaults";
import { useFlipbookZoom } from "./use-flipbook-zoom";
import { useFullscreen } from "./use-fullscreen";
import { isPagedSpread, isLastSpread, type FlipbookOrientation } from "./flipbook-spread";

const RENDER_SCALE = 1.5;
const JPEG_QUALITY = 0.85;

type PageFlipHandle = { pageFlip(): { flipPrev(): void; flipNext(): void; flip(page: number): void } };

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

  const docRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const pagesRef = useRef<(string | null)[]>([]);
  const queueRef = useRef<number[]>([]);
  const renderingRef = useRef(false);
  const flipRef = useRef<PageFlipHandle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(containerRef);
  const zoom = useFlipbookZoom();

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

  const spread = isPagedSpread(orientation, currentPage, numPages);
  const canPrev = currentPage > 0;
  const canNext = !isLastSpread(orientation, currentPage, numPages);

  function jumpTo(pageIndex: number) {
    flipRef.current?.pageFlip().flip(pageIndex);
    prioritize(pageIndex + 1);
  }

  return (
    <FlipbookChrome
      containerRef={containerRef}
      backgroundImageUrl={backgroundImageUrl}
      isFullscreen={isFullscreen}
      pageLabel={`Trang ${spread ? `${currentPage + 1}-${currentPage + 2}` : currentPage + 1}/${numPages}`}
      onFirst={() => jumpTo(0)}
      onPrev={() => {
        flipRef.current?.pageFlip().flipPrev();
      }}
      onNext={() => {
        flipRef.current?.pageFlip().flipNext();
      }}
      onLast={() => jumpTo(numPages - 1)}
      canPrev={canPrev}
      canNext={canNext}
      zoomed={zoom.zoomed}
      onToggleZoom={zoom.toggleZoom}
      onToggleFullscreen={() => void toggleFullscreen()}
      thumbnailCount={numPages}
      currentPage={currentPage}
      onSelectPage={jumpTo}
      renderThumbnail={(i) =>
        pages[i] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pages[i]!} alt={`Trang ${i + 1}`} className="h-16 w-auto bg-white object-contain" />
        ) : (
          <div className="flex h-16 w-12 items-center justify-center bg-white">
            <Loader2 className="h-3 w-3 animate-spin text-muted" />
          </div>
        )
      }
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
              onFlip={(e: { data: number }) => {
                setCurrentPage(e.data);
                prioritize(e.data + 1);
              }}
              onChangeOrientation={(e: { data: FlipbookOrientation }) => setOrientation(e.data)}
              onInit={(e: { data: { mode: FlipbookOrientation } }) => setOrientation(e.data.mode)}
            >
              {pages.map((dataUrl, i) => (
                <PdfPage key={i} dataUrl={dataUrl} pageNumber={i + 1} />
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
