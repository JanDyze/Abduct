import { describe, expect, it } from "vitest";
import { candidatesFrom, firstUrl, matchScore, splitTerms, yearFrom } from "./extract";

describe("candidatesFrom", () => {
  it("takes a title in quotes first", () => {
    expect(candidatesFrom('"The Shawshank Redemption" still wrecks me every time #movie #fyp')[0]).toBe("The Shawshank Redemption");
    expect(candidatesFrom("“Past Lives” is the one 💔")[0]).toBe("Past Lives");
  });

  it("reads a labelled title", () => {
    expect(candidatesFrom("Movie: Project Hail Mary 🍿 #scifi")[0]).toBe("Project Hail Mary");
    expect(candidatesFrom("🎬 Title - Your Name\nthis scene 😭")[0]).toBe("Your Name");
  });

  it("reads a title followed by its year", () => {
    expect(candidatesFrom("Oldboy (2003) ending still hits different")[0]).toBe("Oldboy");
  });

  it("turns hashtags into titles and skips the generic ones", () => {
    const c = candidatesFrom("wait for it... #TheDarkKnight #batman #fyp #movie #viral #foryoupage");
    expect(c.slice(0, 2)).toEqual(["The Dark Knight", "batman"]);
    expect(c).not.toContain("fyp");
    expect(candidatesFrom("best ending ever #interstellar #movies")[0]).toBe("interstellar");
  });

  it("falls back to the first line, without links or tags", () => {
    expect(candidatesFrom("The Holdovers\nhttps://vm.tiktok.com/ZMabc123/ #fyp")[0]).toBe("The Holdovers");
  });

  it("takes the name out of a trailer's title", () => {
    expect(candidatesFrom("Interstellar - Trailer - Official Warner Bros. UK")[0]).toBe("Interstellar");
    expect(candidatesFrom("DUNE: PART TWO | Official Trailer 3")[0]).toBe("DUNE: PART TWO");
  });

  it("hears a title named in a transcript", () => {
    expect(candidatesFrom("Okay so this movie is called Coherence and it will mess with your head.")[0]).toBe("Coherence");
    expect(candidatesFrom("If you liked that, you have to watch The Prestige by Christopher Nolan.")[0]).toBe("The Prestige");
    expect(candidatesFrom("A film titled Oldboy changed Korean cinema forever.")[0]).toBe("Oldboy");
  });

  it("doesn't take someone talking for a title", () => {
    expect(candidatesFrom("So I was watching this the other day and honestly the ending broke me", 5, { firstLine: false })).toEqual([]);
    expect(candidatesFrom("you have to watch Frieren after this", 5, { firstLine: false })[0]).toBe("Frieren");
  });

  it("finds nothing in a bare link", () => {
    expect(candidatesFrom("https://www.tiktok.com/@someone/video/7412345678901234567")).toEqual([]);
  });
});

describe("yearFrom", () => {
  it("finds a release year, not other numbers", () => {
    expect(yearFrom("Oldboy (2003) part 2")).toBe(2003);
    expect(yearFrom("rated 10/10, 5 stars")).toBeNull();
    expect(yearFrom("https://x.com/a/status/2019")).toBeNull();
  });
});

describe("firstUrl", () => {
  it("pulls the link out of shared text", () => {
    expect(firstUrl("Check this out! https://vm.tiktok.com/ZMabc123/.")).toBe("https://vm.tiktok.com/ZMabc123/");
    expect(firstUrl("no link here")).toBeNull();
  });
});

describe("matchScore", () => {
  it("prefers the exact title", () => {
    expect(matchScore("Interstellar", "interstellar")).toBe(100);
    expect(matchScore("The Dark Knight Rises", "The Dark Knight")).toBeGreaterThan(matchScore("Batman Begins", "The Dark Knight"));
    expect(matchScore("Up", "Project Hail Mary")).toBe(0);
  });
});

describe("splitTerms", () => {
  it("splits on commas, not spaces", () => {
    expect(splitTerms("avengers, hulk, interstellar")).toEqual(["avengers", "hulk", "interstellar"]);
    expect(splitTerms("the dark knight")).toEqual(["the dark knight"]);
    expect(splitTerms("Up; Coco\nUp ,  ")).toEqual(["Up", "Coco"]);
  });
});
