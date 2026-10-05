"use client";

import { createContext, useContext, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, Plus } from "lucide-react";
import { addCatalogTitle, addTrendingTitle, undoAdd } from "@/app/add/actions";
import { createNamedList } from "@/app/lists/actions";
import { ListBadge } from "@/components/list-icon";
import { Poster } from "@/components/poster";
import { Sheet, SheetItem } from "@/components/ui/sheet";
import { useUndoToast } from "@/components/undo-toast";
import { abduct } from "@/lib/abduct";
import type { ListOption } from "@/lib/lists/icons";
import type { CatalogResult } from "@/lib/titles/normalize";
import { sortAdded } from "@/lib/sort-add";
import { useLongPress } from "@/lib/use-long-press";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";

// A catalog title's details page (story, genres, where to watch, and Add to any of your lists).
const detailsHref = (r: CatalogResult) => `/titles/open?${new URLSearchParams({ source: r.source, id: r.sourceId })}`;
const keyOf = (r: CatalogResult) => `${r.source}:${r.sourceId}`;

// `saved`: already on your lists before now, so no "Added · Undo" under it
type AddState = "adding" | "removing" | "failed" | { itemId: string; saved?: boolean };

export type PickList = ListOption & { isDefault: boolean };

// What's already on your lists ("tmdb:603" → its list item, from savedTitles), for a page's posters
// to start with a check instead of a +; and your lists, for holding a poster to choose one.
const Saved = createContext<{ saved: Record<string, string>; lists: PickList[] }>({ saved: {}, lists: [] });

export function SavedTitles({ saved, lists = [], children }: { saved: Record<string, string>; lists?: PickList[]; children: React.ReactNode }) {
  return <Saved.Provider value={{ saved, lists }}>{children}</Saved.Provider>;
}

const PENDING = "pending";

