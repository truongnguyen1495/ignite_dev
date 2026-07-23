"use client";

import { useRef, useState } from "react";
import { Rnd } from "react-rnd";
import type { BookElement, BookPageData } from "@/lib/library-book-elements";
import { BookElementRenderer } from "@/components/library/book-element-renderer";

// Fixed editor preview width in display pixels — every element's design-unit
// x/y/width/height is converted to/from this scale on the way in/out of
// react-rnd, so saved data always stays in the book's own bookWidth/bookHeight
// units regardless of how big the editor happens to render it.
const CANVAS_DISPLAY_WIDTH = 600;

// How close (in design-pixel units) a dragged edge/center needs to land next
// to another element's or the page's edge/center before it snaps to it.
const SNAP_THRESHOLD = 6;

type SnapGuides = { x: number | null; y: number | null };
type Marquee = { startX: number; startY: number; x: number; y: number } | null;

// Renders only the currently selected page as a plain fixed-size canvas —
// deliberately NOT inside react-pageflip's HTMLFlipBook (that's reader-only,
// see book-flipbook.tsx): StPageFlip clones/re-measures each page's DOM at
// flip-init and on resize, which would fight react-rnd's own live drag state.
export function EditorCanvas({
  page,
  bookWidth,
  bookHeight,
  selectedElementIds,
  onSelectElementIds,
  onUpdateElement,
  onUpdateElements,
}: {
  page: BookPageData;
  bookWidth: number;
  bookHeight: number;
  selectedElementIds: string[];
  onSelectElementIds: (ids: string[]) => void;
  onUpdateElement: (elementId: string, patch: Partial<BookElement>) => void;
  onUpdateElements: (patches: { id: string; patch: Partial<BookElement> }[]) => void;
}) {
  const scale = CANVAS_DISPLAY_WIDTH / bookWidth;
  const displayHeight = Math.round(bookHeight * scale);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Live-drag state (design-pixel units) — only used to render a visual
  // offset for every OTHER selected element while one of them is being
  // dragged (group move) and to show snap guide lines (single-element
  // drag). Actual data only changes once, in commitElementDrag below.
  const [groupDragDelta, setGroupDragDelta] = useState<{ dx: number; dy: number } | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuides>({ x: null, y: null });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [marquee, setMarquee] = useState<Marquee>(null);

  // Mousedown-time selection change — deliberately does NOT collapse a
  // multi-selection down to just `id` when `id` is already part of it and
  // shift isn't held: that would make it impossible to drag the group by
  // grabbing one of its members, since this fires before the drag itself
  // even starts. Clicking a member of an existing group to select only it
  // is still possible via a plain (non-shift) click on it a second time.
  function selectOnMouseDown(id: string, additive: boolean) {
    if (additive) {
      onSelectElementIds(
        selectedElementIds.includes(id) ? selectedElementIds.filter((s) => s !== id) : [...selectedElementIds, id]
      );
      return;
    }
    if (selectedElementIds.includes(id) && selectedElementIds.length > 1) return;
    onSelectElementIds([id]);
  }

  // Snap candidates (design-px) for one axis: every other element's near
  // edge/center/far edge, plus the page's own edges/center.
  function axisCandidates(others: BookElement[], axis: "x" | "y", pageSize: number): number[] {
    const values = [0, pageSize / 2, pageSize];
    for (const el of others) {
      const start = axis === "x" ? el.x : el.y;
      const dim = axis === "x" ? el.width : el.height;
      values.push(start, start + dim / 2, start + dim);
    }
    return values;
  }

  // Tries the dragged element's left edge, center, then right edge (in that
  // priority order) against every candidate; the first match within
  // SNAP_THRESHOLD wins. `offset` is the fixed distance from the element's
  // own start (x or y) to that reference point (0, size/2, or size) — so
  // snapping that point onto `candidate` means the new start is
  // `candidate - offset`.
  function snapAxis(rawStart: number, size: number, candidates: number[]): { value: number; guide: number | null } {
    for (const offset of [0, size / 2, size]) {
      const point = rawStart + offset;
      for (const candidate of candidates) {
        if (Math.abs(point - candidate) <= SNAP_THRESHOLD) {
          return { value: candidate - offset, guide: candidate };
        }
      }
    }
    return { value: rawStart, guide: null };
  }

  return (
    <div
      ref={containerRef}
      className="relative shrink-0 overflow-hidden rounded-md border border-border bg-white shadow-md"
      style={{ width: CANVAS_DISPLAY_WIDTH, height: displayHeight }}
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        const rect = containerRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMarquee({ startX: x, startY: y, x, y });
        if (!e.shiftKey) onSelectElementIds([]);
      }}
      onMouseMove={(e) => {
        if (!marquee) return;
        const rect = containerRef.current!.getBoundingClientRect();
        setMarquee({ ...marquee, x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseUp={(e) => {
        if (!marquee) return;
        const left = Math.min(marquee.startX, marquee.x) / scale;
        const top = Math.min(marquee.startY, marquee.y) / scale;
        const right = Math.max(marquee.startX, marquee.x) / scale;
        const bottom = Math.max(marquee.startY, marquee.y) / scale;
        const hit = page.elements
          .filter((el) => el.x < right && el.x + el.width > left && el.y < bottom && el.y + el.height > top)
          .map((el) => el.id);
        if (hit.length > 0) {
          onSelectElementIds(e.shiftKey ? [...new Set([...selectedElementIds, ...hit])] : hit);
        }
        setMarquee(null);
      }}
    >
      {page.backgroundColor && (
        <div className="absolute inset-0" style={{ backgroundColor: page.backgroundColor }} />
      )}
      {page.backgroundImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={page.backgroundImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {page.elements.map((element) => {
        const isSelected = selectedElementIds.includes(element.id);
        // While any OTHER selected element is mid-drag, render this one
        // offset by the same live delta so the whole group visibly moves
        // together — see onDrag below. Whichever element the user actually
        // grabs computes the delta; every sibling just follows it.
        const inGroupDrag = isSelected && selectedElementIds.length > 1 && groupDragDelta !== null;
        const offsetX = inGroupDrag ? groupDragDelta!.dx : 0;
        const offsetY = inGroupDrag ? groupDragDelta!.dy : 0;
        const displayX = (element.x + offsetX) * scale;
        const displayY = (element.y + offsetY) * scale;
        return (
          <Rnd
            key={element.id}
            size={{ width: element.width * scale, height: element.height * scale }}
            position={{ x: displayX, y: displayY }}
            bounds="parent"
            style={{
              zIndex: element.zIndex,
              outline: isSelected ? "2px solid var(--primary)" : "none",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              selectOnMouseDown(element.id, e.shiftKey);
            }}
            onDragStart={() => {
              dragStartRef.current = { x: element.x, y: element.y };
            }}
            onDrag={(_e, d) => {
              if (!dragStartRef.current) return;
              const rawX = d.x / scale;
              const rawY = d.y / scale;
              const dx = rawX - dragStartRef.current.x;
              const dy = rawY - dragStartRef.current.y;
              if (selectedElementIds.length > 1 && isSelected) {
                setGroupDragDelta({ dx, dy });
                return;
              }
              const others = page.elements.filter((el) => el.id !== element.id);
              const xCandidates = axisCandidates(others, "x", bookWidth);
              const yCandidates = axisCandidates(others, "y", bookHeight);
              const snapX = snapAxis(rawX, element.width, xCandidates);
              const snapY = snapAxis(rawY, element.height, yCandidates);
              setSnapGuides({ x: snapX.guide, y: snapY.guide });
            }}
            onDragStop={(_e, d) => {
              const start = dragStartRef.current;
              dragStartRef.current = null;
              setSnapGuides({ x: null, y: null });
              if (selectedElementIds.length > 1 && isSelected && start) {
                const dx = d.x / scale - start.x;
                const dy = d.y / scale - start.y;
                setGroupDragDelta(null);
                if (dx !== 0 || dy !== 0) {
                  onUpdateElements(
                    page.elements
                      .filter((el) => selectedElementIds.includes(el.id))
                      .map((el) => ({ id: el.id, patch: { x: el.x + dx, y: el.y + dy } }))
                  );
                }
                return;
              }
              const rawX = d.x / scale;
              const rawY = d.y / scale;
              const others = page.elements.filter((el) => el.id !== element.id);
              const xCandidates = axisCandidates(others, "x", bookWidth);
              const yCandidates = axisCandidates(others, "y", bookHeight);
              const snapX = snapAxis(rawX, element.width, xCandidates);
              const snapY = snapAxis(rawY, element.height, yCandidates);
              onUpdateElement(element.id, { x: snapX.value, y: snapY.value });
            }}
            onResizeStop={(_e, _dir, ref, _delta, position) => {
              onUpdateElement(element.id, {
                width: ref.offsetWidth / scale,
                height: ref.offsetHeight / scale,
                x: position.x / scale,
                y: position.y / scale,
              });
            }}
          >
            <div className="h-full w-full">
              <BookElementRenderer element={element} isActive editable />
            </div>
          </Rnd>
        );
      })}
      {snapGuides.x != null && (
        <div className="pointer-events-none absolute inset-y-0 w-px bg-primary" style={{ left: snapGuides.x * scale }} />
      )}
      {snapGuides.y != null && (
        <div className="pointer-events-none absolute inset-x-0 h-px bg-primary" style={{ top: snapGuides.y * scale }} />
      )}
      {marquee && (
        <div
          className="pointer-events-none absolute border border-primary bg-primary/10"
          style={{
            left: Math.min(marquee.startX, marquee.x),
            top: Math.min(marquee.startY, marquee.y),
            width: Math.abs(marquee.x - marquee.startX),
            height: Math.abs(marquee.y - marquee.startY),
          }}
        />
      )}
    </div>
  );
}
