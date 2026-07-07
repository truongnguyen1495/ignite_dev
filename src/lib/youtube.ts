const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Accepts a raw 11-char YouTube video ID or a full YouTube URL
 * (watch?v=, youtu.be/, embed/, shorts/) and returns just the video ID.
 */
export function parseYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (YOUTUBE_ID_RE.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") {
      const id = url.pathname.slice(1);
      return YOUTUBE_ID_RE.test(id) ? id : null;
    }
    if (url.hostname.endsWith("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && YOUTUBE_ID_RE.test(v)) return v;
      const match = url.pathname.match(/\/(embed|shorts)\/([a-zA-Z0-9_-]{11})/);
      if (match) return match[2];
    }
  } catch {
    return null;
  }

  return null;
}
