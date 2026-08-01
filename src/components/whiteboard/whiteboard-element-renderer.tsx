"use client";

import { Fragment, useRef, useState } from "react";
import { ExternalLink, Pause, Play } from "lucide-react";
import type { PositionedWhiteboardElement, ShapeKind, TextLink } from "@/lib/whiteboard-elements";

// Slices one line of a standalone Text element's content against its
// per-range links (element.links, character offsets into the FULL content
// string — `lineStart` is this line's own offset into that string), turning
// covered spans into real anchors. draggable={false} + stopping the anchor's
// own mousedown from bubbling is the same "don't let this child swallow the
// Rnd wrapper's drag" precaution as the image/linkCard cases below — an
// anchor is natively draggable and would otherwise fight the canvas drag.
function renderTextRuns(line: string, lineStart: number, links: TextLink[]): React.ReactNode[] {
  const relevant = links
    .map((l) => ({ start: Math.max(l.start, lineStart), end: Math.min(l.end, lineStart + line.length), url: l.url }))
    .filter((l) => l.start < l.end)
    .sort((a, b) => a.start - b.start);
  if (relevant.length === 0) return [line || " "];
  const runs: React.ReactNode[] = [];
  let cursor = lineStart;
  relevant.forEach((l, i) => {
    if (l.start > cursor) runs.push(line.slice(cursor - lineStart, l.start - lineStart));
    runs.push(
      <a
        key={i}
        href={l.url}
        target="_blank"
        rel="noopener noreferrer"
        draggable={false}
        onMouseDown={(e) => e.stopPropagation()}
        className="underline decoration-1 underline-offset-2"
        style={{ color: "inherit" }}
      >
        {line.slice(l.start - lineStart, l.end - lineStart)}
      </a>
    );
    cursor = l.end;
  });
  if (cursor < lineStart + line.length) runs.push(line.slice(cursor - lineStart));
  return runs;
}

// Native <video controls> doesn't reliably receive clicks nested inside the
// canvas's draggable <Rnd> wrapper (same class of issue as the readOnly
// textarea below — the wrapper's own mousedown handling gets in the way), so
// uploaded videos get their own play/pause button instead. It lives in a
// bottom-right corner (same spot as the "Mở liên kết" button below) rather
// than over the element's center — a center-covering button competed with
// dragging, since click-and-drag naturally starts from the middle of an
// element. Keeping it small and out of the way leaves the rest of the video
// as a plain, always-draggable area, same as every other element type.
function UploadedVideo({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-md bg-black">
      <video
        ref={videoRef}
        src={url}
        className="h-full w-full"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        title={playing ? "Tạm dừng" : "Phát video"}
        aria-label={playing ? "Tạm dừng" : "Phát video"}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={toggle}
        className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
    </div>
  );
}

