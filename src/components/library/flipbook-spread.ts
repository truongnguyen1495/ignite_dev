export type FlipbookOrientation = "portrait" | "landscape";

// react-pageflip's own PageState, re-declared here since its settings.d.ts
// types onChangeState's payload as `any`.
export type FlipbookState = "user_fold" | "fold_corner" | "flipping" | "read";

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
