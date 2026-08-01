"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { syncLessonWatchProgressAction } from "@/app/dashboard/courses/actions";

type LessonWatchProgressValue = {
  watchedSeconds: number;
  percent: number;
  reportTick: (seconds: number) => void;
};

const LessonWatchProgressContext = createContext<LessonWatchProgressValue | null>(null);

// No-provider default: percent 100 (never blocks a button that checks it)
// rather than throwing — most lesson pages/buttons don't have a gated video
// at all (no youtubeId, or durationSeconds unknown), so MarkCompleteButton
// must work fine standing alone, unlike useConfirm/useCelebrate which are
// always expected to have a real provider somewhere above them.
const NO_PROVIDER_DEFAULT: LessonWatchProgressValue = {
  watchedSeconds: 0,
  percent: 100,
  reportTick: () => {},
};

export function useLessonWatchProgress(): LessonWatchProgressValue {
  return useContext(LessonWatchProgressContext) ?? NO_PROVIDER_DEFAULT;
}

// Bridges YoutubeTrackedEmbed (reports live watched-seconds ticks while
// playing) and MarkCompleteButton (reads the current percent to decide
// whether it's locked) — the two sit far apart in the page's JSX (video up
// top, button down near the prev/next nav), so a Context is simpler here
// than prop-drilling through everything in between. Also owns periodic
// server sync so watched progress survives a reload without needing the
// caller to wire that up separately.
export function LessonWatchProgressProvider({
  lessonId,
  durationSeconds,
  initialWatchedSeconds,
  children,
}: {
  lessonId: string;
  // Null = no reliable duration (no video, or YouTube API duration lookup
  // never succeeded) — the provider still renders children normally, just
  // never updates past the initial value, so percent stays whatever it
  // started at (0, harmless) and nothing ever syncs.
  durationSeconds: number | null;
  initialWatchedSeconds: number;
  children: ReactNode;
}) {
  const [watchedSeconds, setWatchedSeconds] = useState(initialWatchedSeconds);
  const lastSyncedRef = useRef(initialWatchedSeconds);

  function reportTick(seconds: number) {
    if (durationSeconds == null) return;
    setWatchedSeconds((prev) => Math.max(prev, seconds));
  }

  useEffect(() => {
    if (durationSeconds == null) return;
    // Checkpoints every +5s of new watch time (not every single tick) —
    // frequent enough that a reload never loses much progress, infrequent
    // enough to not hammer the server on every second of playback.
    if (watchedSeconds - lastSyncedRef.current < 5 && watchedSeconds < durationSeconds) return;
    lastSyncedRef.current = watchedSeconds;
    void syncLessonWatchProgressAction(lessonId, watchedSeconds);
  }, [watchedSeconds, durationSeconds, lessonId]);

  useEffect(() => {
    return () => {
      // Best-effort final checkpoint on unmount (navigating away mid-video)
      // — fire-and-forget, a cleanup function can't usefully await this.
      if (durationSeconds != null && watchedSeconds > lastSyncedRef.current) {
        void syncLessonWatchProgressAction(lessonId, watchedSeconds);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const percent = durationSeconds ? Math.min(100, Math.round((watchedSeconds / durationSeconds) * 100)) : 100;

  return (
    <LessonWatchProgressContext.Provider value={{ watchedSeconds, percent, reportTick }}>
      {children}
    </LessonWatchProgressContext.Provider>
  );
}
