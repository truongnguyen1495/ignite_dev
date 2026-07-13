import { BookFlipbook } from "./book-flipbook";

// Unlike PdfReader, there's no "plain view" alternative for a composed
// book — a PDF can fall back to the browser's native viewer, but there's no
// analogous static rendering of positioned text/image/shape/video/audio
// elements worth offering, so this always renders the flipbook.
export function BookReader({ itemId, title }: { itemId: string; title: string }) {
  return <BookFlipbook itemId={itemId} title={title} />;
}
