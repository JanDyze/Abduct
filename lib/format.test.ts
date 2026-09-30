import { describe, expect, it } from "vitest";
import { countTitles, formatRuntime, titleMeta } from "./format";

describe("format", () => {
  it("writes runtimes in hours and minutes", () => {
    expect(formatRuntime(112)).toBe("1h 52m");
    expect(formatRuntime(45)).toBe("45m");
    expect(formatRuntime(120)).toBe("2h");
    expect(formatRuntime(0)).toBeNull();
    expect(formatRuntime(null)).toBeNull();
  });

  it("describes a title in one line", () => {
    expect(titleMeta({ kind: "movie", year: 1999, runtime: 136, episodes: null })).toBe("Movie · 1999 · 2h 16m");
    expect(titleMeta({ kind: "anime", year: 2013, runtime: 24, episodes: 25 })).toBe("Anime · 2013 · 25 eps · 24m each");
    expect(titleMeta({ kind: "series", year: null, runtime: null, episodes: 1 })).toBe("Series · 1 ep");
  });

  it("counts titles", () => {
    expect(countTitles(1)).toBe("1 title");
    expect(countTitles(3)).toBe("3 titles");
  });
});
