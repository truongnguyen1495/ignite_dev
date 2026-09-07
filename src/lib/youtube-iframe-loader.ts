"use client";

// Loads the YouTube IFrame Player API script exactly once per page, no
// matter how many YoutubeTrackedEmbed instances mount — the script itself
// calls a single global `window.onYouTubeIframeAPIReady`, so a second
// script tag would just clobber whatever the first caller assigned there.
// Cached as a module-level promise (not React state) since this needs to
// survive across separate component instances/remounts, not just re-renders
// of one component.
let apiReadyPromise: Promise<typeof YT> | null = null;

export function loadYoutubeIframeApi(): Promise<typeof YT> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadYoutubeIframeApi called on the server"));
  }
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (apiReadyPromise) {
    return apiReadyPromise;
  }

  apiReadyPromise = new Promise((resolve, reject) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    let settled = false;

    // An ad blocker or corporate proxy blocking youtube.com means
    // onYouTubeIframeAPIReady is never called. Without rejecting, every
    // caller's `.then()` would hang forever and the player area would stay
    // an empty box with no explanation — and because this promise is cached
    // at module scope, one failure used to poison every embed in the tab for
    // the rest of the session. Rejecting (and clearing the cache) lets the
    // caller fall back to a plain iframe, and lets a later mount retry.
    const fail = (reason: string) => {
      if (settled) return;
      settled = true;
      apiReadyPromise = null;
      reject(new Error(reason));
    };

    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(window.YT!);
    };

    // Covers the slower failure modes an onerror never fires for: the script
    // loads but is a stub, or the request hangs.
    const timeout = setTimeout(() => fail("YouTube IFrame API timed out"), 15000);

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (existing) {
      existing.addEventListener("error", () => fail("YouTube IFrame API failed to load"));
    } else {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.onerror = () => fail("YouTube IFrame API failed to load");
      document.head.appendChild(script);
    }
  });

  return apiReadyPromise;
}

declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }

  // Minimal surface of the real YT namespace — only what
  // YoutubeTrackedEmbed actually calls, not the full official type
  // definitions. Declared inside `declare global` (not as a bare top-level
  // `declare namespace`) so it's visible as a type from other files without
  // an import — this file has module scope (top-level import/export),
  // which would otherwise keep the namespace local to it.
  // (ambient type declaration mirroring YouTube's own global `YT` object,
  // not a module-organization namespace the lint rule is meant to discourage)
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace YT {
    enum PlayerState {
      UNSTARTED = -1,
      ENDED = 0,
      PLAYING = 1,
      PAUSED = 2,
      BUFFERING = 3,
      CUED = 5,
    }

    class Player {
      constructor(
        elementId: string | HTMLElement,
        options: {
          videoId: string;
          events?: {
            onReady?: (event: { target: Player }) => void;
            onStateChange?: (event: { data: number; target: Player }) => void;
          };
        }
      );
      getCurrentTime(): number;
      getPlayerState(): number;
      seekTo(seconds: number, allowSeekAhead: boolean): void;
      playVideo(): void;
      destroy(): void;
    }
  }
}
