import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

// react-pageflip measures each page's real DOM node on mount (see its
// README's "Advanced Usage" — forwardRef is required), so this can't be a
// plain function returning JSX; the ref must land on the actual page <div>.
export const PdfPage = forwardRef<HTMLDivElement, { dataUrl: string | null; pageNumber: number }>(
  function PdfPage({ dataUrl, pageNumber }, ref) {
    return (
      <div ref={ref} className="relative flex h-full w-full items-center justify-center bg-white">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={`Trang ${pageNumber}`} className="h-full w-full object-contain" draggable={false} />
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        )}
        <span className="absolute bottom-1.5 right-2 text-[10px] text-muted/70">{pageNumber}</span>
      </div>
    );
  }
);
