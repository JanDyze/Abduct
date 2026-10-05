import "server-only";
import { anilist, tmdb, tmdbEnabled } from "./catalog";
import { serviceKey } from "./services";

export type Provider = { name: string; key: string; logo: string | null; url: string };
export type WatchGroup = { label: string; providers: Provider[] };

// Where a title can be watched. Movies and series: TMDB's list for the viewer's country, which
// comes from JustWatch (and has to say so), grouped by how you pay; each opens TMDB's page for the
// title, which links on to the services. Anime: the streaming links AniList keeps, which aren't by
// country. Null when the catalog can't say (a title added by hand, or the catalog is down).
// Each provider's key matches the services you have (lib/titles/services.ts).
export type WatchOptions = { from: "justwatch" | "anilist"; groups: WatchGroup[] };

type TmdbOffer = { provider_name: string; logo_path?: string | null; display_priority?: number };
type TmdbCountry = { link?: string; flatrate?: TmdbOffer[]; free?: TmdbOffer[]; ads?: TmdbOffer[]; rent?: TmdbOffer[]; buy?: TmdbOffer[] };

const logo = (path: string | null | undefined) => (path ? `https://image.tmdb.org/t/p/w92${path}` : null);

// AniList is asked with POST, which Next doesn't cache, so its links are kept here for a day.
const anilistLinks = new Map<string, { at: number; options: WatchOptions }>();
const DAY = 24 * 60 * 60 * 1000;

export async function whereToWatch(source: string, sourceId: string, country: string): Promise<WatchOptions | null> {
  try {
    if (source === "tmdb") {
      const match = /^(movie|tv):(\d+)$/.exec(sourceId);
      if (!match || !tmdbEnabled()) return null;
      const data = await tmdb<{ results?: Record<string, TmdbCountry> }>(`${match[1]}/${match[2]}/watch/providers`);
      const here = data.results?.[country];
      if (!here?.link) return { from: "justwatch", groups: [] };
      const url = here.link;
      const group = (label: string, ...offers: (TmdbOffer[] | undefined)[]): WatchGroup => {
        const seen = new Set<string>();
        const providers = offers
          .flatMap((o) => o ?? [])
          .sort((a, b) => (a.display_priority ?? 99) - (b.display_priority ?? 99))
          .filter((o) => !seen.has(o.provider_name) && seen.add(o.provider_name))
          .map((o) => ({ name: o.provider_name, key: serviceKey(o.provider_name), logo: logo(o.logo_path), url }));
        return { label, providers };
      };
      const groups = [group("Stream", here.flatrate), group("Free", here.free, here.ads), group("Rent", here.rent), group("Buy", here.buy)];
      return { from: "justwatch", groups: groups.filter((g) => g.providers.length > 0) };
    }

    if (source === "anilist") {
      const id = Number(sourceId);
      if (!Number.isInteger(id) || id <= 0) return null;
      const cached = anilistLinks.get(sourceId);
      if (cached && Date.now() - cached.at < DAY) return cached.options;
      const data = await anilist<{ Media: { externalLinks?: { site: string; url?: string | null; type?: string | null; icon?: string | null }[] } | null }>(
        `query ($id: Int) { Media(id: $id, type: ANIME) { externalLinks { site url type icon } } }`,
        { id },
      );
      const seen = new Set<string>();
      const providers = (data.Media?.externalLinks ?? [])
        .filter((l) => l.type === "STREAMING" && l.url && !seen.has(l.site) && seen.add(l.site))
        .map((l) => ({ name: l.site, key: serviceKey(l.site), logo: l.icon ?? null, url: l.url! }));
      const options: WatchOptions = { from: "anilist", groups: providers.length ? [{ label: "Stream", providers }] : [] };
      if (anilistLinks.size > 500) anilistLinks.delete(anilistLinks.keys().next().value!);
      anilistLinks.set(sourceId, { at: Date.now(), options });
      return options;
    }
  } catch (e) {
    console.error("Where to watch failed:", e);
  }
  return null;
}

// The streaming services in a country, most popular there first, for picking yours in Settings:
// subscription and free ones from TMDB's lists for movies and series (via JustWatch), one per
// service however many plans it has. Empty when TMDB isn't set up or doesn't answer.
export type Service = { key: string; name: string; logo: string | null };

type TmdbProvider = { provider_name: string; logo_path?: string | null; display_priorities?: Record<string, number> };

export async function servicesIn(country: string, limit = 30): Promise<Service[]> {
  if (!tmdbEnabled()) return [];
  try {
    const [movies, tv] = await Promise.all(
      (["movie", "tv"] as const).map((kind) => tmdb<{ results?: TmdbProvider[] }>(`watch/providers/${kind}`, { watch_region: country })),
    );
    const rank = (p: TmdbProvider) => p.display_priorities?.[country] ?? 999;
    const byKey = new Map<string, Service & { rank: number }>();
    for (const p of [...(movies.results ?? []), ...(tv.results ?? [])].sort((a, b) => rank(a) - rank(b))) {
      const key = serviceKey(p.provider_name);
      if (!byKey.has(key)) byKey.set(key, { key, name: p.provider_name.replace(/\s+(Standard|Basic)?\s*with Ads$/i, ""), logo: logo(p.logo_path), rank: rank(p) });
    }
    return [...byKey.values()].slice(0, limit).map(({ key, name, logo }) => ({ key, name, logo }));
  } catch (e) {
    console.error("Listing services failed:", e);
    return [];
  }
}
