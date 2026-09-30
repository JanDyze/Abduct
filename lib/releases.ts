import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseChangelog, type Release } from "./changelog";

let releases: Promise<Release[]> | null = null;

// Every release in CHANGELOG.md, newest first. Read once per server (next.config.ts ships the file
// with the app).
export function getReleases() {
  releases ??= readFile(path.join(process.cwd(), "CHANGELOG.md"), "utf8")
    .then(parseChangelog)
    .catch(() => {
      releases = null;
      return [];
    });
  return releases;
}
