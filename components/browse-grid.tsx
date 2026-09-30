"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { browseMore } from "@/app/discover/actions";
import { CatalogPoster, useCatalogAdds } from "@/components/catalog-poster";
import type { Feed } from "@/lib/titles/genres";
import type { Kind } from "@/lib/titles/kinds";
import type { CatalogResult } from "@/lib/titles/normalize";

const keyOf = (r: CatalogResult) => `${r.source}:${r.sourceId}`;

// A See all page's posters, three across. More load as you near the bottom (or with the button,
// if that doesn't happen), until the feed runs out.
export function BrowseGrid({
  kind,
  feed,
  genre,
  topic,
  initial,
  hasMore: initialHasMore,
  listName,
}: {
  kind: Kind;
  feed: Feed;
  genre?: string;
  topic?: number;
  initial: CatalogResult[];
  hasMore: boolean;
  listName: string;
}) {
  const [results, setResults] = useState(initial);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [failed, setFailed] = useState(false);
  const [loading, start] = useTransition();
  const adds = useCatalogAdds(listName);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = () => {
    if (loading || !hasMore) return;
    start(async () => {
      const next = await browseMore(kind, feed, genre, topic, page + 1);
      setFailed(Boolean(next.failed));
      if (next.failed) return;
      setPage(page + 1);
      setHasMore(next.hasMore);
      // Popularity shifts between pages, so a title can come round twice.
      setResults((rs) => {
        const seen = new Set(rs.map(keyOf));
        return [...rs, ...next.results.filter((r) => !seen.has(keyOf(r)))];
      });
    });
  };

  // Nearing the bottom loads the next page (not after a failure: that waits for the button).
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || failed) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  });

  if (results.length === 0) {
    return <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">Nothing here right now. Try another genre.</p>;
  }

  return (
    <>
      <ul className="grid grid-cols-3 gap-x-3 gap-y-4">
        {results.map((r) => (
          <li key={keyOf(r)}>
            <CatalogPoster result={r} adds={adds} />
          </li>
        ))}
      </ul>
      <div ref={sentinel} className="mt-6 flex flex-col items-center gap-2">
        {failed && <p className="text-sm text-destructive">Couldn&apos;t load more.</p>}
        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="flex h-11 items-center gap-2 rounded-xl border bg-card px-5 text-sm font-medium transition-colors hover:bg-muted"
          >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {failed ? "Try again" : loading ? "Loading" : "Load more"}
          </button>
        )}
      </div>
      {adds.toast}
    </>
  );
}
