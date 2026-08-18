"use client";

import { useEffect, useId, useRef, useState } from "react";
import { loadYoutubeIframeApi } from "@/lib/youtube-iframe-loader";
import { useLessonWatchProgress } from "@/components/lesson-watch-progress-provider";

// "165 phút" convention would be wrong here — this badge is a live percent,
// not a duration, so plain "N%" matches how the reference screenshot the
// user shared shows it.

// Drop-in replacement for <YoutubeEmbed> used only on the two course-lesson
// viewer pages (student dashboard + guest) — everywhere else (the 6-level
// Lesson viewer, etc.) keeps the plain, hook-free <YoutubeEmbed> untouched,
// since forcing this one into a client component with the YT Player API
// would be unnecessary overhead for pages that don't need watch-gating.
//
// Tracks real accumulated wall-clock seconds spent actively PLAYING (via a
// 1s poll of player.getPlayerState(), not player.getCurrentTime() deltas) —
// seeking straight to the 80% mark doesn't add a single second to the
// counter, only letting it actually play does. Self-contained: renders its
// own "Đã xem N%" badge from its own local state regardless of context, and
// additionally reports each tick to LessonWatchProgressProvider (a no-op if
// no provider is mounted above it, e.g. on the guest page) so a distant
// MarkCompleteButton elsewhere on the page can react live.
export function YoutubeTrackedEmbed({
  videoId,
  durationSeconds,
  initialWatchedSeconds = 0,
}: {
  videoId: string;
  // Null = no reliable duration (YouTube API lookup never succeeded, or
  // simply not available) — renders exactly like a plain embed, no badge,
  // no tracking, since a percent can't be computed without it.
  durationSeconds: number | null;
  initialWatchedSeconds?: number;
}) {
  const containerId = `yt-tracked-${useId().replace(/:/g, "")}`;
  const { reportTick } = useLessonWatchProgress();
  const [watchedSeconds, setWatchedSeconds] = useState(initialWatchedSeconds);
  const secondsRef = useRef(initialWatchedSeconds);

  useEffect(() => {
    if (durationSeconds == null) return;

    let destroyed = false;
    let player: YT.Player | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    loadYoutubeIframeApi().then((YT) => {
      if (destroyed) return;
      player = new YT.Player(containerId, {
        videoId,
        events: {
          onStateChange: (event) => {
            if (interval) {
              clearInterval(interval);
              interval = null;
            }
            if (event.data === YT.PlayerState.PLAYING) {
              interval = setInterval(() => {
                secondsRef.current = Math.min(durationSeconds, secondsRef.current + 1);
                setWatchedSeconds(secondsRef.current);
                reportTick(secondsRef.current);
              }, 1000);
            }
          },
        },
      });
    });

    return () => {
      destroyed = true;
      if (interval) clearInterval(interval);
      player?.destroy();
    };
    // videoId/durationSeconds intentionally omitted from a re-run dependency
    // — a lesson page fully remounts (new lessonId, new useId) on
    // navigation, this effect never needs to swap videos in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  const percent = durationSeconds ? Math.min(100, Math.round((watchedSeconds / durationSeconds) * 100)) : null;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
      <div id={containerId} className="h-full w-full" />
      {percent !== null && (
        <span className="absolute left-2 top-2 rounded-full bg-warning px-2.5 py-1 text-xs font-semibold text-white shadow">
          Đã xem {percent}%
        </span>
      )}
    </div>
  );
}
