import type { ReactNode } from "react";

const MIN_STACK_PX = 4;
const MAX_STACK_PX = 16;

function stackWidth(fraction: number): number {
  const clamped = Math.min(1, Math.max(0, fraction));
  return Math.round(MIN_STACK_PX + (MAX_STACK_PX - MIN_STACK_PX) * clamped);
}

// Wraps the actual <HTMLFlipBook> (passed as children) with a faux
// paper-stack edge on each side — react-pageflip only ever renders the
// single current page, so without this the book reads as one flat sheet
// floating in space instead of a bound book with real thickness. Each
// side's thickness tracks reading progress: the "pages ahead" side starts
// thick and thins out as `currentPage` approaches `totalPages`, and the
// "pages behind" side does the reverse — the same visual cue paperback apps
// use for a remaining-pages indicator. Styling lives in globals.css
// (.flipbook-stack*) since it needs 3D transforms or offsetting Tailwind
// wouldn't gain over here.
export function FlipbookFrame({
  width,
  height,
  currentPage,
  totalPages,
  children,
}: {
  width: number;
  height: number;
  currentPage: number;
  totalPages: number;
  children: ReactNode;
}) {
  const progress = totalPages > 1 ? currentPage / (totalPages - 1) : 0;

  return (
    <div className="relative" style={{ width, height }}>
      <div className="flipbook-stack flipbook-stack--left" style={{ width: stackWidth(progress) }} />
      <div className="flipbook-stack flipbook-stack--right" style={{ width: stackWidth(1 - progress) }} />
      {children}
    </div>
  );
}
