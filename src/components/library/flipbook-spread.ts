export type FlipbookOrientation = "portrait" | "landscape";

// Mirrors react-pageflip's own spread pairing so the UI's page-range label
// and prev/next disabling agree with what's actually on screen. With
// showCover=true (see BookFlipbook/PdfFlipbook), the library always shows
// page 0 alone (like a book's front cover), then pairs the rest two at a
// time — leaving a lone trailing page only when the interior page count
// (totalPages - 1) is odd, i.e. when totalPages itself is even.
export function isPagedSpread(orientation: FlipbookOrientation, currentPage: number, totalPages: number): boolean {
  return orientation === "landscape" && currentPage > 0 && currentPage < totalPages - 1;
}

export function isLastSpread(orientation: FlipbookOrientation, currentPage: number, totalPages: number): boolean {
  if (orientation !== "landscape") return currentPage >= totalPages - 1;
  return totalPages % 2 === 0 ? currentPage >= totalPages - 1 : currentPage >= totalPages - 2;
}

// Inserts one blank filler item right after the cover (index 1, not
// appended at the end) whenever `items` has an odd length — the odd/even
// pairing math above only lands the *trailing* item alone when totalPages
// is even, so an odd-length book would otherwise pair its real last page
// with the second-to-last instead of showing it alone like the cover does.
// Inserting after the cover (rather than at the very end) keeps the real
// last-authored item as the array's tail, so it's what ends up alone.
export function withBlankPad<T>(items: T[], blank: T): T[] {
  if (items.length < 2 || items.length % 2 === 0) return items;
  return [items[0], blank, ...items.slice(1)];
}

// Thumbnail rail pairing: a gap belongs *before* index i whenever i starts
// a new spread group — the cover (index 0) doesn't need a leading gap, and
// every odd index starts a new pair (1-2, 3-4, ...). This only produces the
// intended "lone last page gets its own gap" result when totalPages is
// even (see withBlankPad above) — same precondition as isPagedSpread.
export function thumbnailGapBefore(index: number): boolean {
  return index > 0 && index % 2 === 1;
}
