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
//
// `editable` (editor-canvas.tsx only) adds a transparent overlay on top of
// the video iframe. A cross-origin iframe swallows every mouse event that
// lands on it, so without this overlay react-rnd's drag handlers (bound to
// the element's wrapper div) never fire and the video can't be moved/resized
// in the editor.
export function BookElementRenderer({
  element,
  isActive = true,
  editable = false,
}: {
  element: BookElement;
  isActive?: boolean;
  editable?: boolean;
}) {
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
            fontStyle: element.italic ? "italic" : "normal",
            textDecoration: element.underline ? "underline" : "none",
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
      // A directly-uploaded file wins over a YouTube link when both are set
      // — see the schema comment on videoElementSchema.url.
      if (element.url) {
        if (!isActive) {
          return (
            <div className="flex h-full w-full items-center justify-center gap-1.5 rounded-md bg-black text-xs text-white/80">
              <Play className="h-8 w-8" />
            </div>
          );
        }
        return (
          <video controls className="h-full w-full rounded-md bg-black" src={element.url}>
            <track kind="captions" />
          </video>
        );
      }
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
        <div className="relative h-full w-full">
          <iframe
            className="h-full w-full rounded-md"
            src={`https://www.youtube.com/embed/${element.youtubeId}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
          {editable && <div className="absolute inset-0" />}
        </div>
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
