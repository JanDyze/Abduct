import "server-only";
import type { Feed } from "./genres";
import type { Kind } from "./kinds";
import {
  fromAniList,
  fromTmdbDetail,
  fromTmdbHit,
  isTmdbAnime,
  type AniListMedia,
  type CatalogDetails,
  type CatalogResult,
} from "./normalize";

// Movies and series come from TMDB (needs TMDB_READ_TOKEN), anime from AniList (no key). Both are
// asked from the server so the token stays private and posters load from their own CDNs.

const TIMEOUT = 6000;

export const tmdbEnabled = () => Boolean(process.env.TMDB_READ_TOKEN);

export async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  for (const [k, v] of Object.entries({ language: "en-US", ...params })) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}`, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT),
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok) throw new Error(`TMDB ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

const ANILIST_FIELDS = `id title { english romaji } startDate { year } coverImage { extraLarge large } bannerImage
  description(asHtml: false) genres duration episodes averageScore`;

export async function anilist<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`AniList: ${res.status}`);
  const json = (await res.json()) as { data: T };
  return json.data;
}

type TmdbPage = { results: Parameters<typeof fromTmdbHit>[0][]; total_pages?: number };

async function searchTmdb(query: string, kind: "movie" | "series", skipAnime: boolean) {
  const page = await tmdb<TmdbPage>(`search/${kind === "movie" ? "movie" : "tv"}`, { query, include_adult: "false" });
  return page.results.filter((hit) => !(skipAnime && isTmdbAnime(hit))).map((hit) => fromTmdbHit(hit, kind));
}

async function searchAniList(query: string) {
  const data = await anilist<{ Page: { media: AniListMedia[] } }>(
    `query ($q: String) { Page(perPage: 12) { media(search: $q, type: ANIME, isAdult: false, sort: SEARCH_MATCH) { ${ANILIST_FIELDS} } } }`,
    { q: query },
  );
  return data.Page.media.map((m): CatalogResult => {
    const { source, sourceId, kind, name, year, posterUrl, overview } = fromAniList(m);
    return { source, sourceId, kind, name, year, posterUrl, overview };
  });
}

// `unavailable`: catalogs that didn't answer this time. `tmdbOff`: no TMDB token, so movies and
// series can't be searched at all (they can still be added by hand).
export type SearchOutcome = { results: CatalogResult[]; unavailable: ("tmdb" | "anilist")[]; tmdbOff: boolean };

// Searches the catalogs for `kind` ("all": movies, series and anime together, interleaved so the
// best match of each shows near the top). A catalog that's down or not set up is reported, not
// thrown, so the others still answer.
export async function searchCatalog(query: string, kind: Kind | "all"): Promise<SearchOutcome> {
  const q = query.trim().slice(0, 100);
  const tmdbOff = !tmdbEnabled();
  if (!q) return { results: [], unavailable: [], tmdbOff };
  const unavailable: SearchOutcome["unavailable"] = [];

  const jobs: { source: "tmdb" | "anilist"; run: Promise<CatalogResult[]> }[] = [];
  if (tmdbEnabled() && (kind === "all" || kind === "movie")) jobs.push({ source: "tmdb", run: searchTmdb(q, "movie", false) });
  if (tmdbEnabled() && (kind === "all" || kind === "series")) jobs.push({ source: "tmdb", run: searchTmdb(q, "series", kind === "all") });
  if (kind === "all" || kind === "anime") jobs.push({ source: "anilist", run: searchAniList(q) });

  const settled = await Promise.allSettled(jobs.map((j) => j.run));
  const groups: CatalogResult[][] = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") groups.push(s.value);
    else {
      console.error("Catalog search failed:", s.reason);
      if (!unavailable.includes(jobs[i].source)) unavailable.push(jobs[i].source);
    }
  });

  const results: CatalogResult[] = [];
  for (let i = 0; groups.some((g) => i < g.length); i++) for (const g of groups) if (g[i]) results.push(g[i]);
  return { results: results.slice(0, 30), unavailable, tmdbOff };
}

// Full details for one catalog title, to save when someone adds it.
export async function fetchDetails(source: "tmdb" | "anilist", sourceId: string): Promise<CatalogDetails | null> {
  if (source === "anilist") {
    const id = Number(sourceId);
    if (!Number.isInteger(id) || id <= 0) return null;
    const data = await anilist<{ Media: AniListMedia | null }>(`query ($id: Int) { Media(id: $id, type: ANIME) { ${ANILIST_FIELDS} } }`, { id });
    return data.Media ? fromAniList(data.Media) : null;
  }
  const match = /^(movie|tv):(\d+)$/.exec(sourceId);
  if (!match || !tmdbEnabled()) return null;
  const kind = match[1] === "movie" ? "movie" : "series";
  return fromTmdbDetail(await tmdb(`${match[1]}/${match[2]}`), kind);
}

