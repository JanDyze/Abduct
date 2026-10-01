"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowRightLeft, Check, ChevronLeft, Eye, EyeOff, Loader2, Plus, Star, Trash2 } from "lucide-react";
import { undoAdd } from "@/app/add/actions";
import { setOnList, setWatched } from "@/app/lists/actions";
import { Arrangeable } from "@/components/arrange-list";
import { ListBadge } from "@/components/list-icon";
import { Poster } from "@/components/poster";
import { Sheet, SheetItem } from "@/components/ui/sheet";
import type { ListOption } from "@/lib/lists/icons";
import { KIND_PLURAL, type Kind } from "@/lib/titles/kinds";
import { useLongPress } from "@/lib/use-long-press";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";

export type ListViewItem = {
  itemId: string;
  titleId: string;
  name: string;
  kind: Kind;
  posterUrl: string | null;
  watched: boolean;
  stars: number | null;
  meta: string;
  onLists: string[]; // every list of yours it's on, this one included
};

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
// so Back and a shared link keep them. Hold a title (or right-click it) for its quick actions.
export function ListItemsView({
  listId,
  items: serverItems,
  lists,
  initialKind,
  initialWatched,
  save,
}: {
  listId: string;
  items: ListViewItem[];
  lists: ListOption[];
  initialKind: Kind | null;
  initialWatched: boolean;
  save: (ids: string[]) => Promise<{ error?: string }>;
}) {
  const [kind, setKind] = useState(initialKind);
  const [watchedView, setWatchedView] = useState(initialWatched);
  // changes made from the hold sheet, shown at once while the page catches up
  const [edits, setEdits] = useState<Record<string, Partial<ListViewItem> & { gone?: boolean }>>({});
  const [heldId, setHeldId] = useState<string | null>(null);
  const items = serverItems.filter((i) => !edits[i.itemId]?.gone).map((i) => ({ ...i, ...edits[i.itemId] }));
  const held = items.find((i) => i.itemId === heldId) ?? null;
  const edit = (itemId: string, change: Partial<ListViewItem> & { gone?: boolean }) => setEdits((e) => ({ ...e, [itemId]: { ...e[itemId], ...change } }));
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
              <HoldableItem key={item.itemId} item={item} held={item.itemId === heldId} onHold={() => setHeldId(item.itemId)} delay={Math.min(i, 12) * 20} />
            ))}
          </ul>
        </Arrangeable>
      )}
      <ItemActions item={held} listId={listId} lists={lists} edit={edit} onClose={() => setHeldId(null)} />
    </>
  );
}

function HoldableItem({ item, held, onHold, delay }: { item: ListViewItem; held: boolean; onHold: () => void; delay: number }) {
  const press = useLongPress(() => {
    sound.pop(2);
    onHold();
  });
  return (
    <li className="animate-rise select-none" style={{ animationDelay: `${delay}ms` }} {...press}>
      <Link
        href={`/items/${item.itemId}`}
        transitionTypes={["nav-forward"]}
        className={cn("block transition-transform active:scale-[0.97]", held && "scale-[0.95]")}
      >
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
  );
}

