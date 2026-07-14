"use client";

import { useEffect, useRef, useState } from "react";

const HIDE_DELAY_MS = 2500;

// Video-player-style auto-hide: while `active` (fullscreen), the toolbar
// stays visible for a couple seconds, then fades out until the mouse moves
// (or a finger touches the screen) again. Inactive outside fullscreen, so
// the normal reader keeps its toolbar always visible.
export function useAutoHideControls(active: boolean): boolean {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    function show() {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), HIDE_DELAY_MS);
    }

    show();
    document.addEventListener("mousemove", show);
    document.addEventListener("touchstart", show);
    return () => {
      document.removeEventListener("mousemove", show);
      document.removeEventListener("touchstart", show);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active]);

  return visible;
}
