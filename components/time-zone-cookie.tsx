"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Tells the server the device's time zone (lib/country.ts works out the country from it, for
// "Popular in ..." and where to watch). The first time, or after moving, the page refreshes so it
// shows the right country straight away.
export function TimeZoneCookie() {
  const router = useRouter();
  useEffect(() => {
    let zone: string;
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!zone || document.cookie.split("; ").includes(`tz=${encodeURIComponent(zone)}`)) return;
    document.cookie = `tz=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}
