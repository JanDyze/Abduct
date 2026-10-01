import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { z } from "zod";
import { DefaultStar } from "@/components/default-star";
import { ListBadge } from "@/components/list-icon";
import { reorderItems } from "@/app/lists/actions";
import { ListItemsView } from "@/components/list-items-view";
import { Screen } from "@/components/screen";
import { requireUser } from "@/lib/auth";
import { titleMeta } from "@/lib/format";
import { getItems, getList, getLists, listsForTitles } from "@/lib/lists/queries";
import { isKind } from "@/lib/titles/kinds";

export async function generateMetadata({ params }: PageProps<"/lists/[id]">): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const list = z.uuid().safeParse(id).success ? await getList(user.id, id) : null;
  return { title: list?.name ?? "List" };
}


// One list: what's still to watch (or what's been watched), by kind, with a button to let the UFO
// pick from just this list.
export default async function ListPage({ params, searchParams }: PageProps<"/lists/[id]">) {
  const { id } = await params;
  const { kind: rawKind, show } = await searchParams;
  const user = await requireUser();
  const list = z.uuid().safeParse(id).success ? await getList(user.id, id) : null;
  if (!list) notFound();

  const [items, yours] = await Promise.all([getItems(user.id, list.id), getLists(user.id)]);
  const onLists = await listsForTitles(user.id, items.map((i) => i.titleId));
  const kind = isKind(rawKind) ? rawKind : null;
  const watchedView = show === "watched";
  const toWatch = items.filter((i) => !i.watchedAt);


  return (
    <Screen
      back={{ href: "/lists", label: "My lists" }}
      title={list.name}
      subtitle={`${toWatch.length} to watch · ${items.length - toWatch.length} watched`}
      action={
        <div className="flex shrink-0 items-center gap-1">
          <DefaultStar listId={list.id} isDefault={list.isDefault} />
          <Link
            href={`/lists/${list.id}/edit`}
            transitionTypes={["nav-forward"]}
            aria-label="Edit list"
            className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-4.5" aria-hidden />
          </Link>
          <Link
            href={`/add?list=${list.id}`}
            transitionTypes={["nav-forward"]}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground active:scale-95"
          >
            <Plus className="size-4" strokeWidth={2.5} aria-hidden /> Add
          </Link>
        </div>
      }
    >
      {items.length === 0 ? (
        <div className="animate-rise flex flex-col items-center gap-3 py-16 text-center">
          <ListBadge icon={list.icon} color={list.color} className="size-20 rounded-2xl" />
          <h2 className="font-brand text-xl font-bold">Nothing here yet</h2>
          <p className="max-w-64 text-sm text-muted-foreground">Add movies, series or anime you want to watch, then let the UFO pick one.</p>
          <Link
            href={`/add?list=${list.id}`}
            transitionTypes={["nav-forward"]}
            className="mt-2 flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" strokeWidth={2.5} aria-hidden /> Add titles
          </Link>
        </div>
      ) : (
        <>
          {toWatch.length > 0 && (
            <Link
              href={`/spin?list=${list.id}`}
              transitionTypes={["nav-forward"]}
              className="animate-rise mb-4 flex h-12 items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_8px_30px_-6px] shadow-primary/40 active:scale-[0.98]"
            >
              Pick from this list
            </Link>
          )}
          <ListItemsView
            listId={list.id}
            items={items.map((i) => ({
              itemId: i.itemId,
              titleId: i.titleId,
              name: i.name,
              kind: i.kind,
              posterUrl: i.posterUrl,
              watched: Boolean(i.watchedAt),
              stars: i.stars,
              meta: titleMeta(i),
              onLists: onLists[i.titleId] ?? [list.id],
            }))}
            lists={yours.map(({ id, name, icon, color }) => ({ id, name, icon, color }))}
            initialKind={kind}
            initialWatched={watchedView}
            save={reorderItems.bind(null, list.id)}
          />
        </>
      )}
    </Screen>
  );
}
