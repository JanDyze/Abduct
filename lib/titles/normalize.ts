import type { Kind } from "./kinds";

// A search hit, before anyone has added it. Enough to show a poster and pick the right one.
export type CatalogResult = {
  source: "tmdb" | "anilist";
  sourceId: string;
  kind: Kind;
  name: string;
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
};

// Everything the titles table keeps, from the catalog's detail endpoint.
export type CatalogDetails = CatalogResult & {
  backdropUrl: string | null;
  genres: string[];
  runtime: number | null;
  episodes: number | null;
  score: number | null;
};

const TMDB_IMG = "https://image.tmdb.org/t/p";
const img = (path: unknown, size: string) => (typeof path === "string" && path ? `${TMDB_IMG}/${size}${path}` : null);
const yearOf = (date: unknown) => (typeof date === "string" && /^\d{4}/.test(date) ? Number(date.slice(0, 4)) : null);
const text = (s: unknown) => (typeof s === "string" && s.trim() ? s.trim() : null);
const positive = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n) : null);

// TMDB's genre id for Animation. A Japanese animated series is anime, which AniList covers better,
// so "All" search leaves those TMDB hits out instead of showing the same show twice.
const TMDB_ANIMATION = 16;

type TmdbHit = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
  genre_ids?: number[];
  origin_country?: string[];
};

export function isTmdbAnime(hit: TmdbHit) {
  return (hit.genre_ids ?? []).includes(TMDB_ANIMATION) && (hit.origin_country ?? []).includes("JP");
}

export function fromTmdbHit(hit: TmdbHit, kind: "movie" | "series"): CatalogResult {
  return {
    source: "tmdb",
    sourceId: `${kind === "movie" ? "movie" : "tv"}:${hit.id}`,
    kind,
    name: (kind === "movie" ? hit.title : hit.name)?.trim() || "Untitled",
    year: yearOf(kind === "movie" ? hit.release_date : hit.first_air_date),
    posterUrl: img(hit.poster_path, "w342"),
    overview: text(hit.overview),
  };
}

type TmdbDetail = TmdbHit & {
  backdrop_path?: string | null;
  genres?: { name: string }[];
  runtime?: number | null;
  episode_run_time?: number[];
  last_episode_to_air?: { runtime?: number | null } | null;
  number_of_episodes?: number | null;
  vote_average?: number;
  vote_count?: number;
};

export function fromTmdbDetail(d: TmdbDetail, kind: "movie" | "series"): CatalogDetails {
  return {
    ...fromTmdbHit(d, kind),
    backdropUrl: img(d.backdrop_path, "w780"),
    genres: (d.genres ?? []).map((g) => g.name).filter(Boolean),
    runtime: kind === "movie" ? positive(d.runtime) : positive(d.episode_run_time?.[0] ?? d.last_episode_to_air?.runtime),
    episodes: kind === "movie" ? null : positive(d.number_of_episodes),
    // A score from a handful of votes says little, so it needs a few before it's shown.
    score: d.vote_count && d.vote_count >= 20 && d.vote_average ? Math.round(d.vote_average * 10) : null,
  };
}

export type AniListMedia = {
  id: number;
  title: { english?: string | null; romaji?: string | null };
  startDate?: { year?: number | null } | null;
  coverImage?: { extraLarge?: string | null; large?: string | null } | null;
  bannerImage?: string | null;
  description?: string | null;
  genres?: string[] | null;
  duration?: number | null;
  episodes?: number | null;
  averageScore?: number | null;
};

// AniList descriptions come with <br> and <i> tags and a "(Source: ...)" credit line.
export function cleanDescription(html: string | null | undefined) {
  if (!html) return null;
  const plain = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\(Source:[^)]*\)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return plain || null;
}

export function fromAniList(m: AniListMedia): CatalogDetails {
  return {
    source: "anilist",
    sourceId: String(m.id),
    kind: "anime",
    name: m.title.english?.trim() || m.title.romaji?.trim() || "Untitled",
    year: m.startDate?.year ?? null,
    // `large` is only about 230px wide, soft on a phone screen; `extraLarge` is sharp.
    posterUrl: m.coverImage?.extraLarge ?? m.coverImage?.large ?? null,
    overview: cleanDescription(m.description),
    backdropUrl: m.bannerImage ?? null,
    genres: m.genres ?? [],
    runtime: positive(m.duration),
    episodes: positive(m.episodes),
    score: positive(m.averageScore),
  };
}
