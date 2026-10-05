import type { Metadata } from "next";
import { Randomizer, type SpinItem } from "@/components/randomizer";
import { Screen } from "@/components/screen";
import { requireUser } from "@/lib/auth";
import { myServices } from "@/lib/my-services";
import { getLists, recentPickTitleIds, spinItems } from "@/lib/lists/queries";

export const metadata: Metadata = { title: "Pick for me" };

// The randomizer. Everything on your lists comes along so filtering and spinning happen instantly
// on the phone; only the pick itself is sent back (for "recently picked").
export default async function SpinPage({ searchParams }: PageProps<"/spin">) {
  const { list } = await searchParams;
  const user = await requireUser();
  const [lists, rows, recent, services] = await Promise.all([getLists(user.id), spinItems(user.id), recentPickTitleIds(user.id), myServices()]);
  const from = lists.find((l) => l.id === list);

  const items: SpinItem[] = rows.map((r) => ({
    itemId: r.itemId,
    titleId: r.titleId,
    source: r.source,
    sourceId: r.sourceId,
    listId: r.listId,
    kind: r.kind,
    name: r.name,
    year: r.year,
    posterUrl: r.posterUrl,
    genres: r.genres,
    runtime: r.runtime,
    episodes: r.episodes,
    score: r.score,
    overview: r.overview,
    stars: r.stars,
    watched: r.watchedAt != null,
    addedAt: r.addedAt.getTime(),
  }));

  return (
    <Screen back={from ? { href: `/lists/${from.id}`, label: from.name } : { href: "/", label: "Home" }} title="Pick for me" ship={false}>
      <Randomizer
        items={items}
        lists={lists.map(({ id, name, icon, color }) => ({ id, name, icon, color }))}
        recent={recent}
        initialList={from?.id ?? null}
        hasServices={services.length > 0}
      />
    </Screen>
  );
}
