import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Pencil, Plus, Star } from "lucide-react";
import { z } from "zod";
import { DefaultStar } from "@/components/default-star";
import { ListBadge } from "@/components/list-icon";
import { reorderItems } from "@/app/lists/actions";
import { Arrangeable } from "@/components/arrange-list";
import { Poster } from "@/components/poster";
import { Screen } from "@/components/screen";
import { requireUser } from "@/lib/auth";
import { titleMeta } from "@/lib/format";
import { getItems, getList } from "@/lib/lists/queries";
import { isKind, KIND_PLURAL, KINDS } from "@/lib/titles/kinds";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/lists/[id]">): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const list = z.uuid().safeParse(id).success ? await getList(user.id, id) : null;
  return { title: list?.name ?? "List" };
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

// One list: what's still to watch (or what's been watched), by kind, with a button to let the UFO
// pick from just this list.
export default async function ListPage({ params, searchParams }: PageProps<"/lists/[id]">) {
  const { id } = await params;
  const { kind: rawKind, show } = await searchParams;
  const user = await requireUser();
  const list = z.uuid().safeParse(id).success ? await getList(user.id, id) : null;
  if (!list) notFound();

  const items = await getItems(user.id, list.id);
  const kind = isKind(rawKind) ? rawKind : null;
  const watchedView = show === "watched";
  const toWatch = items.filter((i) => !i.watchedAt);
  const shown = items.filter((i) => Boolean(i.watchedAt) === watchedView && (!kind || i.kind === kind));
  const kindsHere = KINDS.filter((k) => items.some((i) => i.kind === k));

  const href = (next: { kind?: string | null; show?: string | null }) => {
    const q = new URLSearchParams();
    const k = next.kind === undefined ? kind : next.kind;
    const s = next.show === undefined ? (watchedView ? "watched" : null) : next.show;
    if (k) q.set("kind", k);
    if (s) q.set("show", s);
    const qs = q.toString();
    return `/lists/${list.id}${qs ? `?${qs}` : ""}`;
  };

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
          <nav aria-label="Filter" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-4">
            <Chip href={href({ show: null })} active={!watchedView}>
              To watch
            </Chip>
            <Chip href={href({ show: "watched" })} active={watchedView}>
              Watched
            </Chip>
            {kindsHere.length > 1 && (
              <>
                <span className="w-px shrink-0 bg-border" aria-hidden />
                <Chip href={href({ kind: null })} active={!kind}>
                  All
                </Chip>
                {kindsHere.map((k) => (
                  <Chip key={k} href={href({ kind: k })} active={kind === k}>
                    {KIND_PLURAL[k]}
                  </Chip>
                ))}
              </>
            )}
          </nav>
          {shown.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {watchedView ? "Nothing watched here yet." : "Everything here is watched. Add something new?"}
            </p>
          ) : (
            <Arrangeable
              save={reorderItems.bind(null, list.id)}
              items={
                watchedView || kind
                  ? []
                  : toWatch.map((i) => ({
                      id: i.itemId,
                      title: i.name,
                      subtitle: titleMeta(i),
                      thumb: <Poster src={i.posterUrl} name="" kind={i.kind} className="w-9 rounded-md" />,
                    }))
              }
            >
            <ul className="grid grid-cols-3 gap-x-3 gap-y-4">
              {shown.map((item, i) => (
                <li key={item.itemId} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                  <Link href={`/items/${item.itemId}`} transitionTypes={["nav-forward"]} className="block transition-transform active:scale-[0.97]">
                    <div className="relative">
                      <Poster src={item.posterUrl} name={item.name} kind={item.kind} className={cn(item.watchedAt && "opacity-60")} />
                      {item.watchedAt && (
                        <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3.5" strokeWidth={3} aria-label="Watched" />
                        </span>
                      )}
                    </div>
                    <span className="mt-1.5 line-clamp-2 text-xs leading-snug font-medium">{item.name}</span>
                    {item.stars != null && (
                      <span className="mt-0.5 flex items-center gap-0.5 text-xs text-muted-foreground" aria-label={`You rated it ${item.stars} of 5`}>
                        <Star className="size-3 fill-primary text-primary" aria-hidden /> {item.stars}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            </Arrangeable>
          )}
        </>
      )}
    </Screen>
  );
}
