"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Bone, PosterGridSkeleton } from "@/components/skeleton-bits";

const hrefFor = (q: string) => (q ? `/discover/search?${new URLSearchParams({ q })}` : "/discover/search");

// Discover's search field, over its results (children). The results are the page itself
// (/discover/search?q=...), so typing updates the address after a pause, and Back or a shared link
// shows the same search. While a search is on its way, the results give way to a shimmering grid.
export function DiscoverSearchBox({ initial, children }: { initial: string; children: React.ReactNode }) {
  const router = useRouter();
  const [query, setQuery] = useState(initial);
  const [searching, start] = useTransition();

  useEffect(() => {
    const q = query.trim();
    if (q === initial.trim() || (q.length === 1 && !initial)) return;
    const timer = setTimeout(() => start(() => router.replace(hrefFor(q), { scroll: false })), 400);
    return () => clearTimeout(timer);
  }, [query, initial, router]);

  return (
    <>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          start(() => router.replace(hrefFor(query.trim()), { scroll: false }));
        }}
        className="sticky top-[calc(var(--header-offset)+env(safe-area-inset-top))] z-20 -mx-4 bg-background/90 px-4 pt-1 pb-3 backdrop-blur-md transition-[top] duration-300"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Titles, genres, topics like Christian"
            aria-label="Search Discover"
            autoFocus
            enterKeyHint="search"
            maxLength={300}
            className="h-12 w-full rounded-2xl border border-input bg-card pr-10 pl-11 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          />
          {searching && <Loader2 className="absolute top-1/2 right-3.5 size-5 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />}
        </div>
      </form>
      {searching ? (
        <div className="mt-2" aria-busy="true">
          <Bone className="mb-3 h-5 w-40 rounded-lg" />
          <PosterGridSkeleton count={6} />
        </div>
      ) : (
        children
      )}
    </>
  );
}
