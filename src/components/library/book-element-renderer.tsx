"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Play, Volume2, X, Maximize2 } from "lucide-react";
import type { BookElement } from "@/lib/library-book-elements";

// react-pageflip listens for mousedown/touchstart on `window` to detect
// page-turn swipes/clicks, and only exempts an event whose *exact* target is
// an `<a>` or `<button>` tag (see checkTarget in page-flip's bundled
// source). Clicking an icon *inside* one of our buttons lands on the icon's
// own <svg>/<path> node, not the <button>, so the library doesn't recognize
// it and starts a flip-drag gesture right underneath — the video/image
// zoom controls below all need this to stop that gesture before it ever
// reaches `window`, or clicking them flips the page instead of zooming.
function stopFlipGesture(e: { stopPropagation: () => void }) {
  e.stopPropagation();
}

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
        onMouseDown={stopFlipGesture}
        onTouchStart={stopFlipGesture}
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
        onMouseDown={editable ? undefined : stopFlipGesture}
        onTouchStart={editable ? undefined : stopFlipGesture}
      />
      {zoomed && <ImageLightbox src={url} alt={alt} onClose={() => setZoomed(false)} />}
    </>
  );
}

// Same portal reasoning as ImageLightbox above. Sized to a wide max-w
// instead of filling the viewport (unlike the image one) — a bare
// aspect-video box scaled to full width/height would letterbox oddly.
function VideoLightbox({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 p-6" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        onMouseDown={stopFlipGesture}
        onTouchStart={stopFlipGesture}
        aria-label="Đóng"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="aspect-video w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}

// A small corner button rather than making the whole video clickable (unlike
// ImageElement's whole-image click target) — the video itself already needs
// clicks to reach its own play button/controls (or, for an iframe, controls
// baked into the cross-origin embed itself), so a full-area overlay would
// block that instead of just adding zoom.
function ExpandVideoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={stopFlipGesture}
      onTouchStart={stopFlipGesture}
      aria-label="Phóng to video"
      title="Phóng to"
      className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
    >
      <Maximize2 className="h-3.5 w-3.5" />
    </button>
  );
}

// A bare `<video controls src=...>` with no `preload` paints nothing but a
// black rectangle until the browser fetches enough to decode a frame, and at
// the small sizes book elements are usually placed at, Chrome hides its
// native controls bar entirely — leaving a dead black box with no way to
// even start playback. `preload="metadata"` makes the browser fetch just
// enough (a byte-range, not the whole file) to paint a real first frame, and
// the always-visible custom Play button (independent of box size, unlike
// native controls) guarantees a click target either way.
// `playsInline` matters on iPhone: without it, pressing play rips the video
// out of the book into Safari's native full-screen player. The `#t=0.001`
// media fragment exists because iOS Safari ignores `preload="metadata"` for
// the purpose of painting a first frame (it stays a black box until played);
// a fragment start time forces it to decode and paint that frame. Harmless
// everywhere else. `autoPlay` may still be blocked on iOS (sound on, no
// direct gesture on the element) — the custom Play overlay stays up in that
// case, so playback is always one tap away rather than silently broken.
function UploadedVideo({ url, className, autoPlay }: { url: string; className: string; autoPlay?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        controls
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        className={className}
        src={`${url}#t=0.001`}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onMouseDown={stopFlipGesture}
        onTouchStart={stopFlipGesture}
      >
        <track kind="captions" />
      </video>
      {!playing && (
        <button
          type="button"
          onClick={() => videoRef.current?.play()}
          onMouseDown={stopFlipGesture}
          onTouchStart={stopFlipGesture}
          aria-label="Phát video"
          className="absolute inset-0 flex items-center justify-center rounded-md bg-black/20 text-white hover:bg-black/30"
        >
          <Play className="h-10 w-10 drop-shadow-md" fill="currentColor" />
        </button>
      )}
    </div>
  );
}

