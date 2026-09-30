import type { Metadata } from "next";
import Link from "next/link";
import { BrowseGrid } from "@/components/browse-grid";
import { Screen } from "@/components/screen";
import { requireUser } from "@/lib/auth";
import { viewerCountry } from "@/lib/country";
import { getLists } from "@/lib/lists/queries";
import { browse, topicName, type BrowsePage } from "@/lib/titles/catalog";
import { browseHref, genreOf, GENRES, TOPIC_CHIPS, topicChipOf, type Feed } from "@/lib/titles/genres";
import { isKind, KIND_PLURAL, KINDS, type Kind } from "@/lib/titles/kinds";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Discover" };

// Where switching kind takes a feed: the same genre by name when the other kind has it (TMDB's
// movie and TV genres differ), a topic chip's topic for that kind, the same topic otherwise;
// trending when there's no match or the feed can't do that kind (anime has no country or topics).
function hrefForKind(kind: Kind, feed: Feed, genreName: string | undefined, topic: number | undefined) {
  if ((feed === "country" || feed === "topic") && kind === "anime") return browseHref(kind, "trending");
  if (feed === "topic") return browseHref(kind, "topic", topicChipOf(topic)?.byKind[kind] ?? topic);
  if (feed !== "genre") return browseHref(kind, feed);
  const same = GENRES[kind].find((g) => g.name.toLowerCase() === genreName?.toLowerCase());
  return same ? browseHref(kind, "genre", same.id) : browseHref(kind, "trending");
}

const chip = (active: boolean) =>
  cn(
    "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
    active ? "border-primary/50 bg-primary/15 text-primary" : "bg-card text-muted-foreground hover:text-foreground",
  );

// See all, for one of Discover's feeds: trending, a genre, popular in your country, or a topic
// (Christian, or one found by searching), for movies, series or anime. Chips switch feeds in place;
// posters keep coming as you scroll.
export default async function BrowsePage({ searchParams }: PageProps<"/discover/browse">) {
  const user = await requireUser();
  const params = await searchParams;
  const kind: Kind = isKind(params.kind) ? params.kind : "movie";
  const genre = genreOf(kind, typeof params.genre === "string" ? params.genre : null);
  const topicId = Number(params.topic);
  const topic = Number.isInteger(topicId) && topicId > 0 ? topicId : undefined;
  let feed: Feed = params.feed === "country" || params.feed === "genre" || params.feed === "topic" ? params.feed : "trending";
  if ((feed === "genre" && !genre) || (feed === "topic" && !topic) || ((feed === "country" || feed === "topic") && kind === "anime")) feed = "trending";

  const chipTopic = feed === "topic" ? topicChipOf(topic) : null;
  const [lists, country, keyword] = await Promise.all([
    getLists(user.id),
    viewerCountry(),
    feed === "topic" && !chipTopic ? topicName(topic!) : null,
  ]);
  const topicLabel = chipTopic?.name ?? (keyword ? keyword.charAt(0).toUpperCase() + keyword.slice(1) : "Topic");
  const defaultList = lists.find((l) => l.isDefault) ?? lists[0];
  let first: BrowsePage | null = null;
  try {
    first = await browse(kind, feed, { genre: genre?.id, topic, country: country.code, page: 1 });
  } catch (e) {
    console.error("Browse failed:", e);
  }

  const title = feed === "genre" ? genre!.name : feed === "topic" ? topicLabel : feed === "country" ? `Popular in ${country.name}` : "Trending";
  const hint =
    feed === "country" ? `Most popular to stream in ${country.name} right now.` : feed === "genre" || feed === "topic" ? "Most popular first." : "What everyone's watching this week.";

  return (
    <Screen back={{ href: "/discover", label: "Discover" }} title={title} subtitle={KIND_PLURAL[kind]}>
      <nav aria-label="Kind" className="flex gap-1 rounded-xl bg-muted p-1">
        {KINDS.map((k) => (
          <Link
            key={k}
            href={hrefForKind(k, feed, genre?.name, topic)}
            replace
            aria-current={k === kind ? "page" : undefined}
            className={cn(
              "flex h-8 flex-1 items-center justify-center rounded-lg text-sm font-medium transition-colors",
              k === kind ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {KIND_PLURAL[k]}
          </Link>
        ))}
      </nav>

      <nav aria-label="Browse" className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {feed === "topic" && !chipTopic && (
          <span aria-current="page" className={chip(true)}>
            {topicLabel}
          </span>
        )}
        <Link href={browseHref(kind, "trending")} replace aria-current={feed === "trending" ? "page" : undefined} className={chip(feed === "trending")}>
          Trending
        </Link>
        {kind !== "anime" && (
          <Link href={browseHref(kind, "country")} replace aria-current={feed === "country" ? "page" : undefined} className={chip(feed === "country")}>
            Popular in {country.name}
          </Link>
        )}
        {TOPIC_CHIPS.filter((t) => t.byKind[kind]).map((t) => {
          const active = chipTopic === t;
          return (
            <Link key={t.name} href={browseHref(kind, "topic", t.byKind[kind])} replace aria-current={active ? "page" : undefined} className={chip(active)}>
              {t.name}
            </Link>
          );
        })}
        {GENRES[kind].map((g) => {
          const active = feed === "genre" && genre?.id === g.id;
          return (
            <Link key={g.id} href={browseHref(kind, "genre", g.id)} replace aria-current={active ? "page" : undefined} className={chip(active)}>
              {g.name}
            </Link>
          );
        })}
      </nav>

      <p className="mt-4 mb-3 text-sm text-muted-foreground">
        {hint} Tap + to put one on {defaultList.name}.
      </p>
      {first ? (
        <BrowseGrid
          key={`${kind}:${feed}:${genre?.id ?? ""}:${topic ?? ""}`}
          kind={kind}
          feed={feed}
          genre={genre?.id}
          topic={feed === "topic" ? topic : undefined}
          initial={first.results}
          hasMore={first.hasMore}
          listName={defaultList.name}
        />
      ) : (
        <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t reach the catalog. Try again in a moment.
        </p>
      )}
    </Screen>
  );
}