// Adding catalog titles from a row or grid of posters, with Undo: onto your default list, then
// Claude moves each to the list it belongs on (lib/lists/auto-sort.ts); or, holding a poster, to
// whichever of your lists you choose. One per row or grid: it owns the undo toast and
// the lists sheet (render `toast`).
export function useCatalogAdds(listName: string) {
  const { saved, lists } = useContext(Saved);
  // null: taken off here, whatever `saved` said
  const [added, setAdded] = useState<Record<string, AddState | null>>({});
  // titles put on a chosen list from the sheet: key -> list id -> its item (or PENDING)
  const [picked, setPicked] = useState<Record<string, Record<string, string>>>({});
  const [holding, setHolding] = useState<CatalogResult | null>(null);
  const holdingPoster = useRef<Element | null>(null);
  const toast = useUndoToast();
  const stateOf = (r: CatalogResult): AddState | undefined => {
    const key = keyOf(r);
    if (key in added) return added[key] ?? undefined;
    return saved[key] ? { itemId: saved[key], saved: true } : undefined;
  };

  // Added by mistake: tapping the check (or Undo) takes it off your list again.
  const undo = async (r: CatalogResult, itemId: string) => {
    toast.hide();
    sound.remove();
    setAdded((a) => ({ ...a, [keyOf(r)]: "removing" }));
    const res = await undoAdd(itemId);
    setAdded((a) => {
      const next = { ...a };
      next[keyOf(r)] = res.error ? { itemId } : null;
      return next;
    });
    if (!res.error) setPicked((p) => ({ ...p, [keyOf(r)]: Object.fromEntries(Object.entries(p[keyOf(r)] ?? {}).filter(([, id]) => id !== itemId)) }));
  };

  // `poster`: the one that was tapped, for the UFO to abduct
  const toggle = async (r: CatalogResult, poster?: Element | null) => {
    const state = stateOf(r);
    if (typeof state === "object") return undo(r, state.itemId);
    if (state === "adding") return;
    setAdded((a) => ({ ...a, [keyOf(r)]: "adding" }));
    abduct(poster);
    const res = await addTrendingTitle(r.source, r.sourceId);
    setAdded((a) => ({ ...a, [keyOf(r)]: res.ok ? { itemId: res.itemId } : "failed" }));
    if (!res.ok) sound.error();
    if (!res.ok || res.already) return;
    toast.show(`Added ${r.name} to ${listName}`, () => undo(r, res.itemId));
    // then Claude moves it to the list it belongs on (or a new one)
    const sorted = await sortAdded(res.itemId);
    if (!sorted) return;
    setAdded((a) => {
      const now = a[keyOf(r)];
      return typeof now === "object" && now?.itemId === res.itemId ? { ...a, [keyOf(r)]: { itemId: sorted.itemId } } : a;
    });
    toast.show(sorted.created ? `Made a ${sorted.listName} list for ${r.name}` : `Sorted ${r.name} into ${sorted.listName}`, () => undo(r, sorted.itemId));
  };

  const setPick = (key: string, listId: string, itemId: string | null) =>
    setPicked((p) => {
      const forKey = { ...p[key] };
      if (itemId) forKey[listId] = itemId;
      else delete forKey[listId];
      return { ...p, [key]: forKey };
    });

  // Takes a title back off a list chosen from the sheet; the poster keeps its check while it's on
  // another one you put it on here.
  const unpick = async (r: CatalogResult, list: ListOption, itemId: string) => {
    const key = keyOf(r);
    toast.hide();
    sound.remove();
    setPick(key, list.id, null);
    const res = await undoAdd(itemId);
    if (res.error) return setPick(key, list.id, itemId);
    const state = stateOf(r);
    if (typeof state === "object" && state.itemId === itemId) {
      const other = Object.entries(picked[key] ?? {}).find(([id, item]) => id !== list.id && item !== PENDING);
      setAdded((a) => ({ ...a, [key]: other ? { itemId: other[1] } : null }));
    }
  };

  // Puts the held title on the list you chose from the sheet (or takes it off again).
  const pick = async (r: CatalogResult, list: ListOption) => {
    const key = keyOf(r);
    const current = picked[key]?.[list.id];
    setHolding(null);
    if (current === PENDING) return;
    if (current) return unpick(r, list, current);
    setPick(key, list.id, PENDING);
    abduct(holdingPoster.current);
    const res = await addCatalogTitle(list.id, r.source, r.sourceId);
    if (!res.ok) {
      setPick(key, list.id, null);
      sound.error();
      setAdded((a) => (typeof stateOf(r) === "object" ? a : { ...a, [key]: "failed" }));
      return;
    }
    setPick(key, list.id, res.itemId);
    setAdded((a) => (typeof a[key] === "object" && a[key] ? a : { ...a, [key]: { itemId: res.itemId } }));
    if (!res.already) toast.show(`Added ${r.name} to ${list.name}`, () => unpick(r, list, res.itemId));
  };

  const hold = (r: CatalogResult, poster?: Element | null) => {
    if (lists.length === 0) return;
    holdingPoster.current = poster ?? null;
    sound.pop(2);
    setHolding(r);
  };

  const sheet = (
    <ListsSheet
      result={holding}
      lists={lists}
      on={holding ? (picked[keyOf(holding)] ?? {}) : {}}
      alreadyYours={holding ? typeof stateOf(holding) === "object" : false}
      onPick={pick}
      onClose={() => setHolding(null)}
    />
  );

  return {
    stateOf,
    toggle,
    hold,
    canHold: lists.length > 0,
    toast: (
      <>
        {toast.node}
        {sheet}
      </>
    ),
    listName,
  };
}