function YoutubeEmbed({ youtubeId, isSelected }: { youtubeId: string; isSelected: boolean }) {
  const [activated, setActivated] = useState(false);
  // Separate from `isSelected` on purpose — gating the shield directly on
  // selection raced with react-rnd's own drag tracking: the same mousedown
  // that starts a drag also selects the element, so the shield would unmount
  // mid-gesture and the rest of the drag (now landing inside a cross-origin
  // iframe, whose events never bubble to our document) would silently stop
  // dead a couple pixels in. A double-click is a distinct, later gesture —
  // by the time it fires, any single-click drag has already finished.
  const [interactive, setInteractive] = useState(false);
  // Resets `interactive` the moment `isSelected` flips to false — the
  // React-recommended "adjust state during render" pattern for this exact
  // case (derived reset keyed off a prop change) rather than an effect,
  // which would fire a redundant extra render after the one that already
  // updated `isSelected`.
  const [prevIsSelected, setPrevIsSelected] = useState(isSelected);
  if (isSelected !== prevIsSelected) {
    setPrevIsSelected(isSelected);
    if (!isSelected) setInteractive(false);
  }

  if (activated) {
    return (
      <div className="relative h-full w-full">
        <iframe
          className="h-full w-full rounded-md"
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
          title="YouTube video"
          allow="accelerate-compute; autoplay; encrypted-media"
          allowFullScreen
        />
        {!interactive && (
          // A cross-origin iframe captures every pointer event that lands
          // inside its bounds in its own document — our drag handler on the
          // <Rnd> wrapper never even sees a mousedown that hits the embed,
          // so once activated the element would be stuck in place forever.
          // This transparent shield sits on top so a click-and-drag always
          // grabs the whiteboard element (autoplay still runs underneath
          // regardless — this only blocks pointer interaction). Double-click
          // to reach the player's own controls (pause/seek/volume); clicking
          // away deselects and brings the shield back.
          <div className="absolute inset-0 cursor-pointer" onDoubleClick={() => setInteractive(true)} title="Nhấp đúp để tương tác với video" />
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-md bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
        alt=""
        draggable={false}
        className="h-full w-full object-cover opacity-70"
      />
      <button
        type="button"
        title="Phát video"
        aria-label="Phát video"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => setActivated(true)}
        className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
      >
        <Play className="h-4 w-4" />
      </button>
    </div>
  );
}

const SHAPE_CLIP_PATHS: Record<ShapeKind, string | undefined> = {
  rectangle: undefined,
  ellipse: undefined,
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  triangle: "polygon(50% 0%, 100% 100%, 0% 100%)",
  star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
};

// Renders one placeable element at its natural size, filling whatever box
// its caller already positioned/sized it into (whiteboard-canvas.tsx's
// <Rnd>) — mirrors BookElementRenderer's "never sets its own position"
// convention (src/components/library/book-element-renderer.tsx). Connectors
// are never routed through here — they're a derived SVG overlay, see
// connector-layer.tsx.
export function WhiteboardElementRenderer({ element, isSelected }: { element: PositionedWhiteboardElement; isSelected: boolean }) {
  switch (element.type) {
    case "sticky":
      // A plain non-focusable div, not a readOnly <textarea> — a readOnly
      // textarea still accepts focus on click, which silently swallowed
      // every keyboard shortcut (Tab/Enter mindmap creation, Delete,
      // Ctrl+D...) the moment a sticky was selected, since isEditingText()
      // in whiteboard-editor.tsx sees TEXTAREA as "currently typing" and
      // bails out. Editing content happens through the property panel's own
      // Textarea instead (property-panel.tsx), never inline on the canvas.
      return (
        <div
          className="h-full w-full overflow-hidden whitespace-pre-wrap break-words rounded-md p-3"
          style={{
            backgroundColor: element.bgColor,
            color: element.textColor,
            fontSize: element.fontSize,
            fontWeight: element.bold ? 700 : undefined,
            textDecoration: element.underline ? "underline" : undefined,
          }}
        >
          {element.content || <span className="text-black/30">Ghi chú...</span>}
        </div>
      );
    case "shape":
      return (
        <div
          className="relative h-full w-full"
          style={{
            backgroundColor: element.fill,
            border: `2px solid ${element.stroke}`,
            borderRadius: element.kind === "ellipse" ? "50%" : element.kind === "rectangle" ? element.borderRadius : 0,
            clipPath: SHAPE_CLIP_PATHS[element.kind],
          }}
        >
          {element.content && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden whitespace-pre-wrap break-words p-4 text-center"
              style={{
                color: element.textColor,
                fontSize: element.fontSize,
                fontWeight: element.bold ? 700 : undefined,
                textDecoration: element.underline ? "underline" : undefined,
              }}
            >
              {element.content}
            </div>
          )}
        </div>
      );
    case "text": {
      const lines = element.content.split("\n");
      // Each line's own offset into the full `content` string (each line
      // plus the '\n' that split() consumed) — computed without a mutable
      // running counter so this stays a pure render-time calculation.
      const lineOffsets = lines.map((_, i) => lines.slice(0, i).reduce((sum, l) => sum + l.length + 1, 0));
      const textStyle: React.CSSProperties = {
        color: element.textColor,
        fontSize: element.fontSize,
        fontWeight: element.bold ? 700 : undefined,
        fontStyle: element.italic ? "italic" : undefined,
        textDecoration:
          [element.underline && "underline", element.strikethrough && "line-through"].filter(Boolean).join(" ") || undefined,
        textAlign: element.align,
      };
      return (
        <div
          className="relative flex h-full w-full overflow-hidden rounded-md p-1"
          style={{
            backgroundColor: element.bgColor,
            justifyContent: element.align === "center" ? "center" : element.align === "right" ? "flex-end" : "flex-start",
          }}
        >
          {element.bulletList ? (
            <ul className="list-disc pl-5" style={textStyle}>
              {lines.map((line, i) => (
                <li key={i} className="whitespace-pre-wrap break-words">
                  {renderTextRuns(line, lineOffsets[i], element.links)}
                </li>
              ))}
            </ul>
          ) : (
            <div className="w-full whitespace-pre-wrap break-words" style={textStyle}>
              {element.content ? (
                lines.map((line, i) => (
                  <Fragment key={i}>
                    {i > 0 && <br />}
                    {renderTextRuns(line, lineOffsets[i], element.links)}
                  </Fragment>
                ))
              ) : (
                <span className="text-muted">Nhập chữ...</span>
              )}
            </div>
          )}
        </div>
      );
    }
    case "image":
      return element.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={element.url} alt={element.alt ?? ""} draggable={false} className="h-full w-full object-contain" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-faint-bg text-xs text-muted">Ảnh</div>
      );
    case "video":
      if (element.url) {
        return <UploadedVideo url={element.url} />;
      }
      if (element.youtubeId) {
        return <YoutubeEmbed youtubeId={element.youtubeId} isSelected={isSelected} />;
      }
      return <div className="flex h-full w-full items-center justify-center bg-faint-bg text-xs text-muted">Video</div>;
    case "drawing": {
      // viewBox is derived from `points` alone, never from the element's
      // current width/height — points are fixed in a natural coordinate
      // space set once at draw time, so letting the <svg> (sized to the
      // Rnd box's current width/height via 100%/100%) map that fixed space
      // onto whatever the box's current size is is exactly what makes
      // dragging a resize handle stretch the drawing, matching every other
      // element type's resize behavior with no bespoke math here.
      const xs = element.points.map((p) => p.x);
      const ys = element.points.map((p) => p.y);
      const pad = element.strokeWidth / 2 + 2;
      const minX = Math.min(...xs) - pad;
      const minY = Math.min(...ys) - pad;
      const width = Math.max(...xs) - Math.min(...xs) + pad * 2;
      const height = Math.max(...ys) - Math.min(...ys) + pad * 2;
      return (
        <svg width="100%" height="100%" viewBox={`${minX} ${minY} ${width} ${height}`} preserveAspectRatio="none">
          <polyline
            points={element.points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={element.color}
            strokeWidth={element.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
    case "linkCard":
      // A real <a> filling the whole box would swallow the mousedown
      // react-rnd's own drag-start listener needs on this element's
      // wrapper (same issue BookElementRenderer's "button" case avoids by
      // rendering an inert look-alike while editable) — so only the small
      // corner button actually opens the link; the card body stays a plain
      // draggable/selectable div.
      return element.url ? (
        <div className="relative flex h-full w-full items-center gap-2 overflow-hidden rounded-lg border border-border bg-surface p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${element.domain}&sz=64`}
            alt=""
            draggable={false}
            className="h-8 w-8 shrink-0 rounded"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{element.title || element.domain}</p>
            <p className="truncate text-xs text-muted">{element.domain}</p>
          </div>
          <button
            type="button"
            title="Mở liên kết"
            aria-label="Mở liên kết"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => window.open(element.url, "_blank", "noopener,noreferrer")}
            className="shrink-0 rounded p-1 text-muted hover:bg-surface-hover hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-faint-bg text-xs text-muted">Link</div>
      );
  }
}
