import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same mark as icon.tsx, sized/rounded per Apple's touch-icon convention
// (iOS applies its own corner mask, so this can stay square-ish).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4338ca",
        }}
      >
        <svg width="100" height="100" viewBox="0 0 24 24" fill="white">
          <path d="M13 2 3 14h7l-1 8 11-14h-7l1-6Z" />
        </svg>
      </div>
    ),
    size
  );
}
