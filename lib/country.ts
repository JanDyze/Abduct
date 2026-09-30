import "server-only";
import { cookies, headers } from "next/headers";
import { countryOfZone } from "./timezone-countries";

export type Country = { code: string; name: string; chosen: boolean };

// Cookies: the country you picked in Settings, and your device's time zone (TimeZoneCookie).
export const COUNTRY_COOKIE = "country";
export const TIME_ZONE_COOKIE = "tz";

const isCode = (c: string | null | undefined): c is string => Boolean(c && /^[A-Z]{2}$/.test(c) && c !== "XX");

export function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

// Where the viewer is, for "Popular in ..." and where a title can be watched. In order: the
// country picked in Settings; on Vercel, where the connection comes from (x-vercel-ip-country);
// the device's time zone (Asia/Manila is the Philippines); the browser's language, when it names
// a country (en-PH), though browsers often say en-US wherever they are; otherwise the US.
export async function viewerCountry(): Promise<Country> {
  const chosen = (await cookies()).get(COUNTRY_COOKIE)?.value?.toUpperCase();
  if (isCode(chosen)) return { code: chosen, name: countryName(chosen), chosen: true };
  return detectedCountry();
}

// The country worked out without the one picked in Settings (what "Automatic" means there).
export async function detectedCountry(): Promise<Country> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  const guesses = [
    h.get("x-vercel-ip-country")?.toUpperCase(),
    countryOfZone(c.get(TIME_ZONE_COOKIE)?.value),
    /^[a-z]{2,3}-([A-Z]{2})\b/i.exec(h.get("accept-language") ?? "")?.[1]?.toUpperCase(),
  ];
  const code = guesses.find(isCode) ?? "US";
  return { code, name: countryName(code), chosen: false };
}
