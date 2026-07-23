"use client";

import { useEffect, useState, type RefObject } from "react";

// Safari ships the Fullscreen API behind webkit prefixes until 16.4 — these
// widen the standard types with the prefixed members so the fallback chain
// below type-checks without any-casts.
type WebkitFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type WebkitFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

function currentFullscreenElement(): Element | null {
  const doc = document as WebkitFullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

// Wraps the browser Fullscreen API for a given container ref. Tracks
// document.fullscreenElement via the fullscreenchange event (not just local
// state) so it stays correct when the user exits via Esc/browser chrome
// instead of the toggle button.
//
// Safari needs two extra paths the standard API doesn't cover:
// - Safari < 16.4 (macOS and iPad) only has the webkit-prefixed
//   requestFullscreen/exitFullscreen/fullscreenchange variants.
// - iPhone Safari has NO Fullscreen API for non-video elements at all, on
//   any version — there the toggle falls back to a "fake" fullscreen the
//   caller renders as a fixed viewport-filling overlay (`isFake` tells it
//   to). Esc and body-scroll-locking are handled here to mirror the native
//   behavior.
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isFake, setIsFake] = useState(false);

  useEffect(() => {
    function handleChange() {
      const el = currentFullscreenElement();
      setIsNativeFullscreen(el !== null && el === ref.current);
    }
    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
    };
  }, [ref]);

  useEffect(() => {
    if (!isFake) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsFake(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isFake]);

  async function toggle() {
    if (isFake) {
      setIsFake(false);
      return;
    }
    const doc = document as WebkitFullscreenDocument;
    if (currentFullscreenElement()) {
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else await doc.webkitExitFullscreen?.();
      return;
    }
    const el = ref.current as WebkitFullscreenElement | null;
    if (!el) return;
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else setIsFake(true);
  }

  return { isFullscreen: isNativeFullscreen || isFake, isFake, toggle };
}
