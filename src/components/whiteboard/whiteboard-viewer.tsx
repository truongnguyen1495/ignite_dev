"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BackLink } from "@/components/ui/back-link";
import type { WhiteboardElement } from "@/lib/whiteboard-elements";
import { isConnector } from "@/lib/whiteboard-elements";
import { WhiteboardElementRenderer } from "@/components/whiteboard/whiteboard-element-renderer";
import { ConnectorLayer } from "./connector-layer";
import { MIN_ZOOM, MAX_ZOOM, type Viewport } from "./whiteboard-canvas";
import { useWhiteboardBroadcast } from "@/lib/use-whiteboard-broadcast";
import { PresenceAvatars } from "./presence-avatars";

const ZOOM_STEP = 0.01;

// Read-only counterpart to WhiteboardEditor, for VIEWER/COMMENTER roles
// (see requireWhiteboardAccess in src/lib/access.ts) — deliberately a
// SEPARATE, much smaller component rather than a `readOnly` flag threaded
// through whiteboard-canvas.tsx: that file is ~1400 lines of drag/resize/
// rotate/marquee/connector/pen interaction state, and retrofitting a
// read-only mode through every one of those entry points would be high-risk
// for a component this large and already battle-tested. This one reuses
// only the two pieces of the editor that are already pure/reusable —
// WhiteboardElementRenderer (Rnd-independent) and ConnectorLayer (already
// supports a fully non-interactive render) — plus its own minimal pan/zoom,
// no toolbar, no property panel, no selection, no mutation path at all.
//
// Still live: wires the same useWhiteboardBroadcast hook the editor uses,
// so a viewer sees an editor's changes appear without a refresh and shows
// up in the presence avatar strip — it just never calls the hook's
// broadcastElements itself, since nothing here ever changes `elements`
// locally.
export function WhiteboardViewer({
  boardId,
  title,
  initialElements,
  initialViewport,
  backHref,
  currentUser,
}: {
  boardId: string;
  title: string;
  initialElements: WhiteboardElement[];
  initialViewport: Viewport;
  backHref: string;
  currentUser: { id: string; name: string };
}) {
  const [elements, setElements] = useState<WhiteboardElement[]>(initialElements);
  const [viewport, setViewport] = useState<Viewport>(initialViewport);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panStateRef = useRef<{ startClientX: number; startClientY: number; startPanX: number; startPanY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const { presentUsers } = useWhiteboardBroadcast(boardId, { userId: currentUser.id, name: currentUser.name }, setElements);

  const positioned = useMemo(() => elements.filter((el) => !isConnector(el)), [elements]);
  const connectors = useMemo(() => elements.filter(isConnector), [elements]);
  const elementsById = useMemo(() => new Map(positioned.map((el) => [el.id, el])), [positioned]);

  // Same native (non-passive) wheel listener as whiteboard-canvas.tsx, for
  // the same reason: React's synthetic onWheel is registered passive by
  // default, so e.preventDefault() inside it can't actually stop the
  // browser's own ctrl+scroll/pinch page-zoom from also firing alongside
  // this one. Ctrl/Cmd+wheel zooms toward the cursor (identical formula to
  // the editor's own, for a consistent feel); plain wheel pans.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheelNative(e: WheelEvent) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el!.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        const direction = e.deltaY > 0 ? -1 : e.deltaY < 0 ? 1 : 0;
        setViewport((prev) => {
          const worldX = (cursorX - prev.x) / prev.zoom;
          const worldY = (cursorY - prev.y) / prev.zoom;
          const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom + direction * ZOOM_STEP));
          return { zoom: nextZoom, x: cursorX - worldX * nextZoom, y: cursorY - worldY * nextZoom };
        });
        return;
      }
      setViewport((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY, zoom: prev.zoom }));
    }
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <div
            ref={containerRef}
            data-whiteboard-surface
            className={`relative h-full w-full overflow-hidden bg-white ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
            onMouseDown={(e) => {
              if (e.button !== 0 && e.button !== 1) return;
              panStateRef.current = { startClientX: e.clientX, startClientY: e.clientY, startPanX: viewport.x, startPanY: viewport.y };
              setIsPanning(true);
            }}
            onMouseMove={(e) => {
              const start = panStateRef.current;
              if (!start) return;
              setViewport((prev) => ({
                ...prev,
                x: start.startPanX + (e.clientX - start.startClientX),
                y: start.startPanY + (e.clientY - start.startClientY),
              }));
            }}
            onMouseUp={() => {
              panStateRef.current = null;
              setIsPanning(false);
            }}
            onMouseLeave={() => {
              panStateRef.current = null;
              setIsPanning(false);
            }}
          >
            <ConnectorLayer
              connectors={connectors}
              elementsById={elementsById}
              liveOverrides={null}
              viewport={viewport}
              selectedElementIds={[]}
              onSelectConnector={() => {}}
              interactive={false}
            />
            <div
              data-canvas-bg
              className="absolute left-0 top-0"
              style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: "0 0" }}
            >
              {positioned.map((element) => (
                <div
                  key={element.id}
                  className="absolute"
                  style={{
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    zIndex: element.zIndex,
                    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                  }}
                >
                  <WhiteboardElementRenderer element={element} isSelected={false} />
                </div>
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0">
            <div className="pointer-events-auto absolute left-20 top-4 flex items-center gap-3 rounded-2xl border border-border bg-surface p-1.5 pl-3 shadow-lg">
              <BackLink href={backHref}>Quay lại</BackLink>
              <span className="h-4 w-px bg-border" />
              <span className="text-sm font-semibold text-foreground">{title}</span>
              <span className="rounded-full bg-border px-2 py-0.5 text-[10px] font-medium text-muted">Chỉ xem</span>
              <PresenceAvatars users={presentUsers} />
            </div>
            <div className="pointer-events-auto absolute bottom-4 right-4 flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-1.5 text-xs text-muted shadow-lg">
              {Math.round(viewport.zoom * 100)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
