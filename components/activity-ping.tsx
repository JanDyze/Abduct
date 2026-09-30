"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Tells the server which screen opened (for the admin dashboard's usage numbers), after Kept's.
// Fire and forget; the same screen twice in a row within a minute counts once.
export function ActivityPing() {
  const pathname = usePathname();
  const last = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/login") || pathname.startsWith("/admin")) return;
    const now = Date.now();
    if (last.current?.path === pathname && now - last.current.at < 60_000) return;
    last.current = { path: pathname, at: now };
    const body = JSON.stringify({ path: pathname });
    if (!navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" })))
      void fetch("/api/events", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }, [pathname]);

  return null;
}
