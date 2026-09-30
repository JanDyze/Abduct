// What a title is. Anime is its own kind (not a genre of series) because it has its own catalog
// (AniList) and people usually want "an anime tonight", not "any series".
export const KINDS = ["movie", "series", "anime"] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_LABEL: Record<Kind, string> = { movie: "Movie", series: "Series", anime: "Anime" };
export const KIND_PLURAL: Record<Kind, string> = { movie: "Movies", series: "Series", anime: "Anime" };

// Where a title's details came from. `manual`: typed in by someone, no catalog behind it.
export const SOURCES = ["tmdb", "anilist", "manual"] as const;
export type Source = (typeof SOURCES)[number];

export function isKind(value: unknown): value is Kind {
  return typeof value === "string" && (KINDS as readonly string[]).includes(value);
}
