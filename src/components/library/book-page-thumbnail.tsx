import type { BookPageData } from "@/lib/library-book-elements";
import { BookElementRenderer } from "./book-element-renderer";

// Miniature, non-interactive render of one INTERACTIVE book page — same
// "scale a copy of the real elements down" approach as the full BookPage,
// just without the ResizeObserver (thumbnail size is fixed by the caller).
// Shared by the admin editor's page-thumbnail-rail and the reader's
// flipbook-thumbnail-rail so both stay pixel-identical to the real page.
export function BookPageThumbnail({
  page,
  bookWidth,
  bookHeight,
  width = 96,
}: {
  page: BookPageData;
  bookWidth: number;
  bookHeight: number;
  width?: number;
}) {
  const scale = width / bookWidth;
  const height = Math.round(bookHeight * scale);
  return (
    <div className="relative overflow-hidden bg-white" style={{ width, height }}>
      {page.backgroundColor && <div className="absolute inset-0" style={{ backgroundColor: page.backgroundColor }} />}
      {page.backgroundImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={page.backgroundImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: bookWidth, height: bookHeight, transform: `scale(${scale})` }}
      >
        {page.elements.map((element) => (
          <div
            key={element.id}
            className="absolute"
            style={{ left: element.x, top: element.y, width: element.width, height: element.height }}
          >
            <BookElementRenderer element={element} isActive={false} />
          </div>
        ))}
      </div>
    </div>
  );
}
