"use client";

import type { ReactNode, RefObject } from "react";
import { FlipbookToolbar } from "./flipbook-toolbar";
import { FlipbookThumbnailRail } from "./flipbook-thumbnail-rail";

// Shared outer chrome for both BookFlipbook and PdfFlipbook: the optional
// backdrop image, the fullscreen container (containerRef gets passed to
// requestFullscreen by the caller's useFullscreen hook), the toolbar, and
// the thumbnail rail. `bookArea` is the caller's own <HTMLFlipBook> +
// zoom-overlay markup — kept out of this component since react-pageflip
// needs its ref/children wired up directly by each format's component.
export function FlipbookChrome({
  containerRef,
  backgroundImageUrl,
  isFullscreen,
  bookArea,
  pageLabel,
  onFirst,
  onPrev,
  onNext,
  onLast,
  canPrev,
  canNext,
  zoomed,
  onToggleZoom,
  onToggleFullscreen,
  muted,
  onToggleMuted,
  showThumbnails,
  onToggleThumbnails,
  thumbnailCount,
  currentPage,
  onSelectPage,
  renderThumbnail,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  backgroundImageUrl?: string | null;
  isFullscreen: boolean;
  bookArea: ReactNode;
  pageLabel: string;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  canPrev: boolean;
  canNext: boolean;
  zoomed: boolean;
  onToggleZoom: () => void;
  onToggleFullscreen: () => void;
  muted: boolean;
  onToggleMuted: () => void;
  showThumbnails: boolean;
  onToggleThumbnails: () => void;
  thumbnailCount: number;
  currentPage: number;
  onSelectPage: (index: number) => void;
  renderThumbnail: (index: number) => ReactNode;
}) {
  const hasBackground = !!backgroundImageUrl;

  const toolbar = (
    <FlipbookToolbar
      pageLabel={pageLabel}
      onFirst={onFirst}
      onPrev={onPrev}
      onNext={onNext}
      onLast={onLast}
      canPrev={canPrev}
      canNext={canNext}
      zoomed={zoomed}
      onToggleZoom={onToggleZoom}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      muted={muted}
      onToggleMuted={onToggleMuted}
      showThumbnails={showThumbnails}
      onToggleThumbnails={onToggleThumbnails}
      variant={hasBackground ? "dark" : "light"}
    />
  );

  const thumbnailRail = showThumbnails && (
    <FlipbookThumbnailRail
      count={thumbnailCount}
      currentPage={currentPage}
      onSelect={onSelectPage}
      renderThumbnail={renderThumbnail}
    />
  );

  // The book itself sits in a flex-1 band so it claims whatever vertical
  // room is left over after the toolbar/thumbnail rail take their own
  // natural height — react-pageflip's own "stretch"+autoSize sizing then
  // measures *that* real space (see width/height comments in book-flipbook
  // tsx/pdf-flipbook.tsx) rather than a fixed pixel guess. `min-h-0` is
  // required on a flex-1 child or it refuses to shrink below its content's
  // natural size, defeating the whole "fill remaining space" point.
  const bookBand = <div className="flex min-h-0 w-full flex-1 items-center justify-center">{bookArea}</div>;

  // On a tall book (or a small/short browser window), this whole block can
  // end up taller than the viewport — the *page* scrolls, not this block,
  // since h-[75vh] bounds it against the full viewport height without
  // knowing how much room the title/description above it already used. If
  // the toolbar just scrolled away with the rest of the page, a reader
  // mid-book would lose every control until they scrolled back up — sticky
  // keeps it pinned near the top of the viewport instead, regardless of
  // where the book/thumbnails have scrolled to.
  const stickyToolbar = <div className="sticky top-3 z-30">{toolbar}</div>;

  // A *definite* height here (not just max-height) matters, not just
  // styling: flexbox only actually shrinks a flex-1 child (bookBand) down
  // to "whatever's left after siblings" when the container itself has a
  // definite size to distribute — with max-height alone, the column's own
  // preferred size is still driven by its children's natural content size,
  // so a book whose own width-driven sizing (see book-flipbook.tsx/
  // pdf-flipbook.tsx) wants to render taller than the toolbar+thumbnails
  // budget just overflows *past* them instead of being constrained to fit —
  // visually reads as the book overlapping/hiding behind the toolbar and
  // thumbnail rail, confirmed from a real screenshot of a wide spread doing
  // exactly that. overflow-hidden is a safety net for any residual rounding.
  if (!hasBackground) {
    return (
      <div
        ref={containerRef}
        className={
          isFullscreen
            ? "flex h-full w-full flex-col items-center justify-center gap-3 bg-background p-6"
            : "flex h-[75vh] w-full flex-col items-center gap-3 overflow-hidden"
        }
      >
        {bookBand}
        {stickyToolbar}
        {thumbnailRail}
      </div>
    );
  }

  // With a backdrop image, the whole reader — toolbar included — sits
  // inside *one* continuous scene: the image is the frame the book and
  // toolbar both live inside, not two stacked blocks with a hard seam
  // between them (an earlier version split the toolbar into its own opaque
  // bar above the image; the user pointed back at the same reference and
  // clarified the ask was specifically about "cách bố trí hình nền với
  // sách" — the background-and-book composition as a whole — so the
  // toolbar goes back to floating over the backdrop, but now as a wide
  // translucent bar (not the earlier narrow pill) that reads as part of the
  // same scene rather than competing with it.
  return (
    <div
      ref={containerRef}
      className={[
        "flex w-full flex-col items-center gap-4 bg-cover bg-center px-4 pb-6 pt-3 sm:pb-10",
        isFullscreen ? "h-full justify-center" : "h-[75vh] overflow-hidden rounded-2xl",
      ].join(" ")}
      style={{ backgroundImage: `url(${backgroundImageUrl})` }}
    >
      <div className="sticky top-3 z-30 w-full rounded-xl bg-black/40 px-4 py-2 shadow-lg backdrop-blur-sm">
        {toolbar}
      </div>
      {bookBand}
      {thumbnailRail && <div className="rounded-xl bg-black/35 px-2 py-2 backdrop-blur-md">{thumbnailRail}</div>}
    </div>
  );
}