// Holding a poster: all your lists, to put the title on the one you choose instead of your default,
// or on a new one named on the spot.
function ListsSheet({
  result: r,
  lists: initialLists,
  on,
  alreadyYours,
  onPick,
  onClose,
}: {
  result: CatalogResult | null;
  lists: PickList[];
  on: Record<string, string>;
  alreadyYours: boolean;
  onPick: (r: CatalogResult, list: ListOption) => void;
  onClose: () => void;
}) {
  const [made, setMade] = useState<PickList[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, startCreate] = useTransition();
  // the last title held, so the sheet keeps its content while it slides away
  const [shown, setShown] = useState(r);
  if (r && r !== shown) setShown(r);
  const lists = [...initialLists, ...made];

  const close = () => {
    setNaming(false);
    setName("");
    setError(null);
    onClose();
  };

  const createAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!r) return;
    setError(null);
    startCreate(async () => {
      const res = await createNamedList(name);
      if ("error" in res) return setError(res.error);
      setMade((m) => [...m, { ...res.list, isDefault: false }]);
      setNaming(false);
      setName("");
      onPick(r, res.list);
    });
  };

  return (
    <Sheet
      open={r !== null}
      onOpenChange={(o) => !o && close()}
      title={shown ? `Add ${shown.name} to…` : "Add to…"}
      description={alreadyYours ? "Already on your lists. Pick another to add it there too." : "Pick a list for it, instead of your default."}
      header={shown && <Poster src={shown.posterUrl} name="" kind={shown.kind} className="w-10 shrink-0 rounded-md" />}
    >
      <ul>
        {lists.map((l) => {
          const item = on[l.id];
          return (
            <li key={l.id}>
              <SheetItem
                icon={<ListBadge icon={l.icon} color={l.color} className="size-9 rounded-lg" />}
                label={l.name}
                detail={l.isDefault ? "Default · where + adds to" : undefined}
                aria-pressed={Boolean(item)}
                onClick={() => shown && onPick(shown, l)}
                trailing={
                  item === PENDING ? (
                    <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                  ) : item ? (
                    <Check className="size-5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
                  ) : (
                    <Plus className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  )
                }
              />
            </li>
          );
        })}
        <li className="mt-1 border-t pt-1">
          {naming ? (
            <form onSubmit={createAndAdd} className="flex items-center gap-2 px-2.5 py-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="New list's name"
                aria-label="New list's name"
                className="h-11 min-w-0 flex-1 rounded-xl border bg-card px-3 text-base outline-none select-text focus-visible:ring-3 focus-visible:ring-ring/40"
              />
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {creating && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Add
              </button>
            </form>
          ) : (
            <SheetItem
              icon={<Plus className="size-5 text-primary" strokeWidth={2.5} aria-hidden />}
              label="New list"
              detail="Make one and put it there"
              onClick={() => setNaming(true)}
            />
          )}
          {error && (
            <p role="alert" className="px-3 pb-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </li>
      </ul>
    </Sheet>
  );
}

// A poster that opens the title's page, with a + that puts it on your default list (a check once
// it's there; tap again to take it off). Hold the poster or the + to choose another list.
export function CatalogPoster({ result: r, adds, className }: { result: CatalogResult; adds: ReturnType<typeof useCatalogAdds>; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const press = useLongPress(() => adds.hold(r, box.current?.querySelector("[data-poster]")));
  const state = adds.stateOf(r);
  const done = typeof state === "object";
  const busy = state === "adding" || state === "removing";
  const lit = done || state === "adding"; // the check shows the moment it's tapped
  return (
    <div className={className}>
      <div ref={box} className="relative select-none" {...(adds.canHold ? press : {})}>
        <Link href={detailsHref(r)} transitionTypes={["nav-forward"]} aria-label={`${r.name}: details`} className="block transition-transform active:scale-[0.97]">
          <Poster src={r.posterUrl} name={r.name} kind={r.kind} />
        </Link>
        <button
          type="button"
          onClick={(e) => adds.toggle(r, e.currentTarget.parentElement?.querySelector("[data-poster]"))}
          disabled={busy}
          aria-label={done ? `Take ${r.name} off ${state.saved ? "your list" : adds.listName}` : `Add ${r.name} to ${adds.listName}`}
          title={adds.canHold ? "Hold or right-click to choose the list" : undefined}
          className={cn(
            "absolute right-1.5 bottom-1.5 flex size-9 items-center justify-center rounded-full shadow-lg shadow-black/50 transition-[transform,background-color] active:scale-90",
            lit ? "bg-card text-primary" : "bg-primary text-primary-foreground",
          )}
        >
          {lit ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <Plus className="size-4" strokeWidth={2.5} aria-hidden />}
        </button>
      </div>
      <span className="mt-1.5 line-clamp-2 text-xs leading-snug font-medium">{r.name}</span>
      {state === "failed" && <span className="text-xs text-destructive">Couldn&apos;t add. Try again.</span>}
      {done && !state.saved && (
        <button type="button" onClick={() => adds.toggle(r)} className="text-xs font-medium text-primary hover:underline">
          Added · Undo
        </button>
      )}
    </div>
  );
}
