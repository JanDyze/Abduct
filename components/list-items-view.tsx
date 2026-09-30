"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import { Arrangeable } from "@/components/arrange-list";
import { Poster } from "@/components/poster";
import { KIND_PLURAL, type Kind } from "@/lib/titles/kinds";
import { cn } from "@/lib/utils";

export type ListViewItem = { itemId: string; name: string; kind: Kind; posterUrl: string | null; watched: boolean; stars: number | null; meta: string };

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

// A list's titles with its filters (to watch or watched, and by kind). The whole list is already
// here, so the filters work in place, at once; the address follows along (?show=watched&kind=anime)
// so Back and a shared link keep them.
export function ListItemsView({
  listId,
  items,
  initialKind,
  initialWatched,
  save,
}: {
  listId: string;
  items: ListViewItem[];
  initialKind: Kind | null;
  initialWatched: boolean;
  save: (ids: string[]) => Promise<{ error?: string }>;
}) {
  const [kind, setKind] = useState(initialKind);
  const [watchedView, setWatchedView] = useState(initialWatched);
  const toWatch = items.filter((i) => !i.watched);
  const shown = items.filter((i) => i.watched === watchedView && (!kind || i.kind === kind));
  const kindsHere = (["movie", "series", "anime"] as Kind[]).filter((k) => items.some((i) => i.kind === k));

  const choose = (next: { kind?: Kind | null; watched?: boolean }) => {
    const k = next.kind === undefined ? kind : next.kind;
    const w = next.watched ?? watchedView;
    setKind(k);
    setWatchedView(w);
    const q = new URLSearchParams();
    if (k) q.set("kind", k);
    if (w) q.set("show", "watched");
    window.history.replaceState(null, "", `/lists/${listId}${q.size ? `?${q}` : ""}`);
  };

  return (
    <>
      <nav aria-label="Filter" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-4">
        <Chip active={!watchedView} onClick={() => choose({ watched: false })}>
          To watch
        </Chip>
        <Chip active={watchedView} onClick={() => choose({ watched: true })}>
          Watched
        </Chip>
        {kindsHere.length > 1 && (
          <>
            <span className="w-px shrink-0 bg-border" aria-hidden />
            <Chip active={!kind} onClick={() => choose({ kind: null })}>
              All
            </Chip>
            {kindsHere.map((k) => (
              <Chip key={k} active={kind === k} onClick={() => choose({ kind: k })}>
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
          save={save}
          items={
            watchedView || kind
              ? []
              : toWatch.map((i) => ({
                  id: i.itemId,
                  title: i.name,
                  subtitle: i.meta,
                  thumb: <Poster src={i.posterUrl} name="" kind={i.kind} className="w-9 rounded-md" />,
                }))
          }
        >
          <ul key={`${watchedView}-${kind}`} className="grid grid-cols-3 gap-x-3 gap-y-4">
            {shown.map((item, i) => (
              <li key={item.itemId} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 20}ms` }}>
                <Link href={`/items/${item.itemId}`} transitionTypes={["nav-forward"]} className="block transition-transform active:scale-[0.97]">
                  <div className="relative">
                    <Poster src={item.posterUrl} name={item.name} kind={item.kind} className={cn(item.watched && "opacity-60")} />
                    {item.watched && (
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
  );
}
