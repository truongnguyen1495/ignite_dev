import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Mirrors BrandLogo's mark (rounded square, primary-color bg, white bolt) —
// keep the two in sync if the brand color/shape ever changes.
export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M13 2 3 14h7l-1 8 11-14h-7l1-6Z" />
        </svg>
      </div>
    ),
    size
  );
}
