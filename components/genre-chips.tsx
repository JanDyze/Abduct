"use client";

import { useState } from "react";
import Link from "next/link";
import { browseHref, GENRES, TOPIC_CHIPS } from "@/lib/titles/genres";
import { KIND_PLURAL, KINDS, type Kind } from "@/lib/titles/kinds";
import { cn } from "@/lib/utils";

// Discover's Browse by genre: pick movies, series or anime, then a genre (or a topic TMDB has no
// genre for, like Christian) to see all of it.
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
        {[
          ...TOPIC_CHIPS.filter((t) => t.byKind[kind]).map((t) => ({ key: t.name, name: t.name, href: browseHref(kind, "topic", t.byKind[kind]) })),
          ...GENRES[kind].map((g) => ({ key: g.id, name: g.name, href: browseHref(kind, "genre", g.id) })),
        ].map((g) => (
          <li key={g.key}>
            <Link
              href={g.href}
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
