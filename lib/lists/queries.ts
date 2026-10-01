import "server-only";
import { and, asc, desc, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { listItems, lists, picks, ratings, titles } from "@/lib/db/schema";
import { DEFAULT_COLOR, DEFAULT_ICON } from "@/lib/lists/icons";

export type ListSummary = {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  isPublic: boolean;
  total: number;
  unwatched: number;
  posters: string[]; // a few of the newest, for the list's cover
};

export const DEFAULT_LIST = { name: "Watchlist", icon: DEFAULT_ICON, color: DEFAULT_COLOR };

// Your lists in your order (Arrange), with counts and a few posters each. Someone
// with no lists yet gets a Watchlist as their default, so there's always somewhere to add to
// without choosing.
export async function getLists(userId: string): Promise<ListSummary[]> {
  let rows = await listRows(userId);
  if (rows.length === 0) {
    // Two tabs opening the app at once make one: there's only room for one default per person.
    await db.execute(sql`
      insert into ${lists} (user_id, name, icon, color, is_default)
      values (${userId}, ${DEFAULT_LIST.name}, ${DEFAULT_LIST.icon}, ${DEFAULT_LIST.color}, true)
      on conflict (user_id) where is_default do nothing`);
    rows = await listRows(userId);
  } else if (!rows.some((r) => r.isDefault)) {
    // Shouldn't happen (the default can't be deleted), but if it does the first list takes over.
    await db.execute(sql`
      update ${lists} set is_default = true
      where id = ${rows[0].id} and not exists (select 1 from ${lists} where user_id = ${userId} and is_default)`);
    rows = await listRows(userId);
  }
  return rows;
}

async function listRows(userId: string): Promise<ListSummary[]> {
  const rows = await db
    .select({
      id: lists.id,
      name: lists.name,
      icon: lists.icon,
      color: lists.color,
      isDefault: lists.isDefault,
      isPublic: lists.isPublic,
      total: sql<number>`count(${listItems.id})::int`,
      unwatched: sql<number>`count(${listItems.id}) filter (where ${listItems.watchedAt} is null)::int`,
      posters: sql<(string | null)[]>`coalesce((array_agg(${titles.posterUrl} order by ${listItems.addedAt} desc) filter (where ${titles.posterUrl} is not null))[1:3], '{}')`,
    })
    .from(lists)
    .leftJoin(listItems, eq(listItems.listId, lists.id))
    .leftJoin(titles, eq(titles.id, listItems.titleId))
    .where(eq(lists.userId, userId))
    .groupBy(lists.id)
    .orderBy(asc(lists.position), asc(lists.createdAt));
  return rows.map((r) => ({ ...r, posters: r.posters.filter((p): p is string => Boolean(p)) }));
}

export async function getList(userId: string, listId: string) {
  const [list] = await db
    .select({ id: lists.id, name: lists.name, icon: lists.icon, color: lists.color, isDefault: lists.isDefault, isPublic: lists.isPublic })
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.userId, userId)));
  return list ?? null;
}

// Your list item for a title (the first list it's on), to link to your page for it; null when it
// isn't on any of your lists.
export async function firstItemOf(userId: string, titleId: string) {
  const [row] = await db
    .select({ id: listItems.id })
    .from(listItems)
    .innerJoin(lists, eq(lists.id, listItems.listId))
    .where(and(eq(listItems.userId, userId), eq(listItems.titleId, titleId)))
    .orderBy(asc(lists.position))
    .limit(1);
  return row?.id ?? null;
}

// Every catalog title on your lists ("tmdb:603" → its list item), so Discover's posters show a
// check, not a +, for what you already have. The item on your default list if it's there, as that's
// where + adds to.
export async function savedTitles(userId: string): Promise<Record<string, string>> {
  const rows = await db
    .select({ source: titles.source, sourceId: titles.sourceId, itemId: listItems.id, isDefault: lists.isDefault })
    .from(listItems)
    .innerJoin(titles, eq(titles.id, listItems.titleId))
    .innerJoin(lists, eq(lists.id, listItems.listId))
    .where(and(eq(listItems.userId, userId), ne(titles.source, "manual")))
    .orderBy(asc(lists.isDefault));
  // default-list rows come last, so they win
  return Object.fromEntries(rows.map((r) => [`${r.source}:${r.sourceId}`, r.itemId]));
}

// Which of your lists a title is on (a title can be on several).
export async function listsWithTitle(userId: string, titleId: string) {
  const rows = await db
    .select({ listId: listItems.listId })
    .from(listItems)
    .where(and(eq(listItems.userId, userId), eq(listItems.titleId, titleId)));
  return rows.map((r) => r.listId);
}

// For several titles at once: which of your lists each is on (title id → list ids).
export async function listsForTitles(userId: string, titleIds: string[]) {
  if (titleIds.length === 0) return {};
  const rows = await db
    .select({ titleId: listItems.titleId, listId: listItems.listId })
    .from(listItems)
    .where(and(eq(listItems.userId, userId), inArray(listItems.titleId, titleIds)));
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.titleId] ??= []).push(r.listId);
  return out;
}

