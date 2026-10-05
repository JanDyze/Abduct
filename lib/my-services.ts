import "server-only";
import { cookies } from "next/headers";
import { serviceKey } from "@/lib/titles/services";

// The streaming services you have (Settings), as service keys (lib/titles/services.ts), kept in a
// cookie like your country: Where to watch marks them, and Pick for me can stick to them.
export const SERVICES_COOKIE = "services";

export function parseServices(raw: string | null | undefined): string[] {
  return [...new Set((raw ?? "").split(",").map((s) => serviceKey(s)).filter(Boolean))].slice(0, 40);
}

export async function myServices(): Promise<string[]> {
  return parseServices((await cookies()).get(SERVICES_COOKIE)?.value);
}
