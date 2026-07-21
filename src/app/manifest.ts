import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LMS IGNITE",
    short_name: "LMS IGNITE",
    description: "Hệ thống đào tạo nội bộ 5 cấp",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#4338ca",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
