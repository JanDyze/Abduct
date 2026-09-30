import "server-only";
import { cookies } from "next/headers";
import { TIME_ZONE_COOKIE } from "./country";

// Days as the viewer sees them, after Kept's lib/day.ts. The phone's time zone comes from the tz
// cookie (components/time-zone-cookie.tsx); before it's set, Manila.
const FALLBACK_TZ = "Asia/Manila";

function isTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function getTimeZone() {
  const tz = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  return tz && isTimeZone(tz) ? tz : FALLBACK_TZ;
}

// YYYY-MM-DD in the given time zone.
export function localDate(tz: string, at = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
