import type { Metadata } from "next";
import { BrowseGrid } from "@/components/browse-grid";
import { BrowseShell, type BrowseLink } from "@/components/browse-shell";
import { SavedTitles } from "@/components/catalog-poster";
import { Screen } from "@/components/screen";
import { requireUser } from "@/lib/auth";
import { viewerCountry } from "@/lib/country";
import { getLists, savedTitles } from "@/lib/lists/queries";
import { browse, topicName, type BrowsePage } from "@/lib/titles/catalog";
import { browseHref, genreOf, GENRES, TOPIC_CHIPS, topicChipOf, type Feed } from "@/lib/titles/genres";
import { isKind, KIND_PLURAL, KINDS, type Kind } from "@/lib/titles/kinds";

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
  const [lists, saved, country, keyword] = await Promise.all([
    getLists(user.id),
    savedTitles(user.id),
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

  const kindLinks: BrowseLink[] = KINDS.map((k) => ({ key: k, label: KIND_PLURAL[k], href: hrefForKind(k, feed, genre?.name, topic), active: k === kind }));
  const chipLinks: BrowseLink[] = [
    ...(feed === "topic" && !chipTopic ? [{ key: "topic", label: topicLabel, href: browseHref(kind, "topic", topic), active: true }] : []),
    { key: "trending", label: "Trending", href: browseHref(kind, "trending"), active: feed === "trending" },
    ...(kind !== "anime" ? [{ key: "country", label: `Popular in ${country.name}`, href: browseHref(kind, "country"), active: feed === "country" }] : []),
    ...TOPIC_CHIPS.filter((t) => t.byKind[kind]).map((t) => ({ key: `t-${t.name}`, label: t.name, href: browseHref(kind, "topic", t.byKind[kind]), active: chipTopic === t })),
    ...GENRES[kind].map((g) => ({ key: `g-${g.id}`, label: g.name, href: browseHref(kind, "genre", g.id), active: feed === "genre" && genre?.id === g.id })),
  ];

  return (
    <Screen back={{ href: "/discover", label: "Discover" }} title={title} subtitle={KIND_PLURAL[kind]}>
      <BrowseShell kinds={kindLinks} chips={chipLinks}>
        <SavedTitles saved={saved} lists={lists.map(({ id, name, icon, color, isDefault }) => ({ id, name, icon, color, isDefault }))}>
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
        </SavedTitles>
      </BrowseShell>
    </Screen>
  );
}
