import { ImageResponse } from "next/og";

// Maskable variant for the manifest's "purpose": "maskable" entry — Android
// applies its own shape mask (circle, squircle, ...) on top of this, so
// unlike icon-512/route.tsx the background must be a full-bleed square (no
// baked-in rounding/transparency) with the mark kept inside the ~80% "safe
// zone" circle, or it gets clipped/looks off depending on the launcher.
//
// force-static: plain route.tsx handlers default to dynamic (uncached) in
// this Next.js version — see icon-192/route.tsx for details.
export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#a855f7",
        }}
      >
        <svg width="260" height="260" viewBox="0 0 24 24" fill="#14061f">
          <path d="M13 2 3 14h7l-1 8 11-14h-7l1-6Z" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
