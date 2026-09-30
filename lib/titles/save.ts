import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { titles } from "@/lib/db/schema";
import { fetchDetails } from "./catalog";
import type { Kind } from "./kinds";

// Catalog details change now and then (a new season, a better poster), so a saved title is
// refreshed when someone adds it again after this long.
const STALE_AFTER = 30 * 24 * 60 * 60 * 1000;

// The titles row for a catalog title, saving or refreshing its details first when needed. Details
// always come from the catalog itself, never from what the browser sent. Null when the catalog
// doesn't know the id.
export async function saveCatalogTitle(source: "tmdb" | "anilist", sourceId: string): Promise<string | null> {
  const [existing] = await db
    .select({ id: titles.id, updatedAt: titles.updatedAt })
    .from(titles)
    .where(and(eq(titles.source, source), eq(titles.sourceId, sourceId)));
  if (existing && Date.now() - existing.updatedAt.getTime() < STALE_AFTER) return existing.id;

  let details;
  try {
    details = await fetchDetails(source, sourceId);
  } catch (e) {
    console.error("Catalog details failed:", e);
    // Can't refresh right now: the saved copy is still fine to use.
    if (existing) return existing.id;
    throw e;
  }
  if (!details) return existing?.id ?? null;

  const fields = {
    kind: details.kind,
    name: details.name,
    year: details.year,
    posterUrl: details.posterUrl,
    backdropUrl: details.backdropUrl,
    overview: details.overview,
    genres: details.genres,
    runtime: details.runtime,
    episodes: details.episodes,
    score: details.score,
  };
  const [row] = await db
    .insert(titles)
    .values({ source, sourceId, ...fields })
    .onConflictDoUpdate({ target: [titles.source, titles.sourceId], set: { ...fields, updatedAt: sql`now()` } })
    .returning({ id: titles.id });
  return row.id;
}

// A title typed in by hand, for anything the catalogs don't have (or when TMDB isn't set up).
export async function saveManualTitle(userId: string, input: { name: string; kind: Kind; year: number | null }) {
  const id = crypto.randomUUID();
  const [row] = await db
    .insert(titles)
    .values({ id, source: "manual", sourceId: id, kind: input.kind, name: input.name, year: input.year, createdBy: userId })
    .returning({ id: titles.id });
  return row.id;
}
