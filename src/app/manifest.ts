import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RapidX",
    short_name: "RapidX",
    description: "Hệ thống đào tạo nội bộ 6 cấp",
    start_url: "/",
    display: "standalone",
    background_color: "#061426",
    theme_color: "#061426",
    // Static files under public/icons, not the ImageResponse routes these
    // replaced: the mark is a rendered 3D logo, which Satori can't draw, and
    // serving it as a plain PNG also drops five runtime-rendered routes.
    // The favicon and the iOS touch icon come from src/app/{favicon.ico,
    // icon.png,apple-icon.png} via Next's own file convention, so they don't
    // need entries here.
    icons: [
      // Chrome/Android require an icon >=192x192 and one >=512x512 to
      // consider the app installable at all (otherwise beforeinstallprompt
      // never fires) — see install-app-button.tsx.
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
