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
      variant={hasBackground ? "dark" : "light"}
    />
  );

  const thumbnailRail = (
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
  // since max-h-[75vh] bounds it against the full viewport height without
  // knowing how much room the title/description above it already used. If
  // the toolbar just scrolled away with the rest of the page, a reader
  // mid-book would lose every control until they scrolled back up — sticky
  // keeps it pinned near the top of the viewport instead, regardless of
  // where the book/thumbnails have scrolled to.
  const stickyToolbar = <div className="sticky top-3 z-30">{toolbar}</div>;

  if (!hasBackground) {
    return (
      <div
        ref={containerRef}
        className={
          isFullscreen
            ? "flex h-full w-full flex-col items-center justify-center gap-3 bg-background p-6"
            : "flex max-h-[75vh] w-full flex-col items-center gap-3"
        }
      >
        {bookBand}
        {stickyToolbar}
        {thumbnailRail}
      </div>
    );
  }

  // With a backdrop image, the reader becomes a full "reading nook" scene:
  // the toolbar is its own solid dark bar docked above the image (never
  // overlapping it — an earlier version floated the toolbar as a pill *over*
  // the image and the user correctly called that out against a reference
  // screenshot: real examples keep controls in a dedicated strip, never
  // competing with whatever graphic sits underneath), then the image fills
  // the rest of the frame edge-to-edge (bg-cover, deliberately cropping to
  // fill rather than letterboxing to the image's own shape — also settled
  // by the same reference: the backdrop reads as full-bleed wallpaper, not
  // a bordered photo), with the book centered on top of it.
  return (
    <div ref={containerRef} className={isFullscreen ? "flex h-full w-full flex-col" : "flex w-full flex-col overflow-hidden rounded-2xl"}>
      <div className="sticky top-0 z-30 flex items-center justify-center bg-slate-800 px-4 py-2.5">{toolbar}</div>
      <div
        className={[
          "flex flex-1 flex-col items-center gap-4 bg-cover bg-center px-4 py-6 sm:py-10",
          isFullscreen ? "justify-center" : "max-h-[75vh]",
        ].join(" ")}
        style={{ backgroundImage: `url(${backgroundImageUrl})` }}
      >
        {bookBand}
        <div className="rounded-xl bg-black/35 px-2 py-2 backdrop-blur-md">{thumbnailRail}</div>
      </div>
    </div>
  );
}
