import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, filterPool, genresOf, pick, reel, weightOf, type Candidate } from "./pick";

const NOW = Date.UTC(2026, 8, 30);
const DAY = 24 * 60 * 60 * 1000;

const c = (titleId: string, over: Partial<Candidate> = {}): Candidate => ({
  itemId: `item-${titleId}`,
  titleId,
  kind: "movie",
  genres: [],
  runtime: 100,
  watched: false,
  addedAt: NOW,
  ...over,
});

// A fixed sequence of "random" numbers, repeating.
const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

const ids = (xs: Candidate[]) => xs.map((x) => x.titleId).join("");

describe("randomizer pool", () => {
  const list = [
    c("a", { kind: "movie", runtime: 90, genres: ["Comedy"] }),
    c("b", { kind: "movie", runtime: 140, genres: ["Drama"] }),
    c("c", { kind: "series", runtime: 45, genres: ["Drama"] }),
    c("d", { kind: "anime", runtime: 24, genres: ["Action", "Comedy"] }),
    c("e", { kind: "movie", runtime: null }),
    c("f", { kind: "movie", watched: true }),
  ];

  it("leaves out watched titles unless it's a rewatch night", () => {
    expect(ids(filterPool(list, DEFAULT_FILTERS))).toBe("abcde");
    expect(ids(filterPool(list, { ...DEFAULT_FILTERS, includeWatched: true }))).toBe("abcdef");
  });

  it("filters by kind and genre", () => {
    expect(ids(filterPool(list, { ...DEFAULT_FILTERS, kinds: ["series", "anime"] }))).toBe("cd");
    expect(ids(filterPool(list, { ...DEFAULT_FILTERS, genre: "Comedy" }))).toBe("ad");
  });

  it("fits the time: a movie's length, a show's episode; unknown lengths always fit", () => {
    expect(ids(filterPool(list, { ...DEFAULT_FILTERS, time: "evening" }))).toBe("acde");
    expect(ids(filterPool(list, { ...DEFAULT_FILTERS, time: "quick" }))).toBe("ade");
  });

  it("counts a title on several lists once", () => {
    expect(ids(filterPool([c("a"), c("a", { itemId: "other" }), c("b")], DEFAULT_FILTERS))).toBe("ab");
  });

  it("lists genres most common first", () => {
    expect(genresOf(list)).toEqual(["Comedy", "Drama", "Action"]);
  });
});

describe("randomizer pick", () => {
  it("gives long-waiting titles up to twice the chance and recent picks a quarter", () => {
    const recent = new Set(["old"]);
    expect(weightOf(c("new"), recent, NOW)).toBe(1);
    expect(weightOf(c("mid", { addedAt: NOW - 30 * DAY }), recent, NOW)).toBe(1.5);
    expect(weightOf(c("x", { addedAt: NOW - 400 * DAY }), recent, NOW)).toBe(2);
    expect(weightOf(c("old", { addedAt: NOW - 400 * DAY }), recent, NOW)).toBe(0.5);
  });

  it("picks by weight", () => {
    const pool = [c("a"), c("b"), c("c")];
    expect(pick(pool, { rng: () => 0, now: NOW })?.titleId).toBe("a");
    expect(pick(pool, { rng: () => 0.5, now: NOW })?.titleId).toBe("b");
    expect(pick(pool, { rng: () => 0.999, now: NOW })?.titleId).toBe("c");
    // "a" was picked lately: it holds 0.25 of 2.25, so 0.2 of the range lands on "b"
    expect(pick(pool, { rng: () => 0.2, now: NOW, recent: ["a"] })?.titleId).toBe("b");
  });

  it("skips titles turned down this session, and says when nothing is left", () => {
    const pool = [c("a"), c("b")];
    expect(pick(pool, { rng: () => 0, now: NOW, exclude: ["a"] })?.titleId).toBe("b");
    expect(pick(pool, { exclude: ["a", "b"] })).toBeNull();
    expect(pick([])).toBeNull();
  });
});

describe("randomizer reel", () => {
  const pool = [c("a"), c("b"), c("c")];

  it("ends on the pick and never shows the same poster twice in a row", () => {
    const run = reel(pool, pool[2], 12, seq(0, 0, 0.5, 0.9, 0.9, 0.1));
    expect(run).toHaveLength(12);
    expect(run.at(-1)?.titleId).toBe("c");
    for (let i = 1; i < run.length; i++) expect(run[i].titleId).not.toBe(run[i - 1].titleId);
  });

  it("is just the pick when there's nothing else", () => {
    expect(ids(reel([pool[0]], pool[0], 12))).toBe("a");
  });
});