// What holding a title on a list opens: watched or not, which of your lists it's on, move it to
// another list, or take it off this one (which asks first).
function ItemActions({
  item: current,
  listId,
  lists,
  edit,
  onClose,
}: {
  item: ListViewItem | null;
  listId: string;
  lists: ListOption[];
  edit: (itemId: string, change: Partial<ListViewItem> & { gone?: boolean }) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"main" | "move" | "confirm">("main");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  // the last title held, so the sheet keeps its content while it slides away
  const [shown, setShown] = useState(current);
  if (current && current !== shown) setShown(current);
  if (!shown) return null;
  const item = current ?? shown;
  const others = lists.filter((l) => l.id !== listId);
  const here = lists.find((l) => l.id === listId);
  const icon = "size-5 text-muted-foreground";

  const close = () => {
    setMode("main");
    setError(null);
    onClose();
  };
  const fail = (message: string) => {
    sound.error();
    setError(message);
  };

  const toggleWatched = () => {
    const next = !item.watched;
    sound.watched(next);
    edit(item.itemId, { watched: next });
    close();
    start(async () => {
      const res = await setWatched(item.itemId, next);
      if (res.error) edit(item.itemId, { watched: !next });
      router.refresh();
    });
  };

  const toggleList = (list: ListOption) => {
    const on = !item.onLists.includes(list.id);
    const before = item.onLists;
    if (on) sound.pop(4);
    else sound.remove();
    edit(item.itemId, { onLists: on ? [...before, list.id] : before.filter((id) => id !== list.id) });
    setError(null);
    start(async () => {
      const res = await setOnList(item.titleId, list.id, on);
      if (res.error) {
        edit(item.itemId, { onLists: before });
        return fail(res.error);
      }
      router.refresh();
    });
  };

  const moveTo = (list: ListOption) =>
    start(async () => {
      setError(null);
      if (!item.onLists.includes(list.id)) {
        const res = await setOnList(item.titleId, list.id, true);
        if (res.error) return fail(res.error);
      }
      const res = await undoAdd(item.itemId);
      if (res.error) return fail(res.error);
      sound.whoosh();
      edit(item.itemId, { gone: true });
      close();
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      setError(null);
      const res = await undoAdd(item.itemId);
      if (res.error) return fail(res.error);
      sound.remove();
      edit(item.itemId, { gone: true });
      close();
      router.refresh();
    });

  const onlyHere = item.onLists.filter((id) => id !== listId).length === 0;

  return (
    <Sheet
      open={current !== null}
      onOpenChange={(o) => !o && close()}
      title={item.name}
      description={item.meta}
      header={<Poster src={item.posterUrl} name="" kind={item.kind} className="w-10 shrink-0 rounded-md" />}
    >
      <div className={cn(busy && "pointer-events-none opacity-70")}>
        {mode === "main" && (
          <ul>
            <li>
              <SheetItem
                icon={item.watched ? <EyeOff className={icon} aria-hidden /> : <Eye className={icon} aria-hidden />}
                label={item.watched ? "Not watched yet" : "Mark as watched"}
                onClick={toggleWatched}
              />
            </li>
            <li>
              <Link
                href={`/items/${item.itemId}`}
                transitionTypes={["nav-forward"]}
                onClick={close}
                className="flex min-h-13 w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <span className="flex size-9 shrink-0 items-center justify-center">
                  <ArrowRight className={icon} aria-hidden />
                </span>
                <span className="text-[0.95rem] font-semibold">Open</span>
              </Link>
            </li>
            {others.length > 0 && (
              <li>
                <SheetItem
                  icon={<ArrowRightLeft className={icon} aria-hidden />}
                  label="Move to another list"
                  detail={here ? `Takes it off ${here.name}` : undefined}
                  onClick={() => setMode("move")}
                />
              </li>
            )}
            {others.length > 0 && (
              <li className="mt-1 border-t pt-2">
                <p className="px-2.5 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Also on</p>
                <ul>
                  {others.map((l) => {
                    const on = item.onLists.includes(l.id);
                    return (
                      <li key={l.id}>
                        <SheetItem
                          icon={<ListBadge icon={l.icon} color={l.color} className="size-9 rounded-lg" />}
                          label={l.name}
                          aria-pressed={on}
                          onClick={() => toggleList(l)}
                          trailing={
                            on ? (
                              <Check className="size-5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
                            ) : (
                              <Plus className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                            )
                          }
                        />
                      </li>
                    );
                  })}
                </ul>
              </li>
            )}
            <li className="mt-1 border-t pt-1">
              <SheetItem
                icon={<Trash2 className="size-5" aria-hidden />}
                label={here ? `Remove from ${here.name}` : "Remove from this list"}
                detail={onlyHere ? "It's on no other list, so it'll be gone" : "It stays on your other lists"}
                tone="danger"
                onClick={() => setMode("confirm")}
              />
            </li>
          </ul>
        )}

        {mode === "move" && (
          <ul>
            <li>
              <SheetItem icon={<ChevronLeft className={icon} aria-hidden />} label="Back" onClick={() => setMode("main")} />
            </li>
            {others.map((l) => (
              <li key={l.id}>
                <SheetItem
                  icon={<ListBadge icon={l.icon} color={l.color} className="size-9 rounded-lg" />}
                  label={l.name}
                  detail={item.onLists.includes(l.id) ? "Already there: just takes it off this one" : undefined}
                  onClick={() => moveTo(l)}
                  trailing={<ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
                />
              </li>
            ))}
          </ul>
        )}

        {mode === "confirm" && (
          <div className="animate-fade-in m-1 flex flex-col gap-2 rounded-2xl bg-destructive/5 p-3">
            <p className="text-sm">
              Take {item.name} off {here?.name ?? "this list"}?{onlyHere && " It isn't on any other list, so it'll be gone from Abduct for you."}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode("main")} className="h-11 flex-1 rounded-xl border text-sm font-medium hover:bg-muted">
                Keep it
              </button>
              <button
                type="button"
                onClick={remove}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-semibold text-background hover:bg-destructive/90"
              >
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Remove
              </button>
            </div>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="px-3 pb-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </Sheet>
  );
}
