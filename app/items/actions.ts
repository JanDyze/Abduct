"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/social/profiles";
import { insertComment, MAX_COMMENT, onYourLists, removeComment, saveRating, type CommentView } from "@/lib/titles/feedback";

const id = z.uuid();
const starsSchema = z.number().int().min(1).max(5).nullable();

// Rates a title 1-5 stars, or clears the rating (null).
export async function setRating(titleId: string, stars: number | null): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = starsSchema.safeParse(stars);
  if (!id.safeParse(titleId).success || !parsed.success) return { error: "That rating can't be saved." };
  if (!(await onYourLists(user.id, titleId))) return { error: "This title isn't on your lists." };
  await saveRating(user.id, titleId, parsed.data);
  revalidatePath("/", "layout");
  return {};
}

// A comment on a title. Public ones show to everyone on the title's page, with your name.
export async function addComment(titleId: string, body: string, isPublic: boolean): Promise<{ comment: CommentView } | { error: string }> {
  const user = await requireUser();
  const text = body.trim();
  if (!id.safeParse(titleId).success) return { error: "This title can't be found." };
  if (!text) return { error: "Write something first." };
  if (text.length > MAX_COMMENT) return { error: "A comment can be up to 2,000 characters." };
  if (!(await onYourLists(user.id, titleId))) return { error: "This title isn't on your lists." };
  if (isPublic) await ensureProfile(user);
  const comment = await insertComment(user.id, titleId, text, isPublic === true);
  revalidatePath("/items/[id]", "page");
  return { comment };
}

export async function deleteComment(commentId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!id.safeParse(commentId).success) return { error: "That comment can't be found." };
  const titleId = await removeComment(user.id, commentId);
  if (!titleId) return { error: "That comment can't be found." };
  revalidatePath("/items/[id]", "page");
  return {};
}
