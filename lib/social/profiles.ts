import "server-only";
import { eq } from "drizzle-orm";
import type { SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { defaultDisplayName } from "./name";

// Your display name, making your profile the first time it's needed (making a list public, a
// comment, Settings).
export async function ensureProfile(user: SessionUser): Promise<string> {
  const [existing] = await db.select({ name: profiles.displayName }).from(profiles).where(eq(profiles.userId, user.id));
  if (existing) return existing.name;
  const name = defaultDisplayName(user);
  await db.insert(profiles).values({ userId: user.id, displayName: name }).onConflictDoNothing();
  const [row] = await db.select({ name: profiles.displayName }).from(profiles).where(eq(profiles.userId, user.id));
  return row?.name ?? name;
}

export async function setDisplayName(userId: string, displayName: string) {
  await db
    .insert(profiles)
    .values({ userId, displayName })
    .onConflictDoUpdate({ target: profiles.userId, set: { displayName } });
}
