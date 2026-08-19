"use client";

import { useEffect, useRef, useState } from "react";

const HIDE_DELAY_MS = 2500;

// Video-player-style auto-hide: while `active` (fullscreen), the toolbar
// stays visible for a couple seconds, then fades out until the mouse moves
// (or a finger touches the screen) again. Inactive outside fullscreen, so
// the normal reader keeps its toolbar always visible.
export function useAutoHideControls(active: boolean): boolean {
  const [hidden, setHidden] = useState(false);
  const [lastActive, setLastActive] = useState(active);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Entering or leaving fullscreen brings the toolbar back, adjusted during
  // render rather than from the effect below. Pushing it from an effect
  // (which is what this used to do) means React commits one render showing
  // the stale value before the correction lands — the documented "adjusting
  // state when a prop changes" pattern instead re-renders before anything
  // reaches the screen.
  if (lastActive !== active) {
    setLastActive(active);
    setHidden(false);
  }

  useEffect(() => {
    // Nothing to schedule outside fullscreen: `hidden` is already false and
    // no timer is allowed to run, so the toolbar simply stays put.
    if (!active) return;

    function scheduleHide() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setHidden(true), HIDE_DELAY_MS);
    }

    function onActivity() {
      setHidden(false);
      scheduleHide();
    }

    // Only the countdown starts here — no setState, because the render-phase
    // adjustment above has already guaranteed the toolbar is showing.
    scheduleHide();
    document.addEventListener("mousemove", onActivity);
    document.addEventListener("touchstart", onActivity);
    return () => {
      document.removeEventListener("mousemove", onActivity);
      document.removeEventListener("touchstart", onActivity);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active]);

  return !hidden;
}
