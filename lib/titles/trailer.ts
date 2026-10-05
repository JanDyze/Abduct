import "server-only";
import { anilist, tmdb, tmdbEnabled } from "./catalog";

// A title's official trailer on YouTube (its video id), for playing it in the app: TMDB's videos
// for movies and series (an official trailer first, then any trailer, then a teaser), AniList's
// trailer for anime. Null when there isn't one, or the catalog can't say.

type TmdbVideo = { key: string; site: string; type: string; official?: boolean; published_at?: string };

const RANK = (v: TmdbVideo) => (v.type === "Trailer" ? 0 : v.type === "Teaser" ? 2 : 4) + (v.official ? 0 : 1);

export async function trailerOf(source: string, sourceId: string): Promise<string | null> {
  try {
    if (source === "tmdb") {
      const match = /^(movie|tv):(\d+)$/.exec(sourceId);
      if (!match || !tmdbEnabled()) return null;
      const data = await tmdb<{ results?: TmdbVideo[] }>(`${match[1]}/${match[2]}/videos`);
      const videos = (data.results ?? []).filter((v) => v.site === "YouTube" && /^[\w-]{6,20}$/.test(v.key) && ["Trailer", "Teaser"].includes(v.type));
      videos.sort((a, b) => RANK(a) - RANK(b) || (b.published_at ?? "").localeCompare(a.published_at ?? ""));
      return videos[0]?.key ?? null;
    }
    if (source === "anilist") {
      const id = Number(sourceId);
      if (!Number.isInteger(id) || id <= 0) return null;
      const data = await anilist<{ Media: { trailer?: { id?: string | null; site?: string | null } | null } | null }>(
        `query ($id: Int) { Media(id: $id, type: ANIME) { trailer { id site } } }`,
        { id },
      );
      const t = data.Media?.trailer;
      return t?.site === "youtube" && t.id && /^[\w-]{6,20}$/.test(t.id) ? t.id : null;
    }
  } catch (e) {
    console.error("Finding a trailer failed:", e);
  }
  return null;
}
