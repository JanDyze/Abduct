"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CatalogPoster, useCatalogAdds } from "@/components/catalog-poster";
import { KIND_PLURAL, type Kind } from "@/lib/titles/kinds";
import type { CatalogResult } from "@/lib/titles/normalize";
import { cn } from "@/lib/utils";

// A row of catalog posters by kind (New & trending, Popular in your country), each with a + that
// puts it on your default list, and a See all at the end that opens the whole feed.
export function Trending({
  byKind,
  listName,
  seeAll,
}: {
  byKind: Partial<Record<Kind, CatalogResult[]>>;
  listName: string;
  seeAll?: Partial<Record<Kind, string>>;
}) {
  const kinds = (Object.keys(byKind) as Kind[]).filter((k) => (byKind[k]?.length ?? 0) > 0);
  const [kind, setKind] = useState<Kind | undefined>(kinds[0]);
  const adds = useCatalogAdds(listName);
  if (!kind) return null;
  const more = seeAll?.[kind];

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
        {byKind[kind]!.map((r) => (
          <li key={`${r.source}:${r.sourceId}`} className="w-28 shrink-0 snap-start">
            <CatalogPoster result={r} adds={adds} />
          </li>
        ))}
        {more && (
          <li className="w-28 shrink-0 snap-start">
            <Link
              href={more}
              transitionTypes={["nav-forward"]}
              className="flex aspect-[2/3] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium text-muted-foreground transition-[transform,background-color] hover:bg-muted hover:text-foreground active:scale-[0.97]"
            >
              <ArrowRight className="size-5" aria-hidden />
              See all
            </Link>
          </li>
        )}
      </ul>
      {adds.toast}
    </div>
  );
}
