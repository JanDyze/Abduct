import type { MetadataRoute } from "next";

// Abduct as an installable app: its own window, the UFO on the home screen, and shortcuts on a
// long press of the icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Abduct",
    short_name: "Abduct",
    description: "Lists of movies, series and anime to watch, and a UFO that picks one when you can't decide.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0a09",
    theme_color: "#0b0a09",
    categories: ["entertainment", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/abduct.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    // Share a reel (TikTok, Facebook, Instagram, YouTube) or any text to Abduct from the phone's
    // share sheet, and it works out the title (app/share/page.tsx). Android, once installed.
    // Links, text and videos (to listen to). A POST, as Chrome documents a share target that takes
    // files; the service worker (public/sw.js) receives it, or app/share/receive without one.
    share_target: {
      action: "/share/receive",
      method: "POST",
      enctype: "multipart/form-data",
      params: { title: "title", text: "text", url: "url", files: [{ name: "media", accept: ["video/*", "audio/*"] }] },
    },
    shortcuts: [
      { name: "Pick for me", url: "/spin", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Add a title", url: "/add", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My lists", url: "/lists", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
