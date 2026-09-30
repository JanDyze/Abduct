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

export function genreOf(kind: Kind, id: string | null | undefined) {
  return GENRES[kind].find((g) => g.id === id) ?? null;
}

// Discover's feeds, each a "See all" page: trending, the most popular in a genre, and the most
// popular of what can be streamed in your country (not for anime: AniList doesn't know countries).
export type Feed = "trending" | "genre" | "country";

export function browseHref(kind: Kind, feed: Feed, genre?: string) {
  const params = new URLSearchParams({ kind, feed });
  if (feed === "genre" && genre) params.set("genre", genre);
  return `/discover/browse?${params}`;
}
