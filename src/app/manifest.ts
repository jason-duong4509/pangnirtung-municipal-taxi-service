import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pangnirtung Municipal Taxi App",
    short_name: "Taxi App",
    description: "Taxi Booking App for Pangnirtung",
    start_url: "/",
    display: "standalone",
    background_color: "#fff",
    theme_color: "#fff",
    icons: [
      {
        src: "/icons/Pangnirtung-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/Pangnirtung-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
