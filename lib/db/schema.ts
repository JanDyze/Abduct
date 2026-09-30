import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import { KINDS, SOURCES } from "@/lib/titles/kinds";

export const titleKind = pgEnum("title_kind", KINDS);
export const titleSource = pgEnum("title_source", SOURCES);

// RLS is enabled with no policies: the app connects directly through Drizzle (as the table
// owner), and Supabase's public Data API gets no access. Every query on user data must filter by
// user_id.

// A movie, series or anime, as its catalog describes it. Shared by everyone: the first person to
// add a title saves its details here and everyone after reuses the row (one per source + id).
// Manual titles are typed in by someone and belong to them (created_by), with their own id as
// source_id.
export const titles = pgTable(
  "titles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: titleSource("source").notNull(),
    sourceId: text("source_id").notNull(),
    kind: titleKind("kind").notNull(),
    name: text("name").notNull(),
    year: integer("year"),
    posterUrl: text("poster_url"),
    backdropUrl: text("backdrop_url"),
    overview: text("overview"),
    genres: text("genres").array().notNull().default(sql`'{}'::text[]`),
    // Minutes: a movie's length, or one episode's for a series or anime.
    runtime: integer("runtime"),
    episodes: integer("episodes"),
    // The catalog's audience score, 0-100.
    score: integer("score"),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("titles_source_idx").on(t.source, t.sourceId)],
).enableRLS();

// A named list of things to watch ("Watchlist", "Date night", "Anime backlog"). Everyone gets a
// Watchlist, their default list, the first time they open the app (lib/lists/queries.ts).
export const lists = pgTable(
  "lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Its cover: an icon from lib/lists/icons.ts and a color that tints it.
    icon: text("icon").notNull().default("watchlist"),
    color: text("color").notNull().default("orange"),
    position: integer("position").notNull().default(0),
    // Where titles go when you add them without choosing a list. One per person, always first,
    // can be renamed but not deleted.
    isDefault: boolean("is_default").notNull().default(false),
    // Public: anyone on Abduct can find it in Discover, see what's on it and add from it.
    // published_at is when it was first made public, for "newest lists".
    isPublic: boolean("is_public").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("lists_user_idx").on(t.userId, t.position),
    index("lists_public_idx").on(t.publishedAt).where(sql`${t.isPublic}`),
    uniqueIndex("lists_one_default_idx").on(t.userId).where(sql`${t.isDefault}`),
    check("lists_name_length", sql`char_length(${t.name}) between 1 and 40`),
  ],
).enableRLS();

// A title on a list. The same title can be on several lists; watched is per list item, so
// "Date night" can still offer a movie you watched alone.
export const listItems = pgTable(
  "list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    watchedAt: timestamp("watched_at", { withTimezone: true }),
    // Your own order within the list (Arrange); null until arranged, which puts new titles on top.
    position: integer("position"),
  },
  (t) => [
    uniqueIndex("list_items_list_title_idx").on(t.listId, t.titleId),
    index("list_items_user_idx").on(t.userId, t.addedAt),
  ],
).enableRLS();

// What the randomizer landed on. `accepted`: they tapped "We're watching this" rather than
// spinning again. Recent picks are less likely to come up again (lib/randomizer/pick.ts).
export const picks = pgTable(
  "picks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    listId: uuid("list_id").references(() => lists.id, { onDelete: "set null" }),
    accepted: boolean("accepted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("picks_user_idx").on(t.userId, t.createdAt)],
).enableRLS();

// Your verdict on a title, 1 to 5 stars. It belongs to the title, not a list, so it stays when the
// title moves between lists or comes off one.
export const ratings = pgTable(
  "ratings",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    stars: integer("stars").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.titleId] }), check("ratings_stars_range", sql`${t.stars} between 1 and 5`)],
).enableRLS();

// What you thought of a title, as a thread of dated comments added over time ("Stopped at episode
// 4", "Rewatched, still great"), like Kept's notes on a verse. Public ones show to everyone on the
// title's page, with your name; "Only me" ones only to you.
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    isPublic: boolean("is_public").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("comments_title_public_idx").on(t.titleId, t.createdAt).where(sql`${t.isPublic}`), index("comments_user_title_idx").on(t.userId, t.titleId, t.createdAt), check("comments_body_length", sql`char_length(${t.body}) between 1 and 2000`)],
).enableRLS();

// The name others see with your public lists and comments. Made the first time it's needed, from
// the first name Google gave (guests are "Guest"); changeable in Settings.
export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("profiles_display_name_length", sql`char_length(${t.displayName}) between 1 and 30`)],
).enableRLS();

// A like on someone's public list; Discover ranks public lists by them.
export const listLikes = pgTable(
  "list_likes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.listId] }), index("list_likes_list_idx").on(t.listId)],
).enableRLS();

// Usage, for the admin dashboard: one row per screen opened by a signed-in person (ids in the
// path folded to :id, so it says which screen, not which list or title). Everything else the
// dashboard shows is counted from the other tables.
export const appEvents = pgTable(
  "app_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // "view" for now
    path: text("path").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("app_events_created_idx").on(t.createdAt), index("app_events_user_idx").on(t.userId, t.createdAt)],
).enableRLS();
