"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Play, Volume2, X } from "lucide-react";
import type { BookElement } from "@/lib/library-book-elements";

// Rendered via a portal straight onto document.body — book-page.tsx's page
// wrapper has a CSS `transform: scale(...)` on it (for fitting the fixed
// design-pixel canvas to whatever size the flipbook renders at), and
// react-pageflip's own page-curl animation applies more transforms on top
// of that. A `transform` on any ancestor turns `position: fixed` into
// "fixed relative to that ancestor" instead of the real viewport, so
// without the portal this would render clipped/mis-scaled inside the page
// instead of as a true full-screen overlay.
function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 p-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
    </div>,
    document.body
  );
}

// Click-to-zoom only applies in the reader (`editable` is editor-canvas.tsx
// only) — in the editor, a click needs to reach react-rnd's own drag/select
// handling on the wrapper, not open a lightbox.
function ImageElement({ url, alt, editable }: { url: string; alt: string; editable: boolean }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        draggable={false}
        className={`h-full w-full object-contain ${editable ? "" : "cursor-zoom-in"}`}
        onClick={editable ? undefined : () => setZoomed(true)}
      />
      {zoomed && <ImageLightbox src={url} alt={alt} onClose={() => setZoomed(false)} />}
    </>
  );
}

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
      // `content` is sanitized rich-text HTML from the editor's Tiptap
      // instance (see sanitizeBookText) — bold/italic/underline/lists/
      // tables live as real markup now, not whole-element booleans.
      // `prose` (Tailwind Typography) gives that markup sensible default
      // spacing/list-bullets/table borders without hand-rolled CSS; fontSize
      // on the wrapper scales every prose element proportionally since
      // Typography sizes everything in em.
      return (
        <div
          className="book-text prose prose-sm h-full w-full max-w-none overflow-hidden break-words"
          style={{ fontSize: element.fontSize, color: element.color, textAlign: element.align }}
          dangerouslySetInnerHTML={{ __html: element.content }}
        />
      );
    case "image":
      return element.url ? (
        <ImageElement url={element.url} alt={element.alt ?? ""} editable={editable} />
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
    case "button": {
      const buttonStyle = { backgroundColor: element.bgColor, color: element.textColor };
      // A real <a> in the editor would try to navigate/open a tab on every
      // click, fighting react-rnd's own click-to-select/drag handling (and
      // risking the admin losing unsaved changes by accidentally
      // navigating the editor itself away). Editable mode gets an inert
      // look-alike; only the actual reader gets a real, clickable link.
      if (editable) {
        return (
          <div
            className="flex h-full w-full items-center justify-center rounded-lg text-center text-sm font-medium"
            style={buttonStyle}
          >
            {element.label}
          </div>
        );
      }
      return (
        <a
          href={element.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-full w-full items-center justify-center rounded-lg text-center text-sm font-medium"
          style={buttonStyle}
        >
          {element.label}
        </a>
      );
    }
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
