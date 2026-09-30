import type { Kind } from "./kinds";

// Genres to browse Discover by, per kind. Movies and series use TMDB's genre ids (TMDB keeps
// separate lists for the two), anime AniList's genre names. A few are left out: TMDB's TV Movie,
// News, Soap and Talk (nothing anyone browses for), and AniList's adult ones.
export type Genre = { id: string; name: string };

export const GENRES: Record<Kind, Genre[]> = {
  movie: [
    { id: "28", name: "Action" },
    { id: "12", name: "Adventure" },
    { id: "16", name: "Animation" },
    { id: "35", name: "Comedy" },
    { id: "80", name: "Crime" },
    { id: "99", name: "Documentary" },
    { id: "18", name: "Drama" },
    { id: "10751", name: "Family" },
    { id: "14", name: "Fantasy" },
    { id: "36", name: "History" },
    { id: "27", name: "Horror" },
    { id: "10402", name: "Music" },
    { id: "9648", name: "Mystery" },
    { id: "10749", name: "Romance" },
    { id: "878", name: "Sci-fi" },
    { id: "53", name: "Thriller" },
    { id: "10752", name: "War" },
    { id: "37", name: "Western" },
  ],
  series: [
    { id: "10759", name: "Action & adventure" },
    { id: "16", name: "Animation" },
    { id: "35", name: "Comedy" },
    { id: "80", name: "Crime" },
    { id: "99", name: "Documentary" },
    { id: "18", name: "Drama" },
    { id: "10751", name: "Family" },
    { id: "10762", name: "Kids" },
    { id: "9648", name: "Mystery" },
    { id: "10764", name: "Reality" },
    { id: "10765", name: "Sci-fi & fantasy" },
    { id: "10768", name: "War & politics" },
    { id: "37", name: "Western" },
  ],
  anime: ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"].map(
    (name) => ({ id: name, name }),
  ),
};

// Topics shown alongside the genres, for what TMDB has no genre for. Each is one of its keywords:
// Christian movies are tagged "christian film"; series hardly ever are, so they use "christianity"
// (The Chosen, House of David).
export const TOPIC_CHIPS: { name: string; byKind: Partial<Record<Kind, number>> }[] = [{ name: "Christian", byKind: { movie: 253695, series: 186 } }];

// A topic chip's name, when a topic id is one of them.
export function topicChipOf(id: number | null | undefined) {
  return TOPIC_CHIPS.find((t) => Object.values(t.byKind).includes(id ?? -1)) ?? null;
}

export function genreOf(kind: Kind, id: string | null | undefined) {
  return GENRES[kind].find((g) => g.id === id) ?? null;
}

// Discover's feeds, each a "See all" page: trending, the most popular in a genre, the most popular
// of what can be streamed in your country, and a topic (one of TMDB's keywords, like "christian
// film", found by searching Discover). Country and topic are TMDB's, so not for anime.
export type Feed = "trending" | "genre" | "country" | "topic";

// `id`: the genre's id for a genre feed, the keyword's id for a topic.
export function browseHref(kind: Kind, feed: Feed, id?: string | number) {
  const params = new URLSearchParams({ kind, feed });
  if ((feed === "genre" || feed === "topic") && id != null) params.set(feed, String(id));
  return `/discover/browse?${params}`;
}
