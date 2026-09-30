import type { Metadata } from "next";
import Link from "next/link";
import { Globe, Star } from "lucide-react";
import { Poster } from "@/components/poster";
import { PublicListCard } from "@/components/public-list-card";
import { Screen } from "@/components/screen";
import { Trending } from "@/components/trending";
import { requireUser } from "@/lib/auth";
import { getLists } from "@/lib/lists/queries";
import { mostLiked, newestLists, popularLists } from "@/lib/social/discover";
import { trending } from "@/lib/titles/catalog";

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

// What's out there: new and trending titles from the catalogs, what people on Abduct rate highest,
// and the lists people share.
export default async function DiscoverPage() {
  const user = await requireUser();
  const [lists, movies, series, anime, loved, popular, fresh] = await Promise.all([
    getLists(user.id),
    trending("movie"),
    trending("series"),
    trending("anime"),
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
      <Section id="trending-heading" title="New & trending" hint={`Tap + to put one on ${defaultList.name}.`}>
        <Trending byKind={{ movie: movies, series, anime }} listName={defaultList.name} />
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
    </Screen>
  );
}
