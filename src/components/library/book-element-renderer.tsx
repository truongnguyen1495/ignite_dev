"use client";

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Play, Volume2, X, Maximize2 } from "lucide-react";
import type { BookElement } from "@/lib/library-book-elements";

// react-pageflip starts a flip-drag from NATIVE mousedown/touchstart
// listeners attached directly to its own `.stf__block` container (see
// setHandlers in node_modules/page-flip/src/UI/UI.ts), exempting only
// events whose *exact* target is an `<a>`/`<button>` tag — a click landing
// on the <svg> icon inside one of our buttons, or anywhere on a <video>/
// <audio>/<img>, is fair game to it. A React onMouseDown={stopPropagation}
// handler CANNOT stop that: React delivers synthetic events from a
// delegated listener at the app root — an ancestor of `.stf__block` — so by
// the time a React handler runs, page-flip's own listener has already fired
// and grabbed the page. (Confirmed frame-by-frame from a screen recording:
// clicking the video expand button opened the lightbox AND curled the page
// underneath it, and the finished flip then deactivated the page and yanked
// the playing lightbox shut.) Only a native listener on the element itself
// — deeper than `.stf__block`, so it fires first in the bubble phase — cuts
// the event off in time. Attached via ref; the guard property keeps
// StrictMode's double ref-invocation from stacking duplicate listeners, and
// listeners are never removed on purpose — they die with the node.
function stopFlipGestureRef(node: (HTMLElement & { __stopFlip?: true }) | null) {
  if (!node || node.__stopFlip) return;
  node.__stopFlip = true;
  const stop = (e: Event) => e.stopPropagation();
  node.addEventListener("mousedown", stop);
  node.addEventListener("touchstart", stop);
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
      {/* No stop-flip ref needed inside either lightbox: the portal hangs
          off document.body, outside `.stf__block`, so page-flip's listeners
          never see events from here in the first place. */}
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
  // Zoom state lives in BookLightboxProvider when one is mounted (the
  // reader always has one, via FlipbookChrome) so it survives flipbook
  // remounts — see the provider's comment. Local state is only the fallback
  // for provider-less contexts (editor/thumbnails), where zooming is
  // disabled anyway.
  const lightbox = useContext(BookLightboxContext);
  const [localZoomed, setLocalZoomed] = useState(false);
  const openZoom = () => {
    if (lightbox) lightbox.open({ kind: "image", src: url, alt });
    else setLocalZoomed(true);
  };
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        draggable={false}
        className={`h-full w-full object-contain ${editable ? "" : "cursor-zoom-in"}`}
        onClick={editable ? undefined : openZoom}
        ref={editable ? undefined : stopFlipGestureRef}
      />
      {!lightbox && localZoomed && <ImageLightbox src={url} alt={alt} onClose={() => setLocalZoomed(false)} />}
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

// What the reader currently has zoomed into a lightbox, if anything.
type BookLightboxContent =
  | { kind: "image"; src: string; alt: string }
  | { kind: "video-file"; url: string }
  | { kind: "youtube"; youtubeId: string };

type BookLightboxState = {
  content: BookLightboxContent | null;
  open: (content: BookLightboxContent) => void;
  close: () => void;
};

const BookLightboxContext = createContext<BookLightboxState | null>(null);

function YoutubeLightboxIframe({ youtubeId }: { youtubeId: string }) {
  return (
    <iframe
      className="h-full w-full rounded-md"
      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
      title="YouTube video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}

// Owns the zoom-lightbox state for everything rendered underneath it, and
// renders the lightbox itself. This state deliberately does NOT live inside
// the individual image/video elements: those sit inside `<HTMLFlipBook
// key={bookKey}>`, and that key changes — remounting the whole subtree and
// wiping its state — on any real available-size change. Entering fullscreen
// is exactly such a change (the browser chrome hides, the viewport grows),
// so a lightbox whose state lived in the element died the moment the
// YouTube player inside it went fullscreen: the remount unmounted the
// fullscreened iframe, which also force-exited fullscreen — the reader got
// dumped straight back to the book page (real user report, screenshot-
// confirmed). Same story for rotating a phone or resizing the window while
// zoomed. FlipbookChrome mounts this provider at its stable root, above the
// keyed subtree, so the lightbox now survives all of that.
export function BookLightboxProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<BookLightboxContent | null>(null);
  const value = useMemo<BookLightboxState>(
    () => ({ content, open: setContent, close: () => setContent(null) }),
    [content]
  );
  return (
    <BookLightboxContext.Provider value={value}>
      {children}
      {content?.kind === "image" && (
        <ImageLightbox src={content.src} alt={content.alt} onClose={() => setContent(null)} />
      )}
      {content?.kind === "video-file" && (
        <VideoLightbox onClose={() => setContent(null)}>
          <UploadedVideo url={content.url} className="h-full w-full rounded-md bg-black" autoPlay />
        </VideoLightbox>
      )}
      {content?.kind === "youtube" && (
        <VideoLightbox onClose={() => setContent(null)}>
          <YoutubeLightboxIframe youtubeId={content.youtubeId} />
        </VideoLightbox>
      )}
    </BookLightboxContext.Provider>
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
      ref={stopFlipGestureRef}
      onClick={onClick}
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
        ref={(node) => {
          videoRef.current = node;
          stopFlipGestureRef(node);
        }}
        controls
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        className={className}
        src={`${url}#t=0.001`}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <track kind="captions" />
      </video>
      {!playing && (
        <button
          type="button"
          ref={stopFlipGestureRef}
          onClick={() => videoRef.current?.play()}
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
  // Zoom state lives in BookLightboxProvider when mounted (always, in the
  // reader) so the lightbox survives flipbook remounts — see the provider's
  // comment. `zoomed` here means "the lightbox is showing THIS element's
  // content": with the same video placed on several pages, every copy shows
  // the muted placeholder while any of them is zoomed, which is exactly
  // right (none of them should be playing sound under the lightbox).
  const lightbox = useContext(BookLightboxContext);
  const [localZoomed, setLocalZoomed] = useState(false);
  const zoomed = lightbox
    ? url
      ? lightbox.content?.kind === "video-file" && lightbox.content.url === url
      : lightbox.content?.kind === "youtube" && lightbox.content.youtubeId === youtubeId
    : localZoomed;
  const openZoom = () => {
    if (lightbox) lightbox.open(url ? { kind: "video-file", url } : { kind: "youtube", youtubeId });
    else setLocalZoomed(true);
  };
  const closeZoom = () => {
    if (lightbox) lightbox.close();
    else setLocalZoomed(false);
  };
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
    // While zoomed, the in-page player unmounts (placeholder box instead) —
    // the lightbox renders its own player, and leaving both mounted meant
    // two players with sound over the same file at once.
    return (
      <div className="relative h-full w-full">
        {zoomed ? (
          <div className="flex h-full w-full items-center justify-center rounded-md bg-black text-white/80">
            <Play className="h-8 w-8" />
          </div>
        ) : (
          <UploadedVideo url={url} className="h-full w-full rounded-md bg-black" />
        )}
        {canExpand && !zoomed && <ExpandVideoButton onClick={openZoom} />}
        {!lightbox && zoomed && (
          <VideoLightbox onClose={closeZoom}>
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
            ref={stopFlipGestureRef}
            onClick={() => setStarted(true)}
            aria-label="Phát video"
            className="absolute inset-0 flex items-center justify-center text-white"
          >
            <Play className="h-8 w-8" fill="currentColor" />
          </button>
        ) : (
          <Play className="absolute inset-0 m-auto h-8 w-8 text-white" />
        )}
        {canExpand && !zoomed && <ExpandVideoButton onClick={openZoom} />}
        {!lightbox && zoomed && (
          <VideoLightbox onClose={closeZoom}>
            <YoutubeLightboxIframe youtubeId={youtubeId} />
          </VideoLightbox>
        )}
      </div>
    );
  }
  // While zoomed, the in-page iframe is swapped for the static thumbnail —
  // the lightbox mounts a second autoplay iframe, and leaving the in-page
  // one mounted meant both played sound at once. Closing the lightbox
  // remounts the in-page iframe fresh (autoplay=1), so playback resumes.
  return (
    <div className="relative h-full w-full">
      {zoomed ? (
        <div className="h-full w-full overflow-hidden rounded-md bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
            alt=""
            className="h-full w-full object-cover opacity-70"
            draggable={false}
          />
        </div>
      ) : (
        <iframe
          className="h-full w-full rounded-md"
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}
      {editable && <div className="absolute inset-0" />}
      {canExpand && !zoomed && <ExpandVideoButton onClick={openZoom} />}
      {!lightbox && zoomed && (
        <VideoLightbox onClose={closeZoom}>
          <YoutubeLightboxIframe youtubeId={youtubeId} />
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
          ref={editable ? undefined : stopFlipGestureRef}
        >
          <source src={element.url} />
        </audio>
      );
  }
}
