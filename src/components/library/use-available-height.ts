"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

// Measures an element's real rendered height via ResizeObserver — used to
// cap the flipbook's width from JS (see book-flipbook.tsx/pdf-flipbook.tsx)
// rather than trusting CSS height alone. react-pageflip's own wrapper box
// sizes itself purely from *width* (a padding-bottom percentage trick,
// unrelated to how much height its parent actually has), so no amount of
// giving the parent a correct CSS height stops the book from rendering
// taller than that parent and visually overlapping whatever sits below it
// — the only real fix is capping the width low enough that the resulting
// (width-derived) height can't exceed what's actually available.
export function useAvailableHeight(ref: RefObject<HTMLElement | null>): number | null {
  const [height, setHeight] = useState<number | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  // Tracks which DOM node the observer is currently attached to, so the
  // per-render effect below can tell "still the same node, nothing to do"
  // from "a different/newly-mounted node, move the observer onto it".
  const observedElRef = useRef<HTMLElement | null>(null);

  // No dependency array is deliberate: `ref` (the object) never changes
  // identity, so a `[ref]`-gated effect only ever runs once — if `ref.current`
  // is still null at that moment (e.g. the caller is showing a loading state
  // and hasn't rendered the real element yet), it silently gives up forever,
  // never noticing once the element actually mounts on a later render. This
  // runs after every render instead and just no-ops once the node it's
  // watching hasn't changed.
  //
  // Deliberately does NOT return a cleanup function from *this* effect —
  // React calls an effect's previous cleanup before every re-run, even for a
  // no-deps effect that's about to no-op, which was silently disconnecting
  // the observer on literally the next render after it was created (any
  // click, any state update) and never reconnecting it because the "same
  // node, skip" branch never rebuilt it. The observer itself is created once
  // and lives in a ref instead, moved between elements via observe/unobserve
  // as needed; only the *true unmount* effect below ever disconnects it.
  useEffect(() => {
    const el = ref.current;
    if (el === observedElRef.current) return;
    if (!observerRef.current) {
      observerRef.current = new ResizeObserver((entries) => {
        const h = entries[0]?.contentRect.height;
        if (h) setHeight(h);
      });
    }
    if (observedElRef.current) observerRef.current.unobserve(observedElRef.current);
    observedElRef.current = el;
    if (el) observerRef.current.observe(el);
  });

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  return height;
}
