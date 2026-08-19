import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RapidX",
    short_name: "RapidX",
    description: "Hệ thống đào tạo nội bộ 6 cấp",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#4338ca",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      // Chrome/Android require an icon >=192x192 and one >=512x512 to
      // consider the app installable at all (otherwise beforeinstallprompt
      // never fires) — see install-app-button.tsx.
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
