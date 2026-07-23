"use client";

import type { ReactNode, RefObject } from "react";
import { FlipbookToolbar } from "./flipbook-toolbar";
import { FlipbookThumbnailRail } from "./flipbook-thumbnail-rail";
import { useAutoHideControls } from "./use-auto-hide-controls";
import { BookLightboxProvider } from "./book-element-renderer";

// Shared outer chrome for both BookFlipbook and PdfFlipbook: the fullscreen
// container (containerRef gets passed to requestFullscreen by the caller's
// useFullscreen hook), the toolbar, and the thumbnail rail. `bookArea` is
// the caller's own <HTMLFlipBook> +
// zoom-overlay markup — kept out of this component since react-pageflip
// needs its ref/children wired up directly by each format's component.
export function FlipbookChrome({
  containerRef,
  isFullscreen,
  isFakeFullscreen = false,
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
  isFullscreen: boolean;
  // iPhone Safari has no Fullscreen API for regular elements (see
  // use-fullscreen.ts) — when set, "fullscreen" is emulated by pinning this
  // same container over the whole viewport with position:fixed instead of
  // the native API. dvh (not h-full) so Safari's collapsing address bar
  // never leaves a dead strip at the bottom.
  isFakeFullscreen?: boolean;
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
      variant="light"
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

  // In fullscreen specifically, the toolbar also auto-hides after a couple
  // seconds of no mouse movement (video-player style) and fades back in the
  // instant the mouse moves — pointer-events-none while faded out so the
  // invisible bar can't eat clicks meant for the page underneath it.
  const controlsVisible = useAutoHideControls(isFullscreen);

  if (isFullscreen) {
    // Real video players (YouTube etc.) float their controls *over* the
    // content instead of reserving a layout row for them — the content
    // always gets the full frame, controls just dim in on top temporarily.
    // The old approach kept the toolbar/thumbnails as normal flex siblings
    // even in fullscreen, just fading their opacity when auto-hidden; that
    // left their full layout height reserved-but-invisible once hidden — a
    // dead gap between the book and where the (invisible) controls still
    // sat, confirmed via direct layout measurement on a real device report.
    // Making them `absolute` here removes them from the flex flow entirely,
    // so bookBand's flex-1 (and the ResizeObserver height it feeds — see
    // use-available-height.ts) always resolves against the *full* fullscreen
    // frame, regardless of whether the controls are currently shown.
    // BookLightboxProvider sits at the root of BOTH return branches — same
    // component type in the same position, so React keeps its state (an
    // open lightbox) across the fullscreen/normal branch switch, and it's
    // above the caller's key-remounted <HTMLFlipBook> so zoomed media
    // survives flipbook remounts (see the provider's own comment).
    return (
      <BookLightboxProvider>
        <div
          ref={containerRef}
          className={`flex items-center justify-center bg-background ${
            isFakeFullscreen
              ? "fixed inset-0 z-50 h-[100vh] supports-[height:100dvh]:h-[100dvh] w-full"
              : "relative h-full w-full"
          }`}
        >
          <div className="flex h-full w-full items-center justify-center p-6">{bookArea}</div>
          <div
            className={`absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-3 bg-gradient-to-t from-background via-background/90 to-transparent px-6 pb-4 pt-12 transition-opacity duration-300 ${
              controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {toolbar}
            {thumbnailRail}
          </div>
        </div>
      </BookLightboxProvider>
    );
  }

  // On a tall book (or a small/short browser window), this whole block can
  // end up taller than the viewport — the *page* scrolls, not this block,
  // since max-h-[75vh] bounds it against the full viewport height without
  // knowing how much room the title/description above it already used. If
  // the toolbar just scrolled away with the rest of the page, a reader
  // mid-book would lose every control until they scrolled back up — sticky
  // keeps it pinned near the top of the viewport instead, regardless of
  // where the book/thumbnails have scrolled to. (controlsVisible is always
  // true here — useAutoHideControls only fades outside fullscreen — so this
  // stays a plain always-visible bar, unaffected by the fullscreen change
  // above.)
  const stickyToolbar = (
    <div className="sticky top-3 z-30">{toolbar}</div>
  );

  // A *definite* height here (not just max-height) matters, not just
  // styling: flexbox only actually shrinks a flex-1 child (bookBand) down
  // to "whatever's left after siblings" when the container itself has a
  // definite size to distribute — with max-height alone, the column's own
  // preferred size is still driven by its children's natural content size,
  // so a book whose own width-driven sizing (see book-flipbook.tsx/
  // pdf-flipbook.tsx + useAvailableHeight) wants to render taller than the
  // toolbar+thumbnails budget just overflows *past* them instead of being
  // constrained to fit — visually reads as the book overlapping/hiding the
  // mode toggle above the reader and the toolbar/thumbnail rail below it,
  // confirmed from real screenshots of a short browser window doing exactly
  // that. overflow-hidden is a safety net for any residual rounding.
  return (
    <BookLightboxProvider>
      <div
        ref={containerRef}
        className="flex h-[75vh] supports-[height:100dvh]:h-[75dvh] w-full flex-col items-center gap-3 overflow-hidden"
      >
        {bookBand}
        {stickyToolbar}
        {thumbnailRail}
      </div>
    </BookLightboxProvider>
  );
}
