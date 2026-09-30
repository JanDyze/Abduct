"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Bone, PosterGridSkeleton } from "@/components/skeleton-bits";
import { cn } from "@/lib/utils";

export type BrowseLink = { key: string; label: string; href: string; active: boolean };

const chip = (active: boolean) =>
  cn(
    "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
    active ? "border-primary/50 bg-primary/15 text-primary" : "bg-card text-muted-foreground hover:text-foreground",
  );

// See all's kind tabs and feed chips, around its posters. A tap lights its tab or chip at once and
// the posters give way to a shimmering grid while the server fetches the new feed, instead of the
// page sitting still until it arrives.
export function BrowseShell({ kinds, chips, children }: { kinds: BrowseLink[]; chips: BrowseLink[]; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<string | null>(null);
  const going = pending ? target : null; // where a tap is taking us, while it's on its way
  const isActive = (l: BrowseLink) => (going ? l.href === going : l.active);
  const go = (href: string) => {
    setTarget(href);
    start(() => router.replace(href, { scroll: false }));
  };

  return (
    <>
      <nav aria-label="Kind" className="flex gap-1 rounded-xl bg-muted p-1">
        {kinds.map((k) => (
          <button
            key={k.key}
            type="button"
            aria-pressed={isActive(k)}
            onClick={() => go(k.href)}
            className={cn(
              "flex h-8 flex-1 items-center justify-center rounded-lg text-sm font-medium transition-colors",
              isActive(k) ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {k.label}
          </button>
        ))}
      </nav>
      <nav aria-label="Browse" className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {chips.map((c) => (
          <button key={c.key} type="button" aria-pressed={isActive(c)} onClick={() => go(c.href)} className={chip(isActive(c))}>
            {c.label}
          </button>
        ))}
      </nav>
      {going ? (
        <div className="mt-4" aria-busy="true">
          <Bone className="mb-3 h-4 w-2/3 rounded-md" />
          <PosterGridSkeleton />
        </div>
      ) : (
        children
      )}
    </>
  );
}
