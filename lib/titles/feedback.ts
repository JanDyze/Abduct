import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments, listItems, ratings } from "@/lib/db/schema";

export const MAX_COMMENT = 2000;

// A comment as the page shows it. `at` is an ISO date; the phone writes it in its own time zone.
export type CommentView = { id: string; body: string; at: string; isPublic: boolean };

// Ratings and comments are only for titles on one of your lists (the title page is reached
// through a list), which also keeps made-up title ids out.
export async function onYourLists(userId: string, titleId: string) {
  const [row] = await db
    .select({ id: listItems.id })
    .from(listItems)
    .where(and(eq(listItems.userId, userId), eq(listItems.titleId, titleId)))
    .limit(1);
  return Boolean(row);
}

export async function saveRating(userId: string, titleId: string, stars: number | null) {
  if (stars == null) {
    await db.delete(ratings).where(and(eq(ratings.userId, userId), eq(ratings.titleId, titleId)));
    return;
  }
  await db
    .insert(ratings)
    .values({ userId, titleId, stars })
    .onConflictDoUpdate({ target: [ratings.userId, ratings.titleId], set: { stars, updatedAt: sql`now()` } });
}

// Oldest first, so the thread reads top to bottom.
export async function getComments(userId: string, titleId: string): Promise<CommentView[]> {
  const rows = await db
    .select({ id: comments.id, body: comments.body, createdAt: comments.createdAt, isPublic: comments.isPublic })
    .from(comments)
    .where(and(eq(comments.userId, userId), eq(comments.titleId, titleId)))
    .orderBy(asc(comments.createdAt));
  return rows.map((r) => ({ id: r.id, body: r.body, at: r.createdAt.toISOString(), isPublic: r.isPublic }));
}

export async function insertComment(userId: string, titleId: string, body: string, isPublic: boolean): Promise<CommentView> {
  const [row] = await db.insert(comments).values({ userId, titleId, body, isPublic }).returning();
  return { id: row.id, body: row.body, at: row.createdAt.toISOString(), isPublic: row.isPublic };
}

// Deletes one of your comments; returns its title, or null when there was nothing to delete.
export async function removeComment(userId: string, commentId: string) {
  const [row] = await db
    .delete(comments)
    .where(and(eq(comments.id, commentId), eq(comments.userId, userId)))
    .returning({ titleId: comments.titleId });
  return row?.titleId ?? null;
}
