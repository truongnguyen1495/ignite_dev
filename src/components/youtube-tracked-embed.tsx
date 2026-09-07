"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { loadYoutubeIframeApi } from "@/lib/youtube-iframe-loader";
import { useLessonWatchProgress } from "@/components/lesson-watch-progress-provider";
import { formatTimestamp } from "@/lib/course-lesson-segments";

export type EmbedSegment = { seconds: number; label: string };

// "165 phút" convention would be wrong here — this badge is a live percent,
// not a duration, so plain "N%" matches how the reference screenshot the
// user shared shows it.

// Drop-in replacement for <YoutubeEmbed> on every lesson viewer that
// watch-gates: the two course-lesson pages (student dashboard + guest) and
// the 6-level Lesson viewer. Pages with no gate at all (product/library
// video embeds) keep the plain, hook-free <YoutubeEmbed>, since the YT
// Player API and a client component would be overhead for nothing there.
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
  segments,
  overlay,
  showPercent = true,
}: {
  videoId: string;
  // Null = no reliable duration (the YouTube API lookup never succeeded, or
  // simply isn't available) — the video still plays and the tracklist still
  // seeks, but there's no "Đã xem N%" badge and nothing is reported to the
  // watch-progress provider, since a percent can't be computed without a
  // total. This used to skip building the player entirely, which left the
  // lesson showing an empty box with no video at all.
  durationSeconds: number | null;
  initialWatchedSeconds?: number;
  // Optional in-video timestamps (see CourseLessonSegment) — clicking one
  // seeks the live player straight to that second. Undefined/empty renders
  // no tracklist at all, so every other caller of this component is
  // unaffected.
  segments?: EmbedSegment[];
  // False hides only the "Đã xem N%" badge, e.g. the guest page's own
  // Settings.showLessonWatchProgressToGuest toggle — tracking/seeking still
  // runs underneath either way, since a lesson can have segments without
  // that toggle being on.
  showPercent?: boolean;
  // Rendered bottom-right, pinned to the video box itself (e.g. a "Chương
  // N" badge) — a caller can't position its own absolute sibling there
  // anymore now that a tracklist may render below the video, growing this
  // component's total height.
  overlay?: ReactNode;
}) {
  const containerId = `yt-tracked-${useId().replace(/:/g, "")}`;
  const { reportTick } = useLessonWatchProgress();
  const [watchedSeconds, setWatchedSeconds] = useState(initialWatchedSeconds);
  const secondsRef = useRef(initialWatchedSeconds);
  const playerRef = useRef<YT.Player | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Until the iframe API has loaded and the player has fired onReady, a
  // seekTo() would be a silent no-op — the tracklist stays disabled rather
  // than highlighting a row and leaving the video sitting at 0:00.
  const [playerReady, setPlayerReady] = useState(false);
  // The IFrame API script never loaded (blocked, offline). The video falls
  // back to a plain iframe; the tracklist can't work without a player object.
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    let destroyed = false;
    let player: YT.Player | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    // Highlights whichever segment the player is actually inside, read from
    // the player's own position — NOT from secondsRef, which is cumulative
    // *watched* time capped at duration and deliberately decoupled from
    // where the video currently is (so seeking can't fake watch progress).
    // Using secondsRef here would snap the highlight to a much-later
    // segment right after rewinding to replay an earlier one. Segments
    // always arrive chronologically ordered (resolveSegmentsInput sorts
    // before saving), so the last one at or before the position wins.
    const syncActiveSegment = () => {
      if (!player || !segments || segments.length === 0) return;
      let position: number;
      try {
        position = player.getCurrentTime();
      } catch {
        return;
      }
      if (typeof position !== "number" || Number.isNaN(position)) return;
      let current = -1;
      for (let i = 0; i < segments.length; i++) {
        if (segments[i].seconds <= position) current = i;
      }
      setActiveIndex(current === -1 ? null : current);
    };

    loadYoutubeIframeApi()
      .catch(() => {
        // Blocked or unreachable API script — fall back to a plain iframe so
        // the lesson video still plays. Tracking and the tracklist need the
        // player object, so both are dropped in this mode.
        if (!destroyed) setApiFailed(true);
        return null;
      })
      .then((YT) => {
      if (destroyed || !YT) return;
      player = new YT.Player(containerId, {
        videoId,
        events: {
          onReady: (event) => {
            playerRef.current = event.target;
            setPlayerReady(true);
            syncActiveSegment();
            // ONE persistent 1s poll that asks the player whether it is
            // actually PLAYING — not a fresh interval started and cleared on
            // every state change. Restarting the timer per play/pause/seek
            // silently discarded the partial second each time, so a student
            // navigating by tracklist lost roughly a second of watch credit
            // per click and could stay locked out of "Đánh dấu hoàn thành"
            // despite watching everything.
            interval = setInterval(() => {
              if (!player) return;
              let state: number;
              try {
                state = player.getPlayerState();
              } catch {
                return;
              }
              if (state !== YT.PlayerState.PLAYING) return;
              // Watch progress needs a total to be a percentage of; without
              // a known duration the video still plays and still seeks,
              // there's just nothing to report.
              if (durationSeconds != null) {
                secondsRef.current = Math.min(durationSeconds, secondsRef.current + 1);
                setWatchedSeconds(secondsRef.current);
                reportTick(secondsRef.current);
              }
              syncActiveSegment();
            }, 1000);
          },
          // Synced on every state change too, not just inside the poll:
          // pausing and dragging YouTube's own scrubber would otherwise
          // leave the highlight frozen on the old segment until playback
          // resumes.
          onStateChange: () => {
            syncActiveSegment();
          },
        },
      });
    });

    return () => {
      destroyed = true;
      if (interval) clearInterval(interval);
      playerRef.current = null;
      setPlayerReady(false);
      player?.destroy();
    };
    // videoId/durationSeconds/segments intentionally omitted from a re-run
    // dependency — a lesson page fully remounts (new lessonId, new useId) on
    // navigation, this effect never needs to swap videos in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  const percent =
    showPercent && durationSeconds ? Math.min(100, Math.round((watchedSeconds / durationSeconds) * 100)) : null;

  function seekToSegment(index: number, seconds: number) {
    const player = playerRef.current;
    if (!player) return;
    player.seekTo(seconds, true);
    player.playVideo();
    // Set optimistically so the row responds on the click itself rather than
    // up to a second later on the next tick; the tick re-derives it from the
    // player's real position either way.
    setActiveIndex(index);
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
        {apiFailed ? (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div id={containerId} className="h-full w-full" />
        )}
        {percent !== null && (
          <span className="absolute left-2 top-2 rounded-full bg-warning px-2.5 py-1 text-xs font-semibold text-warning-foreground shadow">
            Đã xem {percent}%
          </span>
        )}
        {overlay && <span className="pointer-events-none absolute bottom-2 right-2">{overlay}</span>}
      </div>

      {/* Hidden entirely when the API never loaded, since the fallback iframe
          above exposes no seekTo — every row would be a dead click. In the
          normal case the rows are merely disabled until onReady fires (see
          `playerReady`), which is a window of a second or two, not a
          permanent state. A missing durationSeconds no longer matters here:
          the player is built either way now. */}
      {!apiFailed && segments && segments.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {segments.map((segment, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => seekToSegment(i, segment.seconds)}
                disabled={!playerReady}
                title={playerReady ? undefined : "Đang tải trình phát..."}
                className={`flex w-full items-start gap-3 border-l-2 px-3 py-2 text-left text-sm transition-colors disabled:cursor-wait disabled:opacity-60 ${
                  activeIndex === i
                    ? "border-l-primary bg-primary-bg-strong text-foreground"
                    : "border-l-transparent text-muted hover:bg-surface-hover"
                }`}
              >
                <span
                  className={`shrink-0 pt-px font-mono text-xs tabular-nums ${
                    activeIndex === i ? "text-primary" : "text-faint"
                  }`}
                >
                  {formatTimestamp(segment.seconds)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={activeIndex === i ? "font-medium" : ""}>{segment.label}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
