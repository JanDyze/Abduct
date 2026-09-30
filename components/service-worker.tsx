"use client";

import { useEffect } from "react";

// Registers the service worker (public/sw.js) in production builds. In development it's left off
// (and any earlier one removed), so fresh code is never served from a cache while you work.
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((all) => all.forEach((r) => void r.unregister()));
      return;
    }
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  }, []);
  return null;
}
