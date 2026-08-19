import { ImageResponse } from "next/og";

// Same mark as app/icon.tsx, scaled up — the 32x32 favicon-sized icon is too
// small to satisfy Chrome/Android's PWA installability check (it requires a
// manifest icon >=192x192), which is why manifest.ts references this route
// instead of reusing /icon.
//
// Plain route.tsx handlers are dynamic (uncached) by default in this Next.js
// version, unlike the icon.tsx/apple-icon.tsx special convention which stays
// static automatically — force it here so this isn't re-rendered on every
// request.
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
          borderRadius: 42,
        }}
      >
        <svg width="108" height="108" viewBox="0 0 24 24" fill="#14061f">
          <path d="M13 2 3 14h7l-1 8 11-14h-7l1-6Z" />
        </svg>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
