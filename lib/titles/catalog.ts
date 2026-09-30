import "server-only";
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

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
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

async function anilist<T>(query: string, variables: Record<string, unknown>): Promise<T> {
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

type TmdbPage = { results: Parameters<typeof fromTmdbHit>[0][] };

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
