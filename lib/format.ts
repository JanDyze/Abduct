import { KIND_LABEL, type Kind } from "@/lib/titles/kinds";

// 112 → "1h 52m", 45 → "45m".
export function formatRuntime(minutes: number | null | undefined) {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// The line under a title: "Movie · 1999 · 2h 16m", "Anime · 2013 · 25 eps · 24m each".
export function titleMeta(t: { kind: Kind; year: number | null; runtime: number | null; episodes: number | null }) {
  const runtime = formatRuntime(t.runtime);
  const parts: string[] = [KIND_LABEL[t.kind]];
  if (t.year) parts.push(String(t.year));
  if (t.kind !== "movie" && t.episodes) parts.push(`${t.episodes} ${t.episodes === 1 ? "ep" : "eps"}`);
  if (runtime) parts.push(t.kind === "movie" ? runtime : `${runtime} each`);
  return parts.join(" · ");
}

// "3 titles", "1 title".
export function countTitles(n: number) {
  return `${n} ${n === 1 ? "title" : "titles"}`;
}
