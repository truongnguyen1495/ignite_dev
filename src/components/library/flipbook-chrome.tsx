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
        {toolbar}
        {thumbnailRail}
      </div>
    );
  }

  // With a backdrop image, the reader becomes a full "reading nook" scene —
  // the image fills the whole frame with generous room above/below the book
  // (not a tight card hugging it), and the toolbar floats as a dark
  // translucent pill over the top of it, matching the reference layout the
  // admin/user asked to mirror (image-viewer-style chrome: dark floating
  // controls over a full-bleed backdrop, book centered within).
  return (
    <div
      ref={containerRef}
      className={[
        "flex w-full flex-col items-center gap-4 bg-cover bg-center px-4 py-6 sm:py-10",
        isFullscreen ? "h-full justify-center" : "max-h-[75vh] rounded-2xl",
      ].join(" ")}
      style={{ backgroundImage: `url(${backgroundImageUrl})` }}
    >
      <div className="rounded-full bg-black/45 px-3 py-1.5 shadow-lg backdrop-blur-md">{toolbar}</div>
      {bookBand}
      <div className="rounded-xl bg-black/35 px-2 py-2 backdrop-blur-md">{thumbnailRail}</div>
    </div>
  );
}
