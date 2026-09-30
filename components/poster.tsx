import Image from "next/image";
import { Film, Sparkles, Tv } from "lucide-react";
import type { Kind } from "@/lib/titles/kinds";
import { cn } from "@/lib/utils";

export const KIND_ICON = { movie: Film, series: Tv, anime: Sparkles } satisfies Record<Kind, unknown>;

// A title's poster at 2:3, or, without one (typed in by hand, or the catalog has none), its name
// on a dark card with the kind's icon. Posters come straight from TMDB's and AniList's CDNs,
// already sized, so they skip Next's image optimizer.
export function Poster({
  src,
  name,
  kind,
  className,
  priority,
}: {
  src: string | null;
  name: string;
  kind: Kind;
  className?: string;
  priority?: boolean;
}) {
  const Icon = KIND_ICON[kind];
  return (
    <div className={cn("relative aspect-[2/3] overflow-hidden rounded-xl bg-muted ring-1 ring-border", className)}>
      {src ? (
        <Image src={src} alt="" fill sizes="200px" unoptimized priority={priority} className="object-cover" />
      ) : (
        <div className="flex size-full flex-col justify-between bg-gradient-to-b from-accent to-muted p-3">
          <Icon className="size-5 text-beam" aria-hidden />
          <span className="line-clamp-4 font-brand text-sm leading-tight font-semibold text-hull">{name}</span>
        </div>
      )}
    </div>
  );
}
