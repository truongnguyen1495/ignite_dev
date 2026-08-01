import "server-only";

// Separate from youtube.ts on purpose — parseYoutubeId there is also
// imported by client components (whiteboard property panel/toolbar), so
// that file can't carry `server-only` or a real fetch call. This one only
// ever runs from a server action (courses/actions.ts), never bundled
// client-side.

// Parses an ISO-8601 duration like "PT1H2M10S" (YouTube's contentDetails
// format) into whole seconds. Any missing unit defaults to 0 ("PT50M" =
// 50 minutes exactly, "PT45S" = 45 seconds).
function parseIso8601DurationSeconds(iso: string): number | null {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

// Fetches a YouTube video's real duration via the Data API v3 — best-effort:
// returns null (never throws) on a missing YOUTUBE_API_KEY, a network
// failure, an unknown video id, or a malformed response, so a lesson save
// never fails just because this optional lookup didn't work. Called once
// per lesson create/update when youtubeId is set or changes (see
// createCourseLessonAction/updateCourseLessonAction) — the result is stored
// on CourseLesson.durationSeconds rather than re-fetched on every page view.
export async function fetchYoutubeDurationSeconds(youtubeId: string): Promise<number | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", youtubeId);
    url.searchParams.set("key", apiKey);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const iso = data?.items?.[0]?.contentDetails?.duration;
    if (typeof iso !== "string") return null;
    return parseIso8601DurationSeconds(iso);
  } catch {
    return null;
  }
}
