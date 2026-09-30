"use client";

import { useState } from "react";
import Link from "next/link";
import { browseHref, GENRES } from "@/lib/titles/genres";
import { KIND_PLURAL, KINDS, type Kind } from "@/lib/titles/kinds";
import { cn } from "@/lib/utils";

// Discover's Browse by genre: pick movies, series or anime, then a genre to see all of it.
export function GenreChips() {
  const [kind, setKind] = useState<Kind>("movie");
  return (
    <div>
      <div role="tablist" aria-label="Kind" className="mb-3 flex gap-1 rounded-xl bg-muted p-1">
        {KINDS.map((k) => (
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
      <ul className="flex flex-wrap gap-2">
        {GENRES[kind].map((g) => (
          <li key={g.id}>
            <Link
              href={browseHref(kind, "genre", g.id)}
              transitionTypes={["nav-forward"]}
              className="flex h-9 items-center rounded-full border bg-card px-3.5 text-sm font-medium text-muted-foreground transition-[transform,color,background-color] hover:bg-muted hover:text-foreground active:scale-95"
            >
              {g.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
