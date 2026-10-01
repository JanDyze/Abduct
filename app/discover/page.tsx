import type { Metadata } from "next";
import Link from "next/link";
import { Globe, Search, Star } from "lucide-react";
import { SavedTitles } from "@/components/catalog-poster";
import { Poster } from "@/components/poster";
import { PublicListCard } from "@/components/public-list-card";
import { Screen } from "@/components/screen";
import { GenreChips } from "@/components/genre-chips";
import { Trending } from "@/components/trending";
import { requireUser } from "@/lib/auth";
import { viewerCountry } from "@/lib/country";
import { getLists, savedTitles } from "@/lib/lists/queries";
import { mostLiked, newestLists, popularLists } from "@/lib/social/discover";
import { browse, trending } from "@/lib/titles/catalog";
import { browseHref } from "@/lib/titles/genres";
import type { Kind } from "@/lib/titles/kinds";

export const metadata: Metadata = { title: "Discover" };

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="animate-rise mt-8 first:mt-0">
      <h2 id={id} className="font-brand text-xl font-bold">
        {title}
      </h2>
      {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

// The first row of "Popular in <your country>": movies or series most popular to stream there.
async function popularHere(kind: Kind, country: string) {
  try {
    return (await browse(kind, "country", { country })).results.slice(0, 18);
  } catch (e) {
    console.error("Popular in country failed:", e);
    return [];
  }
}

const seeAll = (feed: "trending" | "country") => ({
  movie: browseHref("movie", feed),
  series: browseHref("series", feed),
  anime: browseHref("anime", feed),
});

// What's out there: a search, new and trending titles from the catalogs, what's popular where you
// are, genres to browse, what people on Abduct rate highest, and the lists people share. Each catalog
// row ends in See all, which opens the whole feed.
export default async function DiscoverPage() {
  const user = await requireUser();
  const country = await viewerCountry();
  const [lists, saved, movies, series, anime, hereMovies, hereSeries, loved, popular, fresh] = await Promise.all([
    getLists(user.id),
    savedTitles(user.id),
    trending("movie"),
    trending("series"),
    trending("anime"),
    popularHere("movie", country.code),
    popularHere("series", country.code),
    mostLiked(),
    popularLists(),
    newestLists(),
  ]);
  const defaultList = lists.find((l) => l.isDefault) ?? lists[0];
  // A list in both rows shows once, under Popular.
  const popularIds = new Set(popular.map((l) => l.id));
  const newOnes = fresh.filter((l) => !popularIds.has(l.id));

  return (
    <Screen back={{ href: "/", label: "Home" }} title="Discover">
      <SavedTitles saved={saved}>
      {/* Opens the search page, where the field takes the typing. */}
      <Link
        href="/discover/search"
        transitionTypes={["nav-forward"]}
        className="flex h-12 items-center gap-3 rounded-2xl border border-input bg-card px-3.5 text-base text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-5 shrink-0" aria-hidden />
        Titles, genres, topics like Christian
      </Link>
      <Section id="trending-heading" title="New & trending" hint={`Tap + to put one on ${defaultList.name}.`}>
        <Trending byKind={{ movie: movies, series, anime }} listName={defaultList.name} seeAll={seeAll("trending")} />
      </Section>

      {(hereMovies.length > 0 || hereSeries.length > 0) && (
        <Section id="here-heading" title={`Popular in ${country.name}`} hint={`Most popular to stream in ${country.name} right now.`}>
          <Trending byKind={{ movie: hereMovies, series: hereSeries }} listName={defaultList.name} seeAll={seeAll("country")} />
        </Section>
      )}

      <Section id="genres-heading" title="Browse by genre">
        <GenreChips />
      </Section>

      <Section id="loved-heading" title="Most liked on Abduct" hint="What people here rate highest.">
        {loved.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing rated yet. Rate what you&apos;ve watched and it shows up here.
          </p>
        ) : (
          <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {loved.map((t) => (
              <li key={t.titleId} className="w-28 shrink-0 snap-start">
                <Link href={`/titles/${t.titleId}`} transitionTypes={["nav-forward"]} className="block transition-transform active:scale-[0.97]">
                  <Poster src={t.posterUrl} name={t.name} kind={t.kind} />
                  <span className="mt-1.5 line-clamp-2 text-xs leading-snug font-medium">{t.name}</span>
                  <span className="mt-0.5 flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Star className="size-3 fill-primary text-primary" aria-hidden /> {t.average}
                    <span className="ml-1">({t.votes})</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="lists-heading" title="Popular lists" hint="Lists people share, most liked first.">
        {popular.length === 0 ? (
          <p className="flex items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            <Globe className="size-4 shrink-0" aria-hidden /> No shared lists yet. Make one of yours public from its edit page.
          </p>
        ) : (
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {popular.map((l) => (
              <PublicListCard key={l.id} list={l} />
            ))}
          </div>
        )}
      </Section>

      {newOnes.length > 0 && (
        <Section id="new-lists-heading" title="Newly shared">
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {newOnes.map((l) => (
              <PublicListCard key={l.id} list={l} />
            ))}
          </div>
        </Section>
      )}
      </SavedTitles>
    </Screen>
  );
}