// A directly-uploaded file wins over a YouTube link when both are set — see
// the schema comment on videoElementSchema.url. The expand-to-lightbox
// button only ever shows in the reader (isActive && !editable): the editor
// needs the whole area free for react-rnd's drag/select, and an inactive
// (flipped-away) page just shows the inert thumbnail.
function VideoElement({
  url,
  youtubeId,
  isActive,
  editable,
}: {
  url: string;
  youtubeId: string;
  isActive: boolean;
  editable: boolean;
}) {
  const [zoomed, setZoomed] = useState(false);
  // YouTube's embed page takes a moment to fetch its own JS player and paints
  // a plain black rectangle in the meantime — invisible on a full-size embed
  // elsewhere on the web, but glaring at the small sizes book video elements
  // are usually placed at, and it happens on every single page turn since
  // the iframe used to mount the instant a page became active. Gating the
  // real iframe behind an explicit click (showing our own instant static
  // thumbnail — already fetched directly, no iframe involved — until then)
  // means that black flash only ever happens once, right after a deliberate
  // click, instead of on every page turn.
  // Deliberately not reset when the page flips away and back — the whole
  // element unmounts its real iframe while inactive either way (see the
  // `!isActive` check below), so this only affects whether *returning* to
  // an already-started video needs a second click. Letting it stay true
  // means a video the reader already opted into just resumes; only a video
  // they never touched needs the click-to-load thumbnail.
  const [started, setStarted] = useState(false);
  const canExpand = isActive && !editable;

  if (url) {
    if (!isActive) {
      return (
        <div className="flex h-full w-full items-center justify-center gap-1.5 rounded-md bg-black text-xs text-white/80">
          <Play className="h-8 w-8" />
        </div>
      );
    }
    return (
      <div className="relative h-full w-full">
        <UploadedVideo url={url} className="h-full w-full rounded-md bg-black" />
        {canExpand && <ExpandVideoButton onClick={() => setZoomed(true)} />}
        {zoomed && (
          <VideoLightbox onClose={() => setZoomed(false)}>
            <UploadedVideo url={url} className="h-full w-full rounded-md bg-black" autoPlay />
          </VideoLightbox>
        )}
      </div>
    );
  }

  if (!youtubeId) {
    return <div className="flex h-full w-full items-center justify-center bg-faint-bg text-xs text-muted">Video</div>;
  }
  if (!isActive || !started) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-md bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
          alt=""
          className="h-full w-full object-cover opacity-70"
          draggable={false}
        />
        {isActive && !editable ? (
          <button
            type="button"
            onClick={() => setStarted(true)}
            onMouseDown={stopFlipGesture}
            onTouchStart={stopFlipGesture}
            aria-label="Phát video"
            className="absolute inset-0 flex items-center justify-center text-white"
          >
            <Play className="h-8 w-8" fill="currentColor" />
          </button>
        ) : (
          <Play className="absolute inset-0 m-auto h-8 w-8 text-white" />
        )}
        {canExpand && <ExpandVideoButton onClick={() => setZoomed(true)} />}
        {zoomed && (
          <VideoLightbox onClose={() => setZoomed(false)}>
            <iframe
              className="h-full w-full rounded-md"
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </VideoLightbox>
        )}
      </div>
    );
  }
  return (
    <div className="relative h-full w-full">
      <iframe
        className="h-full w-full rounded-md"
        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
      {editable && <div className="absolute inset-0" />}
      {canExpand && <ExpandVideoButton onClick={() => setZoomed(true)} />}
      {zoomed && (
        <VideoLightbox onClose={() => setZoomed(false)}>
          <iframe
            className="h-full w-full rounded-md"
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </VideoLightbox>
      )}
    </div>
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
      return (
        <VideoElement url={element.url} youtubeId={element.youtubeId} isActive={isActive} editable={editable} />
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
        <audio
          controls
          className="w-full"
          style={{ height: element.height }}
          onMouseDown={stopFlipGesture}
          onTouchStart={stopFlipGesture}
        >
          <source src={element.url} />
        </audio>
      );
  }
}
