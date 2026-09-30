"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listItems, picks } from "@/lib/db/schema";

// Every title the randomizer lands on is noted, so the next spins go easy on it for a while.
// Returns the pick's id, to mark it accepted if they go with it.
export async function recordPick(itemId: string): Promise<string | null> {
  const user = await requireUser();
  const id = z.uuid().safeParse(itemId);
  if (!id.success) return null;
  const [item] = await db
    .select({ titleId: listItems.titleId, listId: listItems.listId })
    .from(listItems)
    .where(and(eq(listItems.id, id.data), eq(listItems.userId, user.id)));
  if (!item) return null;
  const [row] = await db.insert(picks).values({ userId: user.id, ...item }).returning({ id: picks.id });
  return row.id;
}

// "We're watching this": shown on Home until the next one.
export async function acceptPick(pickId: string) {
  const user = await requireUser();
  const id = z.uuid().safeParse(pickId);
  if (!id.success) return;
  await db.update(picks).set({ accepted: true }).where(and(eq(picks.id, id.data), eq(picks.userId, user.id)));
  revalidatePath("/");
}
