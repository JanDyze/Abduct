"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, Plus } from "lucide-react";
import { addTrendingTitle, undoAdd } from "@/app/add/actions";
import { Poster } from "@/components/poster";
import { useUndoToast } from "@/components/undo-toast";
import type { CatalogResult } from "@/lib/titles/normalize";
import { cn } from "@/lib/utils";

// A catalog title's details page (story, genres, where to watch, and Add to any of your lists).
const detailsHref = (r: CatalogResult) => `/titles/open?${new URLSearchParams({ source: r.source, id: r.sourceId })}`;
const keyOf = (r: CatalogResult) => `${r.source}:${r.sourceId}`;

type AddState = "adding" | "removing" | "failed" | { itemId: string };

// Adding catalog titles to your default list from a row or grid of posters, with Undo. One per
// row or grid: it owns the undo toast (render `toast`).
export function useCatalogAdds(listName: string) {
  const [added, setAdded] = useState<Record<string, AddState>>({});
  const toast = useUndoToast();

  // Added by mistake: tapping the check (or Undo) takes it off your list again.
  const undo = async (r: CatalogResult, itemId: string) => {
    toast.hide();
    setAdded((a) => ({ ...a, [keyOf(r)]: "removing" }));
    const res = await undoAdd(itemId);
    setAdded((a) => {
      const next = { ...a };
      if (res.error) next[keyOf(r)] = { itemId };
      else delete next[keyOf(r)];
      return next;
    });
  };

  const toggle = async (r: CatalogResult) => {
    const state = added[keyOf(r)];
    if (typeof state === "object") return undo(r, state.itemId);
    setAdded((a) => ({ ...a, [keyOf(r)]: "adding" }));
    const res = await addTrendingTitle(r.source, r.sourceId);
    setAdded((a) => ({ ...a, [keyOf(r)]: res.ok ? { itemId: res.itemId } : "failed" }));
    if (res.ok && !res.already) toast.show(`Added ${r.name} to ${listName}`, () => undo(r, res.itemId));
  };

  return { stateOf: (r: CatalogResult) => added[keyOf(r)], toggle, toast: toast.node, listName };
}

// A poster that opens the title's page, with a + that puts it on your default list (a check once
// it's there; tap again to take it off).
export function CatalogPoster({ result: r, adds, className }: { result: CatalogResult; adds: ReturnType<typeof useCatalogAdds>; className?: string }) {
  const state = adds.stateOf(r);
  const done = typeof state === "object";
  const busy = state === "adding" || state === "removing";
  return (
    <div className={className}>
      <div className="relative">
        <Link href={detailsHref(r)} transitionTypes={["nav-forward"]} aria-label={`${r.name}: details`} className="block transition-transform active:scale-[0.97]">
          <Poster src={r.posterUrl} name={r.name} kind={r.kind} />
        </Link>
        <button
          type="button"
          onClick={() => adds.toggle(r)}
          disabled={busy}
          aria-label={done ? `Take ${r.name} off ${adds.listName}` : `Add ${r.name} to ${adds.listName}`}
          className={cn(
            "absolute right-1.5 bottom-1.5 flex size-9 items-center justify-center rounded-full shadow-lg shadow-black/50 transition-[transform,background-color] active:scale-90",
            done ? "bg-card text-primary" : "bg-primary text-primary-foreground",
          )}
        >
          {busy ? (
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
        <button type="button" onClick={() => adds.toggle(r)} className="text-xs font-medium text-primary hover:underline">
          Added · Undo
        </button>
      )}
    </div>
  );
}
