import { describe, expect, it } from "vitest";
import { foldPath } from "./fold-path";

describe("foldPath", () => {
  it("folds ids so it says which screen, not which list or title", () => {
    expect(foldPath("/lists/3f2b8c1e-9a4d-4b7e-8c21-5d6e7f8a9b0c")).toBe("/lists/:id");
    expect(foldPath("/lists/3F2B8C1E-9A4D-4B7E-8C21-5D6E7F8A9B0C/edit")).toBe("/lists/:id/edit");
    expect(foldPath("/discover/lists/3f2b8c1e-9a4d-4b7e-8c21-5d6e7f8a9b0c")).toBe("/discover/lists/:id");
  });

  it("drops the query and hash, and keeps paths short", () => {
    expect(foldPath("/discover/search?q=christian")).toBe("/discover/search");
    expect(foldPath("/spin#top")).toBe("/spin");
    expect(foldPath("?x")).toBe("/");
    expect(foldPath(`/${"a".repeat(300)}`)).toHaveLength(200);
  });

  it("leaves paths without ids alone", () => {
    expect(foldPath("/discover/browse")).toBe("/discover/browse");
    expect(foldPath("/lists/new")).toBe("/lists/new");
  });
});
