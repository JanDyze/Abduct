import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ListBadge } from "@/components/list-icon";
import { colorValue } from "@/lib/lists/icons";
import type { ListSummary } from "@/lib/lists/queries";
import { cn } from "@/lib/utils";

// A list as a full-width row on Home: its icon on a tile of its color, the whole name (rows don't
// cut it short the way half-width cards did), what's left to watch, and its newest posters stacked
// on the right. A wash of the list's color from the left ties the row to it.
export function ListRow({ list, className, style }: { list: ListSummary; className?: string; style?: React.CSSProperties }) {
  const color = colorValue(list.color);
  const details = [
    list.isDefault && "Default",
    list.isPublic && "Public",
    list.total === 0 ? "Empty" : list.unwatched === 0 ? "All watched" : `${list.unwatched} to watch`,
  ].filter(Boolean);
  return (
    <Link
      href={`/lists/${list.id}`}
      transitionTypes={["nav-forward"]}
      style={{ backgroundImage: `linear-gradient(to right, color-mix(in oklch, ${color} 12%, transparent), transparent 55%)`, ...style }}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border bg-card p-3 pr-2.5",
        "transition-[transform,background-color,border-color] duration-200 ease-out hover:border-foreground/15 active:scale-[0.99]",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <ListBadge icon={list.icon} color={list.color} className="size-12 rounded-xl" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-brand text-base leading-tight font-bold">{list.name}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{details.join(" · ")}</span>
      </span>
      {list.posters.length > 0 && (
        <span className="flex shrink-0 items-center" aria-hidden>
          {list.posters.map((src, i) => (
            <span
              key={src}
              className="relative -ml-4 aspect-[2/3] w-9 overflow-hidden rounded-md shadow-md ring-2 shadow-black/40 ring-card first:ml-0"
              style={{ zIndex: list.posters.length - i }}
            >
              <Image src={src} alt="" fill sizes="36px" unoptimized className="object-cover" />
            </span>
          ))}
        </span>
      )}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