// What's new and popular right now, for Discover: TMDB's trending movies and series this week and
// AniList's trending anime. Kept for an hour per server so Discover doesn't ask on every visit.
const TRENDING_TTL = 60 * 60 * 1000;
const trendingCache = new Map<Kind, { at: number; results: CatalogResult[] }>();

export async function trending(kind: Kind): Promise<CatalogResult[]> {
  const cached = trendingCache.get(kind);
  if (cached && Date.now() - cached.at < TRENDING_TTL) return cached.results;
  let results: CatalogResult[] = [];
  try {
    if (kind === "anime") {
      const data = await anilist<{ Page: { media: AniListMedia[] } }>(
        `query { Page(perPage: 18) { media(type: ANIME, isAdult: false, sort: TRENDING_DESC) { ${ANILIST_FIELDS} } } }`,
        {},
      );
      results = data.Page.media.map((m) => {
        const { source, sourceId, kind, name, year, posterUrl, overview } = fromAniList(m);
        return { source, sourceId, kind, name, year, posterUrl, overview };
      });
    } else if (tmdbEnabled()) {
      const page = await tmdb<TmdbPage>(`trending/${kind === "movie" ? "movie" : "tv"}/week`);
      results = page.results.filter((hit) => !(kind === "series" && isTmdbAnime(hit))).slice(0, 18).map((hit) => fromTmdbHit(hit, kind));
    }
  } catch (e) {
    console.error("Trending failed:", e);
    return cached?.results ?? [];
  }
  trendingCache.set(kind, { at: Date.now(), results });
  return results;
}

// Discover's "See all" pages (Feed, in lib/titles/genres.ts): more of a feed, a page at a time.
export type BrowsePage = { results: CatalogResult[]; hasMore: boolean };

const PER_PAGE = 20; // TMDB's fixed page size; AniList is asked for the same
const MAX_PAGE = 50; // plenty to scroll through, and keeps the ids in the URL sensible

// AniList is asked with POST, which Next doesn't cache, so its pages are kept here for an hour.
const anilistPages = new Map<string, { at: number; page: BrowsePage }>();

export async function browse(kind: Kind, feed: Feed, opts: { genre?: string; country?: string; page?: number }): Promise<BrowsePage> {
  const page = Math.min(Math.max(1, Math.floor(opts.page ?? 1)), MAX_PAGE);
  const none: BrowsePage = { results: [], hasMore: false };
  if (feed === "genre" && !opts.genre) return none;

  if (kind === "anime") {
    if (feed === "country") return none;
    const key = JSON.stringify([feed, opts.genre, page]);
    const hit = anilistPages.get(key);
    if (hit && Date.now() - hit.at < TRENDING_TTL) return hit.page;
    const data = await anilist<{ Page: { pageInfo: { hasNextPage: boolean }; media: AniListMedia[] } }>(
      `query ($page: Int, $perPage: Int, $genre: String, $sort: [MediaSort]) { Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage } media(type: ANIME, isAdult: false, genre: $genre, sort: $sort) { ${ANILIST_FIELDS} } } }`,
      { page, perPage: PER_PAGE, genre: feed === "genre" ? opts.genre : null, sort: feed === "genre" ? ["POPULARITY_DESC"] : ["TRENDING_DESC"] },
    );
    const result: BrowsePage = {
      results: data.Page.media.map((m) => {
        const { source, sourceId, kind, name, year, posterUrl, overview } = fromAniList(m);
        return { source, sourceId, kind, name, year, posterUrl, overview };
      }),
      hasMore: data.Page.pageInfo.hasNextPage && page < MAX_PAGE,
    };
    if (anilistPages.size > 200) anilistPages.delete(anilistPages.keys().next().value!);
    anilistPages.set(key, { at: Date.now(), page: result });
    return result;
  }

  if (!tmdbEnabled()) return none;
  const type = kind === "movie" ? "movie" : "tv";
  const params: Record<string, string> = { page: String(page), include_adult: "false" };
  let path = `discover/${type}`;
  if (feed === "trending") path = `trending/${type}/week`;
  else if (feed === "genre") Object.assign(params, { with_genres: opts.genre!, sort_by: "popularity.desc", "vote_count.gte": "20" });
  else Object.assign(params, { watch_region: opts.country ?? "US", with_watch_monetization_types: "flatrate|free|ads", sort_by: "popularity.desc" });
  const data = await tmdb<TmdbPage>(path, params);
  return {
    results: data.results.filter((hit) => !(kind === "series" && isTmdbAnime(hit))).map((hit) => fromTmdbHit(hit, kind)),
    hasMore: page < Math.min(data.total_pages ?? 1, MAX_PAGE),
  };
}
