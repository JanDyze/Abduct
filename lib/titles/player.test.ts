import { afterEach, describe, expect, it, vi } from "vitest";
import { playableMovieId, playerEnabled, playerUrl } from "./player";

afterEach(() => vi.unstubAllEnvs());

describe("playableMovieId", () => {
  it("plays TMDB movies by their id", () => {
    expect(playableMovieId("tmdb", "movie:27205")).toBe("27205");
  });

  it("has nothing for series, AniList or hand-typed titles", () => {
    expect(playableMovieId("tmdb", "tv:1399")).toBeNull();
    expect(playableMovieId("anilist", "21")).toBeNull();
    expect(playableMovieId("manual", "movie:27205")).toBeNull();
    expect(playableMovieId("tmdb", "movie:abc")).toBeNull();
  });
});

describe("playerUrl", () => {
  it("fills the id into MOVIE_PLAYER_URL", () => {
    vi.stubEnv("MOVIE_PLAYER_URL", "https://player.example/e/movie/{id}");
    expect(playerEnabled()).toBe(true);
    expect(playerUrl("27205")).toBe("https://player.example/e/movie/27205");
    expect(playerUrl("27205/../x")).toBeNull();
  });

  it("is off without MOVIE_PLAYER_URL", () => {
    vi.stubEnv("MOVIE_PLAYER_URL", "");
    expect(playerEnabled()).toBe(false);
    expect(playerUrl("27205")).toBeNull();
  });
});