const itemFields = {
  itemId: listItems.id,
  listId: listItems.listId,
  addedAt: listItems.addedAt,
  watchedAt: listItems.watchedAt,
  titleId: titles.id,
  source: titles.source,
  sourceId: titles.sourceId,
  kind: titles.kind,
  name: titles.name,
  year: titles.year,
  posterUrl: titles.posterUrl,
  backdropUrl: titles.backdropUrl,
  overview: titles.overview,
  genres: titles.genres,
  runtime: titles.runtime,
  episodes: titles.episodes,
  score: titles.score,
};

export type ListItem = Awaited<ReturnType<typeof getItems>>[number];

// Your rating of the title, joined in where a page shows it.
const yourRating = (userId: string) => and(eq(ratings.titleId, listItems.titleId), eq(ratings.userId, userId));

// A list's titles: still to watch first, in your order (Arrange; titles added since go on top,
// newest first), then the watched ones, most recently watched first.
export async function getItems(userId: string, listId: string) {
  return db
    .select({ ...itemFields, stars: ratings.stars })
    .from(listItems)
    .innerJoin(titles, eq(titles.id, listItems.titleId))
    .leftJoin(ratings, yourRating(userId))
    .where(and(eq(listItems.listId, listId), eq(listItems.userId, userId)))
    .orderBy(sql`${listItems.watchedAt} is not null`, desc(listItems.watchedAt), sql`${listItems.position} asc nulls first`, desc(listItems.addedAt));
}

export async function getItem(userId: string, itemId: string) {
  const [row] = await db
    .select({ ...itemFields, listName: lists.name, stars: ratings.stars })
    .from(listItems)
    .innerJoin(titles, eq(titles.id, listItems.titleId))
    .innerJoin(lists, eq(lists.id, listItems.listId))
    .leftJoin(ratings, yourRating(userId))
    .where(and(eq(listItems.id, itemId), eq(listItems.userId, userId)));
  return row ?? null;
}

// Newest additions across all lists, for Home. A title added to two lists shows once.
export async function recentItems(userId: string, limit = 12) {
  const rows = await db
    .select(itemFields)
    .from(listItems)
    .innerJoin(titles, eq(titles.id, listItems.titleId))
    .where(and(eq(listItems.userId, userId), isNull(listItems.watchedAt)))
    .orderBy(desc(listItems.addedAt))
    .limit(limit * 3);
  const seen = new Set<string>();
  return rows.filter((r) => !seen.has(r.titleId) && seen.add(r.titleId)).slice(0, limit);
}

// Everything on every list, for the randomizer to choose from (it filters on the phone).
export async function spinItems(userId: string) {
  return db
    .select({ ...itemFields, stars: ratings.stars })
    .from(listItems)
    .innerJoin(titles, eq(titles.id, listItems.titleId))
    .leftJoin(ratings, yourRating(userId))
    .where(eq(listItems.userId, userId))
    .orderBy(asc(listItems.addedAt));
}

// How many different titles are still to watch, across all lists (a title on two lists counts once).
export async function unwatchedCount(userId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(distinct ${listItems.titleId})::int` })
    .from(listItems)
    .where(and(eq(listItems.userId, userId), isNull(listItems.watchedAt)));
  return row?.n ?? 0;
}

// Across all your lists, how many different titles there are and how many are still to watch (a
// title on two lists counts once, and is still to watch while either says so), for My lists.
export async function listStats(userId: string) {
  const [row] = await db
    .select({
      toWatch: sql<number>`count(distinct ${listItems.titleId}) filter (where ${listItems.watchedAt} is null)::int`,
      total: sql<number>`count(distinct ${listItems.titleId})::int`,
    })
    .from(listItems)
    .where(eq(listItems.userId, userId));
  const total = row?.total ?? 0;
  const toWatch = row?.toWatch ?? 0;
  return { total, toWatch, watched: total - toWatch };
}

// Titles the randomizer offered lately, so it can go easy on them.
export async function recentPickTitleIds(userId: string, limit = 10) {
  const rows = await db
    .select({ titleId: picks.titleId })
    .from(picks)
    .where(eq(picks.userId, userId))
    .orderBy(desc(picks.createdAt))
    .limit(limit);
  return rows.map((r) => r.titleId);
}

// The last thing they agreed to watch in the past day and a half (long enough to still show the
// next morning), for Home's "Tonight's pick".
export async function tonightsPick(userId: string) {
  const [row] = await db
    .select({ pickId: picks.id, at: picks.createdAt, titleId: titles.id, name: titles.name, posterUrl: titles.posterUrl, kind: titles.kind })
    .from(picks)
    .innerJoin(titles, eq(titles.id, picks.titleId))
    .where(and(eq(picks.userId, userId), eq(picks.accepted, true), gt(picks.createdAt, sql`now() - interval '36 hours'`)))
    .orderBy(desc(picks.createdAt))
    .limit(1);
  return row ?? null;
}
