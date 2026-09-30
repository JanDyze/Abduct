"use client";

import Link from "next/link";
import { CatalogPoster, useCatalogAdds } from "@/components/catalog-poster";
import { KIND_LABEL } from "@/lib/titles/kinds";
import type { CatalogResult } from "@/lib/titles/normalize";

const detailsHref = (r: CatalogResult) => `/titles/open?${new URLSearchParams({ source: r.source, id: r.sourceId })}`;

// The share page's best guess, big: its poster with the usual +, what it is, and a way to open it
// (to put it on another list, or see where to watch it).
export function ShareBest({ result: r, listName }: { result: CatalogResult; listName: string }) {
  const adds = useCatalogAdds(listName);
  return (
    <div className="flex gap-4 rounded-3xl border bg-card p-4">
      <CatalogPoster result={r} adds={adds} className="w-32 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">Looks like</p>
        <h2 className="mt-1 font-brand text-2xl leading-tight font-bold text-balance">{r.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {KIND_LABEL[r.kind]}
          {r.year ? ` · ${r.year}` : ""}
        </p>
        {r.overview && <p className="mt-2 line-clamp-3 text-sm text-foreground/80">{r.overview}</p>}
        <Link href={detailsHref(r)} transitionTypes={["nav-forward"]} className="mt-3 inline-flex h-10 items-center rounded-xl border px-4 text-sm font-medium hover:bg-muted">
          Open it
        </Link>
      </div>
      {adds.toast}
    </div>
  );
}
