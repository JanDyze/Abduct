"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, Plus, Search } from "lucide-react";
import { addCatalogTitle, searchTitles, undoAdd } from "@/app/add/actions";
import { ListIcon } from "@/components/list-icon";
import { Poster } from "@/components/poster";
import { Picker } from "@/components/ui/picker";
import { useUndoToast } from "@/components/undo-toast";
import type { ListOption } from "@/lib/lists/icons";
import type { SearchOutcome } from "@/lib/titles/catalog";
import { KIND_LABEL, KIND_PLURAL, KINDS, type Kind } from "@/lib/titles/kinds";
import type { CatalogResult } from "@/lib/titles/normalize";
import { cn } from "@/lib/utils";

// While adding or taking back; then the list item it made (or found), or what went wrong.
type AddState = "adding" | "removing" | { itemId: string; already: boolean } | { error: string };

const TABS = ["all", ...KINDS] as const;
const keyOf = (r: CatalogResult) => `${r.source}:${r.sourceId}`;

// A search hit's details page; its Add button then adds to the list chosen here.
const detailsHref = (r: CatalogResult, listId: string) =>
  `/titles/open?${new URLSearchParams({ source: r.source, id: r.sourceId, list: listId, from: "add" })}`;

// Search movies, series and anime and add them to a list with one tap. Searching waits for a
// pause in typing, and an older answer arriving late never replaces a newer one.
export function TitleSearch({ lists, initialList }: { lists: ListOption[]; initialList: string }) {
  const [listId, setListId] = useState(initialList);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind | "all">("all");
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const [added, setAdded] = useState<Record<string, AddState>>({});
  const [searching, startSearch] = useTransition();
  const latest = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      latest.current++;
      return;
    }
    const ticket = ++latest.current;
    const timer = setTimeout(() => {
      startSearch(async () => {
        const result = await searchTitles(q, kind);
        if (ticket === latest.current) setOutcome(result);
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [query, kind]);

  // What was added is per list: switching lists shows every result as addable again.
  const changeList = (id: string) => {
    setListId(id);
    setAdded({});
  };

  const toast = useUndoToast();

  const add = async (r: CatalogResult) => {
    const key = keyOf(r);
    setAdded((a) => ({ ...a, [key]: "adding" }));
    const res = await addCatalogTitle(listId, r.source, r.sourceId);
    setAdded((a) => ({ ...a, [key]: res.ok ? { itemId: res.itemId, already: res.already } : { error: res.error } }));
    if (res.ok && !res.already) toast.show(`Added ${r.name} to ${list?.name}`, () => undo(r, res.itemId));
  };

  // Added by mistake: tapping the check (or Undo) takes it off the list again.
  const undo = async (r: CatalogResult, itemId: string) => {
    const key = keyOf(r);
    toast.hide();
    setAdded((a) => ({ ...a, [key]: "removing" }));
    const res = await undoAdd(itemId);
    setAdded((a) => {
      const next = { ...a };
      if (res.error) next[key] = { error: res.error };
      else delete next[key];
      return next;
    });
  };

  const list = lists.find((l) => l.id === listId);
  const short = query.trim().length < 2;
  const results = short ? [] : (outcome?.results ?? []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card py-2 pr-2 pl-4">
        <span className="shrink-0 text-sm text-muted-foreground">Adding to</span>
        <Picker
          label="List to add to"
          value={listId}
          onChange={changeList}
          options={lists.map((l) => ({ value: l.id, label: l.name, icon: <ListIcon icon={l.icon} color={l.color} className="size-6" /> }))}
          className="h-11 max-w-[65%] border-transparent bg-muted/60 font-brand text-base font-bold"
        />
      </div>

      <div className="sticky top-[calc(var(--header-offset)+env(safe-area-inset-top))] z-20 -mx-4 flex flex-col gap-3 bg-background/90 px-4 pt-1 pb-3 backdrop-blur-md transition-[top] duration-300">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, series, anime"
            aria-label="Search titles"
            autoFocus
            enterKeyHint="search"
            className="h-12 w-full rounded-2xl border border-input bg-card pr-10 pl-11 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          />
          {searching && <Loader2 className="absolute top-1/2 right-3.5 size-5 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />}
        </div>
        <div role="tablist" aria-label="Kind" className="flex gap-1 rounded-xl bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={kind === t}
              onClick={() => setKind(t)}
              className={cn(
                "h-8 flex-1 rounded-lg text-sm font-medium transition-colors",
                kind === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "all" ? "All" : KIND_PLURAL[t]}
            </button>
          ))}
        </div>
      </div>

      {!short && (outcome?.tmdbOff || outcome?.unavailable.includes("tmdb")) && kind !== "anime" && (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          {outcome.tmdbOff ? "Movie and series search isn't switched on yet" : "Movie and series search isn't answering right now"}
          {kind === "all" ? ", so only anime shows up. " : ". "}
          <Link href={`/add/manual?list=${listId}`} className="font-medium text-primary underline-offset-4 hover:underline">
            Add one by hand
          </Link>
          .
        </p>
      )}
      {!short && outcome?.unavailable.includes("anilist") && kind !== "movie" && kind !== "series" && (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">Anime search isn&apos;t answering right now. Try again in a moment.</p>
      )}

      {short ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Type a title to find it.</p>
      ) : results.length === 0 && !searching && outcome ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nothing found for “{query.trim()}”.</p>
      ) : (
        <ul className={cn("flex flex-col gap-1 transition-opacity", searching && "opacity-60")}>
          {results.map((r) => {
            const state = added[keyOf(r)];
            const done = typeof state === "object" && "itemId" in state;
            return (
              <li key={keyOf(r)} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-muted/50">
                {/* Poster and name open the title's details (story, genres, what people say). */}
                <Link href={detailsHref(r, listId)} transitionTypes={["nav-forward"]} className="shrink-0" tabIndex={-1} aria-hidden>
                  <Poster src={r.posterUrl} name={r.name} kind={r.kind} className="w-14 rounded-lg" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={detailsHref(r, listId)} transitionTypes={["nav-forward"]} className="line-clamp-2 leading-tight font-semibold hover:underline">
                    {r.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {KIND_LABEL[r.kind]}
                    {r.year ? ` · ${r.year}` : ""}
                  </p>
                  {typeof state === "object" && "error" in state && <p className="mt-0.5 text-xs text-destructive">{state.error}</p>}
                  {done && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {state.already ? "Already on" : "Added to"} {list?.name} ·{" "}
                      <button type="button" onClick={() => undo(r, state.itemId)} className="font-medium text-primary hover:underline">
                        {state.already ? "Take off" : "Undo"}
                      </button>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => (done ? undo(r, state.itemId) : add(r))}
                  disabled={state === "adding" || state === "removing"}
                  aria-label={done ? `Take ${r.name} off ${list?.name}` : `Add ${r.name} to ${list?.name}`}
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl transition-[transform,background-color] active:scale-90",
                    done ? "bg-primary/15 text-primary" : "bg-primary text-primary-foreground",
                  )}
                >
                  {state === "adding" || state === "removing" ? (
                    <Loader2 className="size-5 animate-spin" aria-hidden />
                  ) : done ? (
                    <Check className="size-5" strokeWidth={3} aria-hidden />
                  ) : (
                    <Plus className="size-5" strokeWidth={2.5} aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href={`/add/manual?list=${listId}`}
        transitionTypes={["nav-forward"]}
        className="mt-2 text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Can&apos;t find it? Add it by hand
      </Link>
      {toast.node}
    </div>
  );
}
