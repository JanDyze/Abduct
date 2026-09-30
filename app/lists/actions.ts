"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listItems, listLikes, lists } from "@/lib/db/schema";
import { fieldErrors, listInputSchema, type FormState } from "@/lib/lists/input";
import { ensureProfile } from "@/lib/social/profiles";
import { onYourLists } from "@/lib/titles/feedback";

const idSchema = z.uuid();

function readList(formData: FormData) {
  return listInputSchema.safeParse({ name: formData.get("name") ?? "", icon: formData.get("icon"), color: formData.get("color") });
}

export async function createList(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = readList(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const [created] = await db
    .insert(lists)
    .values({
      userId: user.id,
      ...parsed.data,
      // New lists go after the ones already there.
      position: sql`coalesce((select max(position) + 1 from ${lists} where user_id = ${user.id}), 0)`,
    })
    .returning({ id: lists.id });
  revalidatePath("/", "layout");
  redirect(`/lists/${created.id}`, RedirectType.replace);
}

export async function updateList(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  const parsed = readList(formData);
  if (!id.success) return { errors: { form: "This list can't be found." } };
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const updated = await db
    .update(lists)
    .set(parsed.data)
    .where(and(eq(lists.id, id.data), eq(lists.userId, user.id)))
    .returning({ id: lists.id });
  if (updated.length === 0) return { errors: { form: "This list can't be found." } };
  revalidatePath("/", "layout");
  redirect(`/lists/${id.data}`, RedirectType.replace);
}

// Deletes a list and what's on it. The titles stay on any other list they're on. Your default
// list can't be deleted: it's where titles go when you add them without choosing.
export async function deleteList(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (id.success) await db.delete(lists).where(and(eq(lists.id, id.data), eq(lists.userId, user.id), eq(lists.isDefault, false)));
  revalidatePath("/", "layout");
  redirect("/lists", RedirectType.replace);
}

export async function setWatched(itemId: string, watched: boolean): Promise<{ error?: string }> {
  const user = await requireUser();
  const id = idSchema.safeParse(itemId);
  if (!id.success) return { error: "This title can't be found." };
  const updated = await db
    .update(listItems)
    .set({ watchedAt: watched ? new Date() : null })
    .where(and(eq(listItems.id, id.data), eq(listItems.userId, user.id)))
    .returning({ id: listItems.id });
  if (updated.length === 0) return { error: "This title can't be found." };
  revalidatePath("/", "layout");
  return {};
}

// Puts a title on one of your lists or takes it off, from the title's page: how something added in
// a hurry gets sorted later. Only for titles already on one of your lists.
export async function setOnList(titleId: string, listId: string, on: boolean): Promise<{ error?: string }> {
  const user = await requireUser();
  const title = idSchema.safeParse(titleId);
  const list = idSchema.safeParse(listId);
  if (!title.success || !list.success) return { error: "That list can't be found." };
  const [owned] = await db.select({ id: lists.id }).from(lists).where(and(eq(lists.id, list.data), eq(lists.userId, user.id)));
  if (!owned || !(await onYourLists(user.id, title.data))) return { error: "That list can't be found." };

  if (on) {
    await db
      .insert(listItems)
      .values({ userId: user.id, listId: list.data, titleId: title.data })
      .onConflictDoNothing({ target: [listItems.listId, listItems.titleId] });
  } else {
    await db
      .delete(listItems)
      .where(and(eq(listItems.userId, user.id), eq(listItems.listId, list.data), eq(listItems.titleId, title.data)));
  }
  revalidatePath("/", "layout");
  return {};
}

export async function removeItem(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  const back = idSchema.safeParse(formData.get("listId"));
  if (id.success) await db.delete(listItems).where(and(eq(listItems.id, id.data), eq(listItems.userId, user.id)));
  revalidatePath("/", "layout");
  redirect(back.success ? `/lists/${back.data}` : "/lists", RedirectType.replace);
}

// Makes a list your default: where titles go when you add without choosing a list.
export async function makeDefault(listId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const id = idSchema.safeParse(listId);
  if (!id.success) return { error: "This list can't be found." };
  const done = await db.transaction(async (tx) => {
    const [target] = await tx.select({ id: lists.id }).from(lists).where(and(eq(lists.id, id.data), eq(lists.userId, user.id)));
    if (!target) return false;
    // The old default steps down first: there's only room for one.
    await tx.update(lists).set({ isDefault: false }).where(and(eq(lists.userId, user.id), eq(lists.isDefault, true)));
    await tx.update(lists).set({ isDefault: true }).where(eq(lists.id, id.data));
    return true;
  });
  if (!done) return { error: "This list can't be found." };
  revalidatePath("/", "layout");
  return {};
}

// Public lists show in Discover with your display name; making one private again takes it out.
export async function setListPublic(listId: string, isPublic: boolean): Promise<{ error?: string }> {
  const user = await requireUser();
  const id = idSchema.safeParse(listId);
  if (!id.success) return { error: "This list can't be found." };
  if (isPublic) await ensureProfile(user);
  const updated = await db
    .update(lists)
    .set({ isPublic, ...(isPublic && { publishedAt: sql`coalesce(${lists.publishedAt}, now())` }) })
    .where(and(eq(lists.id, id.data), eq(lists.userId, user.id)))
    .returning({ id: lists.id });
  if (updated.length === 0) return { error: "This list can't be found." };
  revalidatePath("/", "layout");
  return {};
}

const idsSchema = z.array(z.uuid()).min(1).max(500);

// Saves the order you arranged your lists in.
export async function reorderLists(ids: string[]): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { error: "That order can't be saved." };
  await db.transaction(async (tx) => {
    for (const [position, id] of parsed.data.entries()) {
      await tx.update(lists).set({ position }).where(and(eq(lists.id, id), eq(lists.userId, user.id)));
    }
  });
  revalidatePath("/", "layout");
  return {};
}

// Saves the order you arranged a list's titles in (the ones still to watch).
export async function reorderItems(listId: string, ids: string[]): Promise<{ error?: string }> {
  const user = await requireUser();
  const list = idSchema.safeParse(listId);
  const parsed = idsSchema.safeParse(ids);
  if (!list.success || !parsed.success) return { error: "That order can't be saved." };
  await db.transaction(async (tx) => {
    for (const [position, id] of parsed.data.entries()) {
      await tx
        .update(listItems)
        .set({ position })
        .where(and(eq(listItems.id, id), eq(listItems.listId, list.data), eq(listItems.userId, user.id)));
    }
  });
  revalidatePath("/", "layout");
  return {};
}

// Likes (or unlikes) someone's public list.
export async function likeList(listId: string, liked: boolean): Promise<{ error?: string }> {
  const user = await requireUser();
  const id = idSchema.safeParse(listId);
  if (!id.success) return { error: "This list can't be found." };
  if (liked) {
    const [list] = await db.select({ id: lists.id }).from(lists).where(and(eq(lists.id, id.data), eq(lists.isPublic, true)));
    if (!list) return { error: "This list isn't shared anymore." };
    await db.insert(listLikes).values({ userId: user.id, listId: id.data }).onConflictDoNothing();
  } else {
    await db.delete(listLikes).where(and(eq(listLikes.userId, user.id), eq(listLikes.listId, id.data)));
  }
  revalidatePath("/discover", "layout");
  return {};
}
