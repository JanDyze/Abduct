import Image from "next/image";
import Link from "next/link";
import { ListBadge, ListIcon } from "@/components/list-icon";
import { colorValue } from "@/lib/lists/icons";
import type { ListSummary } from "@/lib/lists/queries";
import { cn } from "@/lib/utils";

// A list on Home and in My lists: its newest posters fanned like a hand of cards (or its icon when
// it's empty), its icon and color by the name, and how much is left to watch.
export function ListCard({ list, className, style }: { list: ListSummary; className?: string; style?: React.CSSProperties }) {
  return (
    <Link
      href={`/lists/${list.id}`}
      transitionTypes={["nav-forward"]}
      style={{ borderTopColor: colorValue(list.color), ...style }}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border border-t-2 bg-card p-3.5",
        "transition-[transform,background-color,border-color] duration-200 ease-out hover:border-foreground/15 hover:bg-muted/60 active:scale-[0.98]",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
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
                className="absolute bottom-0 aspect-[2/3] h-24 overflow-hidden rounded-lg shadow-lg ring-1 shadow-black/50 ring-border transition-transform duration-300 ease-out"
                style={{
                  zIndex: all.length - Math.abs(offset) * 2,
                  transform: `translateX(${offset * 38}%) rotate(${offset * 8}deg)`,
                }}
              >
                <Image src={src} alt="" fill sizes="64px" unoptimized className="object-cover" />
              </div>
            );
          })
        )}
      </div>
      <div className="flex min-w-0 items-center gap-2">
        {list.posters.length > 0 && <ListIcon icon={list.icon} color={list.color} className="size-7" />}
        <div className="min-w-0">
          <span className="block truncate font-brand text-base leading-tight font-bold">{list.name}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {list.isDefault && "Default · "}
            {list.isPublic && "Public · "}
            {list.total === 0 ? "Empty" : list.unwatched === 0 ? "All watched" : `${list.unwatched} to watch`}
          </span>
        </div>
      </div>
    </Link>
  );
}
