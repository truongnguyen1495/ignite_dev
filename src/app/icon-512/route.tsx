import { ImageResponse } from "next/og";

// Same mark as app/icon.tsx, scaled up — see icon-192/route.tsx for why this
// exists as a separate route from the favicon-sized /icon.
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
          background: "#4338ca",
          borderRadius: 112,
        }}
      >
        <svg width="288" height="288" viewBox="0 0 24 24" fill="white">
          <path d="M13 2 3 14h7l-1 8 11-14h-7l1-6Z" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
