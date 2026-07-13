"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from "pdfjs-dist";
import HTMLFlipBook from "react-pageflip";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { PdfPage } from "./pdf-page";
import { FLIPBOOK_DEFAULTS } from "./flipbook-defaults";

const RENDER_SCALE = 1.5;
const JPEG_QUALITY = 0.85;

// Renders a PDF (served from `src`, same access-gated API route the plain
// iframe viewer already uses) as a page-turn flipbook. Pages are rasterized
// to JPEG data URLs lazily — one at a time in reading order — rather than
// all upfront, so a long book doesn't block the first page behind minutes of
// canvas rendering; jumping ahead via flip/thumbnail bumps that page (and
// its neighbor) to the front of the queue instead of waiting in line.
export function PdfFlipbook({ src, title }: { src: string; title: string }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [aspect, setAspect] = useState<number | null>(null); // width / height
  const [pages, setPages] = useState<(string | null)[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const docRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const pagesRef = useRef<(string | null)[]>([]);
  const queueRef = useRef<number[]>([]);
  const renderingRef = useRef(false);
  const flipRef = useRef<{ pageFlip(): { flipPrev(): void; flipNext(): void } } | null>(null);

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

  const width = 500;
  const height = Math.round(width / aspect);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-full justify-center overflow-x-auto">
        <HTMLFlipBook
          {...FLIPBOOK_DEFAULTS}
          ref={flipRef}
          width={width}
          height={height}
          size="stretch"
          minWidth={280}
          maxWidth={1000}
          minHeight={Math.round(280 / aspect)}
          maxHeight={Math.round(1000 / aspect)}
          showCover={false}
          maxShadowOpacity={0.5}
          className="shadow-lg"
          onFlip={(e: { data: number }) => {
            setCurrentPage(e.data);
            prioritize(e.data + 1);
          }}
        >
          {pages.map((dataUrl, i) => (
            <PdfPage key={i} dataUrl={dataUrl} pageNumber={i + 1} />
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
          Trang {currentPage + 1}/{numPages}
        </span>
        <button
          type="button"
          onClick={() => flipRef.current?.pageFlip().flipNext()}
          disabled={currentPage >= numPages - 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-surface-hover disabled:opacity-40"
          aria-label="Trang sau"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
