import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { z } from "zod";
import { removeItem } from "@/app/lists/actions";
import { Comments, OthersComments } from "@/components/comments";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ListToggles } from "@/components/list-toggles";
import { Poster } from "@/components/poster";
import { Screen } from "@/components/screen";
import { StarRating } from "@/components/star-rating";
import { WatchedToggle } from "@/components/watched-toggle";
import { WhereToWatch, WhereToWatchLoading } from "@/components/where-to-watch";
import { requireUser } from "@/lib/auth";
import { titleMeta } from "@/lib/format";
import { getItem, getLists, listsWithTitle } from "@/lib/lists/queries";
import { publicComments } from "@/lib/social/discover";
import { getComments } from "@/lib/titles/feedback";

async function load(params: PageProps<"/items/[id]">["params"]) {
  const { id } = await params;
  const user = await requireUser();
  const item = z.uuid().safeParse(id).success ? await getItem(user.id, id) : null;
  return { user, item };
}

export async function generateMetadata({ params }: PageProps<"/items/[id]">): Promise<Metadata> {
  const { item } = await load(params);
  return { title: item?.name ?? "Title" };
}

// One title on one of your lists: its poster over its backdrop, what it is, and what you can do
// with it: mark it watched, rate it, say what you thought, take it off the list.
export default async function ItemPage({ params }: PageProps<"/items/[id]">) {
  const { user, item } = await load(params);
  if (!item) notFound();
  const [comments, lists, onLists, others] = await Promise.all([
    getComments(user.id, item.titleId),
    getLists(user.id),
    listsWithTitle(user.id, item.titleId),
    publicComments(item.titleId, user.id),
  ]);

  return (
    <Screen back={{ href: `/lists/${item.listId}`, label: item.listName }} title={item.listName} className="pt-0">
      <div className="relative -mx-4 mb-4 h-44 overflow-hidden">
        {item.backdropUrl ? (
          <Image src={item.backdropUrl} alt="" fill sizes="640px" unoptimized priority className="object-cover opacity-50" />
        ) : (
          <div className="size-full bg-gradient-to-b from-primary/15 to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
      </div>
      <div className="animate-rise -mt-32 flex items-end gap-4">
        <Poster src={item.posterUrl} name={item.name} kind={item.kind} priority className="w-32 shrink-0 shadow-2xl shadow-black/60" />
        <div className="min-w-0 pb-1">
          <h2 className="font-brand text-2xl leading-tight font-bold text-balance">{item.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{titleMeta(item)}</p>
          {item.score != null && (
            <p className="mt-1.5 flex items-center gap-1 text-sm font-medium">
              <Star className="size-4 fill-primary text-primary" aria-hidden /> {item.score}%<span className="sr-only"> audience score</span>
            </p>
          )}
        </div>
      </div>

      {item.genres.length > 0 && (
        <ul className="animate-rise mt-4 flex flex-wrap gap-1.5" style={{ animationDelay: "60ms" }}>
          {item.genres.map((g) => (
            <li key={g} className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground">
              {g}
            </li>
          ))}
        </ul>
      )}

      <WatchedToggle itemId={item.itemId} watched={Boolean(item.watchedAt)} className="animate-rise mt-5" />

      {item.source !== "manual" && (
        <Suspense fallback={<WhereToWatchLoading />}>
          <WhereToWatch source={item.source} sourceId={item.sourceId} />
        </Suspense>
      )}

      <section aria-labelledby="rating-heading" className="animate-rise mt-6" style={{ animationDelay: "80ms" }}>
        <h2 id="rating-heading" className="mb-1 font-brand text-lg font-bold">
          Your rating
        </h2>
        <StarRating titleId={item.titleId} stars={item.stars} className="-ml-1" />
      </section>

      <ListToggles
        titleId={item.titleId}
        currentListId={item.listId}
        lists={lists.map(({ id, name, icon, color, isDefault }) => ({ id, name, icon, color, isDefault }))}
        onLists={onLists}
      />

      {item.overview && (
        <p className="animate-rise mt-5 text-[0.95rem] leading-relaxed whitespace-pre-line text-foreground/85" style={{ animationDelay: "100ms" }}>
          {item.overview}
        </p>
      )}

      <Comments titleId={item.titleId} initial={comments} />
      <OthersComments comments={others} />

      <div className="mt-10 border-t pt-6">
        <ConfirmDelete
          action={removeItem}
          fields={{ id: item.itemId, listId: item.listId }}
          label={`Remove from ${item.listName}`}
          question={`Take “${item.name}” off ${item.listName}?`}
        />
      </div>
    </Screen>
  );
}
