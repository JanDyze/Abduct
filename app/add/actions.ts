"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listItems, lists, titles } from "@/lib/db/schema";
import { getLists } from "@/lib/lists/queries";
import { fieldErrors, manualTitleSchema, type FormState } from "@/lib/lists/input";
import { searchCatalog, type SearchOutcome } from "@/lib/titles/catalog";
import { KINDS } from "@/lib/titles/kinds";
import { saveCatalogTitle, saveManualTitle } from "@/lib/titles/save";

const searchSchema = z.object({ query: z.string().max(100), kind: z.enum([...KINDS, "all"]) });

export async function searchTitles(query: string, kind: string): Promise<SearchOutcome> {
  await requireUser();
  const parsed = searchSchema.safeParse({ query, kind });
  if (!parsed.success) return { results: [], unavailable: [], tmdbOff: false };
  return searchCatalog(parsed.data.query, parsed.data.kind);
}

async function ownsList(userId: string, listId: string) {
  const [row] = await db.select({ id: lists.id }).from(lists).where(and(eq(lists.id, listId), eq(lists.userId, userId)));
  return Boolean(row);
}

// Puts a title on a list; already there is fine (it just says so). Returns the list item either
// way, so an add can be undone.
async function addToList(userId: string, listId: string, titleId: string) {
  const [inserted] = await db
    .insert(listItems)
    .values({ userId, listId, titleId })
    .onConflictDoNothing({ target: [listItems.listId, listItems.titleId] })
    .returning({ id: listItems.id });
  revalidatePath("/", "layout");
  if (inserted) return { itemId: inserted.id, added: true };
  const [existing] = await db
    .select({ id: listItems.id })
    .from(listItems)
    .where(and(eq(listItems.listId, listId), eq(listItems.titleId, titleId), eq(listItems.userId, userId)));
  return { itemId: existing.id, added: false };
}

// Takes back an add made by mistake: the title comes off that list again.
export async function undoAdd(itemId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const id = z.uuid().safeParse(itemId);
  if (!id.success) return { error: "That title can't be found." };
  await db.delete(listItems).where(and(eq(listItems.id, id.data), eq(listItems.userId, user.id)));
  revalidatePath("/", "layout");
  return {};
}

const addSchema = z.object({
  listId: z.uuid(),
  source: z.enum(["tmdb", "anilist"]),
  sourceId: z.string().min(1).max(40),
});

export type AddResult = { ok: true; already: boolean; itemId: string } | { ok: false; error: string };

export async function addCatalogTitle(listId: string, source: string, sourceId: string): Promise<AddResult> {
  const user = await requireUser();
  const parsed = addSchema.safeParse({ listId, source, sourceId });
  if (!parsed.success || !(await ownsList(user.id, parsed.data.listId))) return { ok: false, error: "That list can't be found." };

  let titleId: string | null;
  try {
    titleId = await saveCatalogTitle(parsed.data.source, parsed.data.sourceId);
  } catch {
    return { ok: false, error: "Couldn't reach the catalog. Try again in a moment." };
  }
  if (!titleId) return { ok: false, error: "That title can't be found anymore." };
  const { itemId, added } = await addToList(user.id, parsed.data.listId, titleId);
  return { ok: true, already: !added, itemId };
}

export async function addManualTitle(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const listId = z.uuid().safeParse(formData.get("listId"));
  if (!listId.success || !(await ownsList(user.id, listId.data))) return { errors: { form: "That list can't be found." } };
  const parsed = manualTitleSchema.safeParse({
    name: formData.get("name") ?? "",
    kind: formData.get("kind") ?? "",
    year: formData.get("year") ?? "",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const titleId = await saveManualTitle(user.id, parsed.data);
  await addToList(user.id, listId.data, titleId);
  redirect(`/lists/${listId.data}`, RedirectType.replace);
}

// Adds a title that's already on Abduct (from someone's public list, or Most liked) to one of your
// lists: your default unless another is named.
export async function addExistingTitle(titleId: string, listId?: string): Promise<AddResult> {
  const user = await requireUser();
  const title = z.uuid().safeParse(titleId);
  if (!title.success) return { ok: false, error: "That title can't be found." };
  const yours = await getLists(user.id);
  const target = listId ? yours.find((l) => l.id === listId) : (yours.find((l) => l.isDefault) ?? yours[0]);
  if (!target) return { ok: false, error: "That list can't be found." };
  const [exists] = await db.select({ id: titles.id }).from(titles).where(eq(titles.id, title.data));
  if (!exists) return { ok: false, error: "That title can't be found." };
  const { itemId, added } = await addToList(user.id, target.id, title.data);
  return { ok: true, already: !added, itemId };
}

// Adds a catalog title (from Discover's New & trending) to your default list.
export async function addTrendingTitle(source: string, sourceId: string): Promise<AddResult> {
  const user = await requireUser();
  const yours = await getLists(user.id);
  const target = yours.find((l) => l.isDefault) ?? yours[0];
  return addCatalogTitle(target.id, source, sourceId);
}
