"use client";

import { Rnd } from "react-rnd";
import type { BookElement, BookPageData } from "@/lib/library-book-elements";
import { BookElementRenderer } from "@/components/library/book-element-renderer";

// Fixed editor preview width in display pixels — every element's design-unit
// x/y/width/height is converted to/from this scale on the way in/out of
// react-rnd, so saved data always stays in the book's own bookWidth/bookHeight
// units regardless of how big the editor happens to render it.
const CANVAS_DISPLAY_WIDTH = 600;

// Renders only the currently selected page as a plain fixed-size canvas —
// deliberately NOT inside react-pageflip's HTMLFlipBook (that's reader-only,
// see book-flipbook.tsx): StPageFlip clones/re-measures each page's DOM at
// flip-init and on resize, which would fight react-rnd's own live drag state.
export function EditorCanvas({
  page,
  bookWidth,
  bookHeight,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
}: {
  page: BookPageData;
  bookWidth: number;
  bookHeight: number;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (elementId: string, patch: Partial<BookElement>) => void;
}) {
  const scale = CANVAS_DISPLAY_WIDTH / bookWidth;
  const displayHeight = Math.round(bookHeight * scale);

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-md border border-border bg-white shadow-md"
      style={{ width: CANVAS_DISPLAY_WIDTH, height: displayHeight }}
      onMouseDown={() => onSelectElement(null)}
    >
      {page.backgroundColor && (
        <div className="absolute inset-0" style={{ backgroundColor: page.backgroundColor }} />
      )}
      {page.backgroundImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={page.backgroundImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {page.elements.map((element) => (
        <Rnd
          key={element.id}
          size={{ width: element.width * scale, height: element.height * scale }}
          position={{ x: element.x * scale, y: element.y * scale }}
          bounds="parent"
          style={{
            zIndex: element.zIndex,
            outline: element.id === selectedElementId ? "2px solid var(--primary)" : "none",
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onSelectElement(element.id);
          }}
          onDragStop={(_e, d) => onUpdateElement(element.id, { x: d.x / scale, y: d.y / scale })}
          onResizeStop={(_e, _dir, ref, _delta, position) => {
            onUpdateElement(element.id, {
              width: ref.offsetWidth / scale,
              height: ref.offsetHeight / scale,
              x: position.x / scale,
              y: position.y / scale,
            });
          }}
        >
          <div className="h-full w-full">
            <BookElementRenderer element={element} isActive />
          </div>
        </Rnd>
      ))}
    </div>
  );
}
