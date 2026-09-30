import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Radar } from "lucide-react";
import { Poster } from "@/components/poster";
import { trending } from "@/lib/titles/catalog";
import type { CatalogResult } from "@/lib/titles/normalize";
import { cn } from "@/lib/utils";

// Where each poster sits in the fan (left, middle, right), and where it goes when you engage the
// card: the beam lifts them up and apart, like it's pulling them in.
const SLOTS = [
  "-translate-x-[62%] rotate-[-11deg] group-engaged:-translate-x-[80%] group-engaged:-translate-y-2.5 group-engaged:rotate-[-15deg]",
  "z-10 -translate-y-1.5 group-engaged:-translate-y-4",
  "translate-x-[62%] rotate-[11deg] group-engaged:translate-x-[80%] group-engaged:-translate-y-2.5 group-engaged:rotate-[15deg]",
];
const SLOT = cn(
  "absolute bottom-0 left-1/2 -ml-8 w-16 origin-bottom rounded-lg shadow-[0_10px_24px_-6px] shadow-black/70",
  "transition-[translate,rotate] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
);

// Home's way into Discover: three titles trending right now (a series, a movie, an anime) caught
// in the UFO's beam, so you can see there's something new before you tap.
export function DiscoverCard({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <Link
      href="/discover"
      transitionTypes={["nav-forward"]}
      style={style}
      className={cn(
        "group relative isolate flex min-h-30 items-center overflow-hidden rounded-2xl border bg-card p-4 pr-40",
        "transition-[transform,border-color] duration-200 ease-out hover:border-foreground/15 active:scale-[0.99]",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-brand text-lg leading-tight font-bold">
          <Radar className="size-4.5 shrink-0 text-primary" strokeWidth={2.25} aria-hidden />
          Discover
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-engaged:translate-x-0.5" aria-hidden />
        </span>
        <span className="mt-1 block text-sm leading-snug text-pretty text-muted-foreground">
          What&apos;s trending, loved, and lists people share
        </span>
      </span>

      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-4 w-36">
        {/* The beam comes down from the card's top edge onto the posters, brighter while engaged. */}
        <span
          className="beam absolute top-0 left-1/2 h-full w-32 -translate-x-1/2 opacity-30 group-engaged:opacity-55"
          style={{ clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0 100%)" }}
        />
        <span className="absolute inset-x-0 -bottom-6 h-28">
          <Suspense fallback={<Slots />}>
            <TrendingPosters />
          </Suspense>
        </span>
      </span>
    </Link>
  );
}

// One trending title from each kind, topped up from the others when a catalog is off or has no
// posters. Trending is cached for an hour, and Home streams in before it answers.
async function TrendingPosters() {
  const [movies, series, anime] = await Promise.all([trending("movie"), trending("series"), trending("anime")]);
  // Series on the left, the top movie in the middle, anime on the right.
  const pools = [series, movies, anime].map((rs) => rs.filter((r) => r.posterUrl));
  const picks = pools.map((p) => p.shift()).filter((r): r is CatalogResult => !!r);
  const rest = pools.flat();
  while (picks.length < 3 && rest.length > 0) picks.push(rest.shift()!);
  return <Slots titles={picks} />;
}

// The fan, with blank cards where there's no poster (still loading, or nothing came back).
function Slots({ titles = [] }: { titles?: CatalogResult[] }) {
  return SLOTS.map((slot, i) => {
    const t = titles[i];
    return t ? (
      <Poster key={i} src={t.posterUrl} name={t.name} kind={t.kind} className={cn(SLOT, slot)} />
    ) : (
      <span key={i} className={cn(SLOT, slot, "aspect-[2/3] bg-muted ring-1 ring-border")} />
    );
  });
}
