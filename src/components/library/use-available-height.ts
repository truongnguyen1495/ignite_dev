"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

// How long a new measurement has to stay put before it's actually committed
// to state. Committing every ResizeObserver tick immediately (the naive
// version) forced a flipbook remount (see book-flipbook.tsx/pdf-flipbook.tsx
// — react-pageflip only reads sizing props once, at construction) on *every*
// sub-pixel layout jitter, including jitter that happens to land mid-flip
// (confirmed: showing the thumbnail rail was enough to nudge the measured
// height right onto a rounding boundary on some books, remounting
// react-pageflip's whole DOM tree while its own page-turn CSS transform was
// still animating — visible as garbled, overlapping page content). Debouncing
// means a remount only ever happens once the layout has actually settled
// (window resize, fullscreen toggle, thumbnail-rail toggle finishing), never
// mid-animation, since a real flip settles well before this fires again.
const COMMIT_DEBOUNCE_MS = 250;

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
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef<number | null>(null);

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
        if (!h) return;
        // Sub-pixel noise (layout rounding between renders, not a real size
        // change) shouldn't even restart the debounce timer, or a steady
        // trickle of 0.3px-apart measurements could keep deferring the
        // commit forever.
        if (lastCommittedRef.current !== null && Math.abs(h - lastCommittedRef.current) < 2) return;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        // The very first measurement applies immediately — nothing to
        // debounce against yet, and the caller is usually showing a loading
        // spinner until this resolves (see the `availableHeight === null`
        // branch in book-flipbook.tsx/pdf-flipbook.tsx), so there's no
        // mid-animation remount risk to protect against on first mount.
        if (lastCommittedRef.current === null) {
          lastCommittedRef.current = h;
          setHeight(h);
          return;
        }
        debounceTimerRef.current = setTimeout(() => {
          lastCommittedRef.current = h;
          setHeight(h);
        }, COMMIT_DEBOUNCE_MS);
      });
    }
    if (observedElRef.current) observerRef.current.unobserve(observedElRef.current);
    observedElRef.current = el;
    if (el) observerRef.current.observe(el);
  });

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return height;
}
