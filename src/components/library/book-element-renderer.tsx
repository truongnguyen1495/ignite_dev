import { Play, Volume2 } from "lucide-react";
import type { BookElement } from "@/lib/library-book-elements";

// Renders one element at its natural size, filling whatever box its caller
// already positioned/sized it into (book-page.tsx for the reader,
// editor-canvas.tsx's <Rnd> for the editor) — this component never sets its
// own position, only how the element's own content looks.
//
// `isActive` (default true, so the editor always shows live content) is how
// the reader avoids background video/audio after flipping away from a page:
// video/audio only mount their real iframe/<audio> tag while active, an
// inactive page shows an inert thumbnail/placeholder instead — simpler and
// more reliable than trying to pause a YouTube iframe via postMessage, and a
// nice side effect is only the current page's video ever actually loads.
export function BookElementRenderer({ element, isActive = true }: { element: BookElement; isActive?: boolean }) {
  switch (element.type) {
    case "text":
      return (
        <div
          className="h-full w-full overflow-hidden whitespace-pre-wrap break-words"
          style={{
            fontSize: element.fontSize,
            color: element.color,
            textAlign: element.align,
            fontWeight: element.bold ? 700 : 400,
          }}
        >
          {element.content}
        </div>
      );
    case "image":
      return element.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={element.url} alt={element.alt ?? ""} className="h-full w-full object-contain" draggable={false} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-faint-bg text-xs text-muted">Ảnh</div>
      );
    case "shape":
      return (
        <div
          className="h-full w-full"
          style={{
            backgroundColor: element.fill,
            borderRadius: element.kind === "ellipse" ? "50%" : element.borderRadius,
          }}
        />
      );
    case "button":
      return (
        <a
          href={element.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-full w-full items-center justify-center rounded-lg text-center text-sm font-medium"
          style={{ backgroundColor: element.bgColor, color: element.textColor }}
        >
          {element.label}
        </a>
      );
    case "video":
      if (!element.youtubeId) {
        return <div className="flex h-full w-full items-center justify-center bg-faint-bg text-xs text-muted">Video</div>;
      }
      if (!isActive) {
        return (
          <div className="relative h-full w-full overflow-hidden rounded-md bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://img.youtube.com/vi/${element.youtubeId}/hqdefault.jpg`}
              alt=""
              className="h-full w-full object-cover opacity-70"
              draggable={false}
            />
            <Play className="absolute inset-0 m-auto h-8 w-8 text-white" />
          </div>
        );
      }
      return (
        <iframe
          className="h-full w-full rounded-md"
          src={`https://www.youtube.com/embed/${element.youtubeId}`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      );
    case "audio":
      if (!element.url) {
        return <div className="flex h-full w-full items-center justify-center bg-faint-bg text-xs text-muted">Audio</div>;
      }
      if (!isActive) {
        return (
          <div className="flex h-full w-full items-center justify-center gap-1.5 rounded-md bg-faint-bg text-xs text-muted">
            <Volume2 className="h-3.5 w-3.5" />
            Audio
          </div>
        );
      }
      return (
        <audio controls className="w-full" style={{ height: element.height }}>
          <source src={element.url} />
        </audio>
      );
  }
}
