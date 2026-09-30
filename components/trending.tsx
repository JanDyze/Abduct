"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, Plus } from "lucide-react";
import { addTrendingTitle, undoAdd } from "@/app/add/actions";
import { Poster } from "@/components/poster";
import { useUndoToast } from "@/components/undo-toast";
import { KIND_PLURAL, type Kind } from "@/lib/titles/kinds";
import type { CatalogResult } from "@/lib/titles/normalize";
import { cn } from "@/lib/utils";

// A trending title's details page (story, genres, what people say, and Add).
const detailsHref = (r: CatalogResult) => `/titles/open?${new URLSearchParams({ source: r.source, id: r.sourceId })}`;

type AddState = "adding" | "removing" | "failed" | { itemId: string };

// New & trending, by kind: a row of posters, each with a + that puts it on your default list.
export function Trending({ byKind, listName }: { byKind: Partial<Record<Kind, CatalogResult[]>>; listName: string }) {
  const kinds = (Object.keys(byKind) as Kind[]).filter((k) => (byKind[k]?.length ?? 0) > 0);
  const [kind, setKind] = useState<Kind | undefined>(kinds[0]);
  const [added, setAdded] = useState<Record<string, AddState>>({});
  const toast = useUndoToast();
  if (!kind) return null;

  const add = async (r: CatalogResult) => {
    const key = `${r.source}:${r.sourceId}`;
    setAdded((a) => ({ ...a, [key]: "adding" }));
    const res = await addTrendingTitle(r.source, r.sourceId);
    setAdded((a) => ({ ...a, [key]: res.ok ? { itemId: res.itemId } : "failed" }));
    if (res.ok && !res.already) toast.show(`Added ${r.name} to ${listName}`, () => undo(r, res.itemId));
  };

  // Added by mistake: tapping the check (or Undo) takes it off your list again.
  const undo = async (r: CatalogResult, itemId: string) => {
    const key = `${r.source}:${r.sourceId}`;
    toast.hide();
    setAdded((a) => ({ ...a, [key]: "removing" }));
    const res = await undoAdd(itemId);
    setAdded((a) => {
      const next = { ...a };
      if (res.error) next[key] = { itemId };
      else delete next[key];
      return next;
    });
  };

  return (
    <div>
      {kinds.length > 1 && (
        <div role="tablist" aria-label="Kind" className="mb-3 flex gap-1 rounded-xl bg-muted p-1">
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "h-8 flex-1 rounded-lg text-sm font-medium transition-colors",
                kind === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {KIND_PLURAL[k]}
            </button>
          ))}
        </div>
      )}
      <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {byKind[kind]!.map((r) => {
          const state = added[`${r.source}:${r.sourceId}`];
          const done = typeof state === "object";
          return (
            <li key={`${r.source}:${r.sourceId}`} className="w-28 shrink-0 snap-start">
              <div className="relative">
                <Link href={detailsHref(r)} transitionTypes={["nav-forward"]} aria-label={`${r.name}: details`} className="block transition-transform active:scale-[0.97]">
                  <Poster src={r.posterUrl} name={r.name} kind={r.kind} />
                </Link>
                <button
                  type="button"
                  onClick={() => (done ? undo(r, state.itemId) : add(r))}
                  disabled={state === "adding" || state === "removing"}
                  aria-label={done ? `Take ${r.name} off ${listName}` : `Add ${r.name} to ${listName}`}
                  className={cn(
                    "absolute right-1.5 bottom-1.5 flex size-9 items-center justify-center rounded-full shadow-lg shadow-black/50 transition-[transform,background-color] active:scale-90",
                    done ? "bg-card text-primary" : "bg-primary text-primary-foreground",
                  )}
                >
                  {state === "adding" || state === "removing" ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : done ? (
                    <Check className="size-4" strokeWidth={3} aria-hidden />
                  ) : (
                    <Plus className="size-4" strokeWidth={2.5} aria-hidden />
                  )}
                </button>
              </div>
              <span className="mt-1.5 line-clamp-2 text-xs leading-snug font-medium">{r.name}</span>
              {state === "failed" && <span className="text-xs text-destructive">Couldn&apos;t add. Try again.</span>}
              {done && (
                <button type="button" onClick={() => undo(r, state.itemId)} className="text-xs font-medium text-primary hover:underline">
                  Added · Undo
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {toast.node}
    </div>
  );
}
