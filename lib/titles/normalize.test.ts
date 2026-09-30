import { describe, expect, it } from "vitest";
import { cleanDescription, fromAniList, fromTmdbDetail, fromTmdbHit, isTmdbAnime } from "./normalize";

describe("TMDB titles", () => {
  it("reads a movie hit with its year and poster", () => {
    expect(fromTmdbHit({ id: 603, title: "The Matrix", release_date: "1999-03-30", poster_path: "/m.jpg", overview: " Neo. " }, "movie")).toEqual({
      source: "tmdb",
      sourceId: "movie:603",
      kind: "movie",
      name: "The Matrix",
      year: 1999,
      posterUrl: "https://image.tmdb.org/t/p/w342/m.jpg",
      overview: "Neo.",
    });
  });

  it("keeps movie and tv ids apart, and copes with missing dates and posters", () => {
    const hit = fromTmdbHit({ id: 1399, name: "Game of Thrones", first_air_date: "", poster_path: null }, "series");
    expect(hit.sourceId).toBe("tv:1399");
    expect(hit.year).toBeNull();
    expect(hit.posterUrl).toBeNull();
  });

  it("spots Japanese animated series as anime", () => {
    expect(isTmdbAnime({ id: 1, genre_ids: [16, 10759], origin_country: ["JP"] })).toBe(true);
    expect(isTmdbAnime({ id: 2, genre_ids: [16], origin_country: ["US"] })).toBe(false);
  });

  it("takes a series' episode length from wherever TMDB has it", () => {
    const base = { id: 1, name: "Show", genres: [{ name: "Drama" }], number_of_episodes: 10, vote_average: 8.26, vote_count: 500 };
    expect(fromTmdbDetail({ ...base, episode_run_time: [50] }, "series")).toMatchObject({ runtime: 50, episodes: 10, genres: ["Drama"], score: 83 });
    expect(fromTmdbDetail({ ...base, episode_run_time: [], last_episode_to_air: { runtime: 42 } }, "series").runtime).toBe(42);
    expect(fromTmdbDetail({ ...base, vote_count: 3 }, "series").score).toBeNull();
  });

  it("gives a movie its length and no episode count", () => {
    expect(fromTmdbDetail({ id: 1, title: "Film", runtime: 136, number_of_episodes: 5 }, "movie")).toMatchObject({ runtime: 136, episodes: null });
    expect(fromTmdbDetail({ id: 1, title: "Film", runtime: 0 }, "movie").runtime).toBeNull();
  });
});

describe("AniList titles", () => {
  it("prefers the English title and cleans the description", () => {
    const t = fromAniList({
      id: 16498,
      title: { english: "Attack on Titan", romaji: "Shingeki no Kyojin" },
      startDate: { year: 2013 },
      coverImage: { extraLarge: "https://s4.anilist.co/xl.jpg", large: "https://s4.anilist.co/l.jpg" },
      description: "Humans fight <i>titans</i>.<br><br>(Source: Crunchyroll)",
      genres: ["Action", "Drama"],
      duration: 24,
      episodes: 25,
      averageScore: 85,
    });
    expect(t).toMatchObject({ sourceId: "16498", kind: "anime", name: "Attack on Titan", year: 2013, runtime: 24, episodes: 25, score: 85 });
    expect(t.posterUrl).toBe("https://s4.anilist.co/xl.jpg");
    expect(t.overview).toBe("Humans fight titans.");
  });

  it("falls back to the romaji title", () => {
    expect(fromAniList({ id: 1, title: { english: null, romaji: "Mushishi" } }).name).toBe("Mushishi");
  });

  it("decodes entities and drops empty descriptions", () => {
    expect(cleanDescription("Tom &amp; Jerry&#039;s &quot;day&quot;")).toBe(`Tom & Jerry's "day"`);
    expect(cleanDescription("<br>")).toBeNull();
    expect(cleanDescription(null)).toBeNull();
  });
});
