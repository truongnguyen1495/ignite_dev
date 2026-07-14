"use client";

import { useEffect, useState, type RefObject } from "react";

// Wraps the browser Fullscreen API for a given container ref. Tracks
// document.fullscreenElement via the fullscreenchange event (not just local
// state) so it stays correct when the user exits via Esc/browser chrome
// instead of the toggle button.
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(document.fullscreenElement !== null && document.fullscreenElement === ref.current);
    }
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, [ref]);

  async function toggle() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await ref.current?.requestFullscreen();
    }
  }

  return { isFullscreen, toggle };
}
