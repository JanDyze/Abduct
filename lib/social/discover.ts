import "server-only";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments, listItems, listLikes, lists, profiles, ratings, titles } from "@/lib/db/schema";

// What others share: public lists, how people rate titles, and public comments. Only lists
// marked public and comments not marked "Only me" ever leave their owner's account here.

export type PublicListCard = {
  id: string;
  name: string;
  icon: string;
  color: string;
  owner: string;
  likes: number;
  total: number;
  posters: string[];
};

const likesOf = sql<number>`(select count(*)::int from ${listLikes} where ${listLikes.listId} = ${lists.id})`;
const totalOf = sql<number>`(select count(*)::int from ${listItems} where ${listItems.listId} = ${lists.id})`;
const postersOf = sql<string[]>`(select coalesce(array_agg(s.p), '{}') from (
  select ${titles.posterUrl} as p from ${listItems} join ${titles} on ${titles.id} = ${listItems.titleId}
  where ${listItems.listId} = ${lists.id} and ${titles.posterUrl} is not null
  order by ${listItems.addedAt} desc limit 3) s)`;

const cardFields = {
  id: lists.id,
  name: lists.name,
  icon: lists.icon,
  color: lists.color,
  owner: sql<string>`coalesce(${profiles.displayName}, 'Someone')`,
  likes: likesOf,
  total: totalOf,
  posters: postersOf,
};

// Public lists with something on them, most liked first (then the fullest, then the newest).
export async function popularLists(limit = 12): Promise<PublicListCard[]> {
  return db
    .select(cardFields)
    .from(lists)
    .leftJoin(profiles, eq(profiles.userId, lists.userId))
    .where(and(eq(lists.isPublic, true), sql`${totalOf} > 0`))
    .orderBy(desc(likesOf), desc(totalOf), desc(lists.publishedAt))
    .limit(limit);
}

// The lists people made public most recently.
export async function newestLists(limit = 12): Promise<PublicListCard[]> {
  return db
    .select(cardFields)
    .from(lists)
    .leftJoin(profiles, eq(profiles.userId, lists.userId))
    .where(and(eq(lists.isPublic, true), sql`${totalOf} > 0`))
    .orderBy(desc(lists.publishedAt))
    .limit(limit);
}

// A public list as others see it (its owner sees it too). Null when it's private and not yours.
export async function getPublicList(listId: string, viewerId: string) {
  const [list] = await db
    .select({
      ...cardFields,
      userId: lists.userId,
      isPublic: lists.isPublic,
      liked: sql<boolean>`exists (select 1 from ${listLikes} where ${listLikes.listId} = ${lists.id} and ${listLikes.userId} = ${viewerId})`,
    })
    .from(lists)
    .leftJoin(profiles, eq(profiles.userId, lists.userId))
    .where(eq(lists.id, listId));
  if (!list || (!list.isPublic && list.userId !== viewerId)) return null;
  const items = await db
    .select({ titleId: titles.id, name: titles.name, kind: titles.kind, year: titles.year, posterUrl: titles.posterUrl })
    .from(listItems)
    .innerJoin(titles, eq(titles.id, listItems.titleId))
    .where(eq(listItems.listId, listId))
    .orderBy(sql`${listItems.position} asc nulls first`, desc(listItems.addedAt));
  return { ...list, mine: list.userId === viewerId, items };
}

// Titles people on Abduct rate highest. Ranked on a score that starts every title at three stars
// from two imaginary votes, so one five-star rating doesn't beat twenty fours.
export async function mostLiked(limit = 12) {
  const score = sql<number>`(sum(${ratings.stars}) + 6)::float / (count(*) + 2)`;
  return db
    .select({
      titleId: titles.id,
      name: titles.name,
      kind: titles.kind,
      posterUrl: titles.posterUrl,
      average: sql<number>`round(avg(${ratings.stars})::numeric, 1)::float`,
      votes: sql<number>`count(*)::int`,
    })
    .from(ratings)
    .innerJoin(titles, eq(titles.id, ratings.titleId))
    .groupBy(titles.id)
    .orderBy(desc(score), desc(sql`count(*)`))
    .limit(limit);
}

export async function getTitle(titleId: string) {
  const [row] = await db.select().from(titles).where(eq(titles.id, titleId));
  return row ?? null;
}

// Everyone's stars on a title, averaged.
export async function communityRating(titleId: string) {
  const [row] = await db
    .select({ average: sql<number | null>`round(avg(${ratings.stars})::numeric, 1)::float`, votes: sql<number>`count(*)::int` })
    .from(ratings)
    .where(eq(ratings.titleId, titleId));
  return { average: row?.average ?? null, votes: row?.votes ?? 0 };
}

export type PublicComment = { id: string; body: string; at: string; name: string };

// What others said about a title in their public comments, oldest first. `except` leaves out your
// own (your page shows those in your thread).
export async function publicComments(titleId: string, except?: string): Promise<PublicComment[]> {
  const rows = await db
    .select({ id: comments.id, body: comments.body, createdAt: comments.createdAt, name: sql<string>`coalesce(${profiles.displayName}, 'Someone')` })
    .from(comments)
    .leftJoin(profiles, eq(profiles.userId, comments.userId))
    .where(and(eq(comments.titleId, titleId), eq(comments.isPublic, true), except ? ne(comments.userId, except) : undefined))
    .orderBy(asc(comments.createdAt))
    .limit(100);
  return rows.map((r) => ({ id: r.id, body: r.body, at: r.createdAt.toISOString(), name: r.name }));
}
