"use client";

import { useState } from "react";

// Single source of truth for "how a person's identity renders as a small
// circle" — replaces every hand-rolled `{name.charAt(0).toUpperCase()}`
// initials circle across headers/chat/whiteboard/roster tables. Falls back
// to the same initials-on-primary-bg look the app already used everywhere
// when there's no avatarUrl yet, or the stored URL 404s (a bucket object
// removed out-of-band, a stale URL from before a re-upload, ...).
export function UserAvatar({
  src,
  name,
  size = 32,
  className = "",
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const showImage = !!src && !errored;
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-bg font-semibold text-primary ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.42)) }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setErrored(true)} />
      ) : (
        initial
      )}
    </span>
  );
}
