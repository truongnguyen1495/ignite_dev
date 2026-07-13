"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import type { BookPageData } from "@/lib/library-book-elements";
import { BookElementRenderer } from "./book-element-renderer";

// Forward-ref page cell for BookFlipbook, mirroring pdf-page.tsx's shape —
// react-pageflip measures each page's real DOM node on mount, so this can't
// be a plain function component. react-pageflip's `size="stretch"` mode
// resizes this cell's actual rendered pixels to fit its container (between
// the flipbook's min/max bounds), which can differ a lot from the book's
// fixed design-pixel bookWidth/bookHeight — so a ResizeObserver on this same
// node tracks the live scale factor rather than trusting a value computed
// once from a static fallback size.
export const BookPage = forwardRef<
  HTMLDivElement,
  { page: BookPageData; bookWidth: number; bookHeight: number; isActive: boolean }
>(function BookPage({ page, bookWidth, bookHeight, isActive }, forwardedRef) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setScale(width / bookWidth);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [bookWidth]);

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      className="relative h-full w-full overflow-hidden bg-white"
    >
      {page.backgroundColor && (
        <div className="absolute inset-0" style={{ backgroundColor: page.backgroundColor }} />
      )}
      {page.backgroundImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={page.backgroundImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      )}
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: bookWidth, height: bookHeight, transform: `scale(${scale})` }}
      >
        {page.elements.map((element) => (
          <div
            key={element.id}
            className="absolute"
            style={{
              left: element.x,
              top: element.y,
              width: element.width,
              height: element.height,
              transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
              zIndex: element.zIndex,
            }}
          >
            <BookElementRenderer element={element} isActive={isActive} />
          </div>
        ))}
      </div>
    </div>
  );
});
