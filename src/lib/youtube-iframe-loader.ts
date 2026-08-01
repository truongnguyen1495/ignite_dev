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

  apiReadyPromise = new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve(window.YT);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
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
      destroy(): void;
    }
  }
}
