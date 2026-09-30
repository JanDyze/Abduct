"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { COUNTRY_COOKIE } from "@/lib/country";
import { cleanDisplayName, MAX_DISPLAY_NAME } from "@/lib/social/name";
import { setDisplayName } from "@/lib/social/profiles";
import { COUNTRY_CODES } from "@/lib/timezone-countries";

export type NameState = { error?: string; saved?: boolean };

// The name others see with your public lists and comments.
export async function saveDisplayName(_prev: NameState, formData: FormData): Promise<NameState> {
  const user = await requireUser();
  const name = cleanDisplayName(String(formData.get("name") ?? ""));
  if (!name) return { error: `Use a name of 1 to ${MAX_DISPLAY_NAME} characters.` };
  await setDisplayName(user.id, name);
  revalidatePath("/", "layout");
  return { saved: true };
}

// Your country, for Popular in ... and where to watch: one of COUNTRY_CODES, or "auto" to go back
// to working it out (lib/country.ts). Kept on this device.
export async function saveCountry(code: string): Promise<{ error?: string }> {
  await requireUser();
  const jar = await cookies();
  if (code === "auto") jar.delete(COUNTRY_COOKIE);
  else if (COUNTRY_CODES.includes(code)) jar.set(COUNTRY_COOKIE, code, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  else return { error: "Choose a country from the list." };
  revalidatePath("/", "layout");
  return {};
}
