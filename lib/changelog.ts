import pkg from "@/package.json";

// The app's version (package.json), bumped with each release, and its notes from CHANGELOG.md:
// "## 0.4.0 — Title" headings, each followed by "- " bullets. As in Kept.

export const APP_VERSION: string = pkg.version;

export type Release = { version: string; title: string; notes: string[] };

export function parseChangelog(markdown: string): Release[] {
  const out: Release[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^##\s+(\d+\.\d+\.\d+)\s*(?:[—–-]\s*(.*))?$/.exec(line);
    if (heading) out.push({ version: heading[1], title: heading[2]?.trim() ?? "", notes: [] });
    else if (out.length && line.startsWith("- ")) out[out.length - 1].notes.push(line.slice(2).trim());
    else if (out.length && /^\s{2,}\S/.test(line) && out[out.length - 1].notes.length) {
      // a bullet wrapped onto the next line
      const notes = out[out.length - 1].notes;
      notes[notes.length - 1] += ` ${line.trim()}`;
    }
  }
  return out;
}

// Compares "0.13.0" and "0.14.0" as versions, not strings.
export function compareVersions(a: string, b: string) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}
