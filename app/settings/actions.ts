"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { cleanDisplayName, MAX_DISPLAY_NAME } from "@/lib/social/name";
import { setDisplayName } from "@/lib/social/profiles";

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
