import type { Metadata } from "next";
import Link from "next/link";
import { CatalogGrid } from "@/components/catalog-grid";
import { DiscoverSearchBox } from "@/components/discover-search-box";
import { GenreChips } from "@/components/genre-chips";
import { Screen } from "@/components/screen";
import { requireUser } from "@/lib/auth";
import { getLists } from "@/lib/lists/queries";
import { searchCatalog, searchTopics, type SearchOutcome, type Topic } from "@/lib/titles/catalog";
import { splitTerms } from "@/lib/share/extract";
import { browseHref, GENRES, TOPIC_CHIPS } from "@/lib/titles/genres";
import { KIND_PLURAL, KINDS } from "@/lib/titles/kinds";

export const metadata: Metadata = { title: "Search Discover" };

type Match = { key: string; name: string; detail: string; href: string };

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en")} ${n === 1 ? one : many}`;

// Genres and topic chips whose name has the search in it (in every kind that has them).
function localMatches(q: string): Match[] {
  const needle = q.toLowerCase();
  const out: Match[] = [];
  for (const t of TOPIC_CHIPS) {
    if (!t.name.toLowerCase().includes(needle)) continue;
    for (const kind of KINDS) {
      const id = t.byKind[kind];
      if (id) out.push({ key: `chip:${t.name}:${kind}`, name: t.name, detail: KIND_PLURAL[kind], href: browseHref(kind, "topic", id) });
    }
  }
  for (const kind of KINDS)
    for (const g of GENRES[kind])
      if (g.name.toLowerCase().includes(needle)) out.push({ key: `genre:${kind}:${g.id}`, name: g.name, detail: KIND_PLURAL[kind], href: browseHref(kind, "genre", g.id) });
  return out;
}

// A TMDB keyword as a topic to browse: opens on movies, or on series when it tags more of those.
function topicMatch(t: Topic): Match {
  const counts = [t.movies && plural(t.movies, "movie", "movies"), t.series && plural(t.series, "series", "series")].filter(Boolean).join(" · ");
  return {
    key: `topic:${t.id}`,
    name: t.name.charAt(0).toUpperCase() + t.name.slice(1),
    detail: counts,
    href: browseHref(t.series > t.movies ? "series" : "movie", "topic", t.id),
  };
}

// Search Discover: movies, series and anime by name, and the genres and topics (TMDB keywords like
// "christian film" or "time travel") that match, each opening its See all page. Several titles at
// once, separated by commas ("avengers, hulk, interstellar"), are each searched, side by side.
export default async function DiscoverSearchPage({ searchParams }: PageProps<"/discover/search">) {
  const user = await requireUser();
  const { q: raw } = await searchParams;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 300);
  const terms = splitTerms(q);
  const several = terms.length > 1;
  const searching = terms.length > 0;

  const [lists, outcome, topics, each] = await Promise.all([
    getLists(user.id),
    searching && !several ? searchCatalog(terms[0], "all") : Promise.resolve<SearchOutcome | null>(null),
    searching && !several ? searchTopics(terms[0]).catch((e) => (console.error("Topic search failed:", e), [] as Topic[])) : Promise.resolve([] as Topic[]),
    several ? Promise.all(terms.map((t) => searchCatalog(t, "all").catch(() => null))) : Promise.resolve([]),
  ]);
  const defaultList = lists.find((l) => l.isDefault) ?? lists[0];
  const matches = searching && !several ? [...localMatches(terms[0]), ...topics.map(topicMatch)] : [];
  const results = outcome?.results ?? [];

  return (
    <Screen back={{ href: "/discover", label: "Discover" }} title="Search">
      <DiscoverSearchBox initial={q}>

      {!searching ? (
        <section aria-labelledby="genres-heading" className="mt-2">
          <p className="mb-4 text-sm text-muted-foreground">
            Find a movie, series or anime, or a topic like Christian, time travel or zombies. Looking for several? Separate them with commas:
            avengers, hulk, interstellar.
          </p>
          <h2 id="genres-heading" className="mb-3 font-brand text-xl font-bold">
            Browse by genre
          </h2>
          <GenreChips />
        </section>
      ) : several ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">Tap + to put one on {defaultList.name}, or open it to choose a list.</p>
          {terms.map((term, i) => {
            const found = each[i]?.results.slice(0, 6) ?? [];
            return (
              <section key={term} aria-label={term} className="mt-6">
                <h2 className="mb-3 font-brand text-lg font-bold">“{term}”</h2>
                {found.length ? (
                  <CatalogGrid key={`${q}:${term}`} results={found} listName={defaultList.name} />
                ) : (
                  <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">No titles match “{term}”.</p>
                )}
              </section>
            );
          })}
        </>
      ) : (
        <>
          {matches.length > 0 && (
            <section aria-labelledby="topics-heading" className="mt-2">
              <h2 id="topics-heading" className="mb-2.5 font-brand text-lg font-bold">
                Genres &amp; topics
              </h2>
              <ul className="flex flex-col gap-2">
                {matches.map((m) => (
                  <li key={m.key}>
                    <Link
                      href={m.href}
                      transitionTypes={["nav-forward"]}
                      className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-2.5 transition-[transform,background-color] hover:bg-muted active:scale-[0.99]"
                    >
                      <span className="truncate font-medium">{m.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{m.detail}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="titles-heading" className="mt-6">
            <h2 id="titles-heading" className="mb-1 font-brand text-lg font-bold">
              Titles
            </h2>
            {outcome && outcome.unavailable.length > 0 && (
              <p className="mb-2 text-sm text-muted-foreground">
                {outcome.unavailable.includes("tmdb") ? "Movies and series" : "Anime"} couldn&apos;t be searched just now.
              </p>
            )}
            {results.length === 0 ? (
              <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No titles match “{q}”.</p>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted-foreground">Tap + to put one on {defaultList.name}, or open it to choose a list.</p>
                <CatalogGrid key={q} results={results} listName={defaultList.name} />
              </>
            )}
          </section>
        </>
      )}
      </DiscoverSearchBox>
    </Screen>
  );
}
