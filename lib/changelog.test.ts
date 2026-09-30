import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import pkg from "@/package.json";
import { compareVersions, parseChangelog } from "./changelog";

describe("changelog", () => {
  it("reads versions, titles and bullets, joining wrapped bullets", () => {
    const releases = parseChangelog(`# Changelog

## 0.2.0 — Stars and colors

- Rate what you've watched.
- A long bullet
  that wraps.

## 0.1.0 - First contact

- Lists.
`);
    expect(releases).toEqual([
      { version: "0.2.0", title: "Stars and colors", notes: ["Rate what you've watched.", "A long bullet that wraps."] },
      { version: "0.1.0", title: "First contact", notes: ["Lists."] },
    ]);
  });

  it("compares versions as numbers", () => {
    expect(compareVersions("0.10.0", "0.9.9")).toBeGreaterThan(0);
    expect(compareVersions("0.4.2", "0.4.2")).toBe(0);
    expect(compareVersions("0.4.1", "0.4.2")).toBeLessThan(0);
  });

  it("has an entry for the version in package.json, at the top", () => {
    const releases = parseChangelog(readFileSync("CHANGELOG.md", "utf8"));
    expect(releases[0]?.version).toBe(pkg.version);
    for (let i = 1; i < releases.length; i++) expect(compareVersions(releases[i - 1].version, releases[i].version)).toBeGreaterThan(0);
  });
});
