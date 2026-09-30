import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { ListBadge, ListIcon } from "@/components/list-icon";
import { colorValue } from "@/lib/lists/icons";
import type { PublicListCard as Card } from "@/lib/social/discover";
import { cn } from "@/lib/utils";

// Someone's public list in Discover: its posters fanned, its icon and name, whose it is, and likes.
export function PublicListCard({ list, className }: { list: Card; className?: string }) {
  return (
    <Link
      href={`/discover/lists/${list.id}`}
      transitionTypes={["nav-forward"]}
      style={{ borderTopColor: colorValue(list.color) }}
      className={cn(
        "flex w-44 shrink-0 snap-start flex-col gap-3 rounded-2xl border border-t-2 bg-card p-3.5 transition-[transform,background-color] hover:bg-muted/60 active:scale-[0.98]",
        className,
      )}
    >
      <div className="relative flex h-24 items-end justify-center">
        {list.posters.length === 0 ? (
          <ListBadge icon={list.icon} color={list.color} className="size-20 rounded-2xl" />
        ) : (
          list.posters.map((src, i, all) => {
            const offset = i - (all.length - 1) / 2;
            return (
              <div
                key={src}
                className="absolute bottom-0 aspect-[2/3] h-24 overflow-hidden rounded-lg shadow-lg ring-1 shadow-black/50 ring-border"
                style={{ zIndex: all.length - Math.abs(offset) * 2, transform: `translateX(${offset * 38}%) rotate(${offset * 8}deg)` }}
              >
                <Image src={src} alt="" fill sizes="64px" unoptimized className="object-cover" />
              </div>
            );
          })
        )}
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <ListIcon icon={list.icon} color={list.color} className="size-7" />
        <div className="min-w-0">
          <span className="block truncate font-brand text-base leading-tight font-bold">{list.name}</span>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <span className="truncate">by {list.owner}</span>
            <span aria-hidden>·</span>
            <Heart className="size-3 shrink-0" aria-hidden />
            <span className="tabular-nums">{list.likes}</span>
            <span className="sr-only">likes</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
