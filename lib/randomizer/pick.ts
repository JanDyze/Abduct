import type { Kind } from "@/lib/titles/kinds";

// One thing the randomizer could land on: a title on one of your lists.
export type Candidate = {
  itemId: string;
  titleId: string;
  kind: Kind;
  genres: string[];
  runtime: number | null; // minutes: the movie, or one episode
  watched: boolean;
  addedAt: number; // ms since epoch
};

// "How much time do you have?" A series or anime fits as long as one episode does.
export const TIME_OPTIONS = {
  any: { label: "Any length", movie: Infinity, episode: Infinity },
  evening: { label: "Under 2 hours", movie: 120, episode: Infinity },
  quick: { label: "Something quick", movie: 95, episode: 30 },
} as const;
export type TimeOption = keyof typeof TIME_OPTIONS;

// Where it can be played: anywhere, right now without paying extra (free, or on a service you
// have), or free only. Needs to ask where to watch, so the randomizer applies it, not filterPool.
export type WatchOption = "any" | "now" | "free";

export type Filters = {
  kinds: Kind[]; // empty: every kind
  genre: string | null;
  time: TimeOption;
  includeWatched: boolean; // a rewatch night
  watch: WatchOption;
};

export const DEFAULT_FILTERS: Filters = { kinds: [], genre: null, time: "any", includeWatched: false, watch: "any" };

// The pool the filters leave. A title on several lists counts once, so it isn't more likely just
// because it was added twice. A title without a known length (typed in by hand) fits any time.
export function filterPool<C extends Candidate>(candidates: C[], filters: Filters): C[] {
  const limit = TIME_OPTIONS[filters.time];
  const seen = new Set<string>();
  const pool: C[] = [];
  for (const c of candidates) {
    if (seen.has(c.titleId)) continue;
    if (!filters.includeWatched && c.watched) continue;
    if (filters.kinds.length > 0 && !filters.kinds.includes(c.kind)) continue;
    if (filters.genre && !c.genres.includes(filters.genre)) continue;
    if (c.runtime != null && c.runtime > (c.kind === "movie" ? limit.movie : limit.episode)) continue;
    seen.add(c.titleId);
    pool.push(c);
  }
  return pool;
}

// Genres present in a set of candidates, most common first, for the genre filter.
export function genresOf(candidates: Candidate[]): string[] {
  const counts = new Map<string, number>();
  for (const c of candidates) for (const g of c.genres) counts.set(g, (counts.get(g) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([g]) => g);
}

const DAY = 24 * 60 * 60 * 1000;

// How likely each candidate is. Everything starts even; a title that has waited on a list for
// months gets up to twice the chance (it's been put off long enough), and one the randomizer
// offered recently gets a quarter, so spinning again doesn't keep landing on the same few.
export function weightOf(c: Candidate, recent: ReadonlySet<string>, now: number) {
  const waited = Math.min(1, Math.max(0, (now - c.addedAt) / (60 * DAY)));
  return (1 + waited) * (recent.has(c.titleId) ? 0.25 : 1);
}

export type PickOptions = {
  recent?: Iterable<string>; // titleIds picked lately
  exclude?: Iterable<string>; // titleIds turned down this session ("Nope, again")
  now?: number;
  rng?: () => number; // [0, 1)
};

// Picks one candidate at random by weight, or null when there's nothing left to offer.
export function pick<C extends Candidate>(pool: C[], options: PickOptions = {}): C | null {
  const recent = new Set(options.recent ?? []);
  const exclude = new Set(options.exclude ?? []);
  const now = options.now ?? Date.now();
  const rng = options.rng ?? Math.random;
  const open = pool.filter((c) => !exclude.has(c.titleId));
  if (open.length === 0) return null;
  const weights = open.map((c) => weightOf(c, recent, now));
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < open.length; i++) {
    r -= weights[i];
    if (r < 0) return open[i];
  }
  return open[open.length - 1];
}

// The run of posters that flicks past in the beam before it settles on `chosen`: `length` steps,
// never the same one twice in a row, ending on the pick.
export function reel<C extends Candidate>(pool: C[], chosen: C, length: number, rng: () => number = Math.random): C[] {
  if (pool.length <= 1) return [chosen];
  const steps: C[] = [];
  let last: C | null = null;
  for (let i = 0; i < length - 1; i++) {
    let next = pool[Math.floor(rng() * pool.length)];
    if (next === last) next = pool[(pool.indexOf(next) + 1) % pool.length];
    steps.push(next);
    last = next;
  }
  if (last === chosen && pool.length > 1) steps[steps.length - 1] = pool[(pool.indexOf(chosen) + 1) % pool.length];
  steps.push(chosen);
  return steps;
}
