import Link from "next/link";
import { ChevronRight, Plus, Settings } from "lucide-react";
import { DiscoverCard } from "@/components/discover-card";
import { Greeting } from "@/components/greeting";
import { ListRow } from "@/components/list-row";
import { Poster } from "@/components/poster";
import { Screen } from "@/components/screen";
import { TonightCard } from "@/components/tonight-card";
import { ShipBeam } from "@/components/ship-beam";
import { requireUser } from "@/lib/auth";
import { countTitles } from "@/lib/format";
import { getLists, recentItems, tonightsPick, unwatchedCount } from "@/lib/lists/queries";
import { cn } from "@/lib/utils";

// How many lists Home shows before "See all".
const HOME_LISTS = 5;

// Home: the UFO with its buttons (pick something, add something), Discover, then your lists and
// what you added last. No top bar, so the screen goes to the good stuff.
export default async function HomePage() {
  const user = await requireUser();
  const [lists, waiting, recent, tonight] = await Promise.all([
    getLists(user.id),
    unwatchedCount(user.id),
    recentItems(user.id),
    tonightsPick(user.id),
  ]);
  const firstName = user.guest ? null : user.name?.split(/\s+/)[0];

  return (
    <Screen header={false} ship={false}>
      <section
        aria-labelledby="pick-heading"
        className="animate-rise relative isolate overflow-hidden rounded-3xl border bg-card p-5 pt-28"
      >
        <Link
          href="/settings"
          transitionTypes={["nav-forward"]}
          aria-label="Settings"
          className="absolute top-2.5 right-2.5 flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Settings className="size-5" aria-hidden />
        </Link>
        {/* The ship hovers over the card with its beam lit, shining down on the words. */}
        <div className="pointer-events-none absolute top-4 left-1/2 -z-10 -translate-x-1/2">
          <ShipBeam width={230} beam={150} spread={220} beamClassName="animate-beam opacity-80" priority flight />
        </div>
        <p className="text-sm text-muted-foreground">
          <Greeting name={firstName ?? null} />
        </p>
        <h1 id="pick-heading" className="mt-1 font-brand text-3xl leading-tight font-bold tracking-tight text-balance">
          {waiting === 0 ? "Nothing to pick from yet" : "Can't decide what to watch?"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {waiting === 0
            ? "Add a few movies, series or anime you want to see. When you can't choose, the UFO will."
            : `${countTitles(waiting)} waiting. Let the UFO choose one.`}
        </p>
        <div className="mt-5 flex gap-2">
          <Link
            href={waiting === 0 ? "/add" : "/spin"}
            transitionTypes={["nav-forward"]}
            className={cn(
              "flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground",
              "shadow-[0_8px_30px_-6px] shadow-primary/40 transition-transform duration-200 ease-out active:scale-[0.98]",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            )}
          >
            {waiting === 0 ? (
              <>
                <Plus className="size-5" strokeWidth={2.5} aria-hidden /> Add titles
              </>
            ) : (
              "Pick for me"
            )}
          </Link>
          {waiting > 0 && (
            <Link
              href="/add"
              transitionTypes={["nav-forward"]}
              className="flex h-13 items-center justify-center gap-1.5 rounded-2xl border bg-background/60 px-5 text-base font-semibold transition-[transform,background-color] hover:bg-muted active:scale-[0.98]"
            >
              <Plus className="size-5" strokeWidth={2.5} aria-hidden /> Add
            </Link>
          )}
        </div>
      </section>

      {tonight && <TonightCard key={tonight.pickId} pick={tonight} className="animate-rise mt-3" style={{ animationDelay: "60ms" }} />}

      <DiscoverCard className="animate-rise mt-3" style={{ animationDelay: "90ms" }} />

      <section aria-labelledby="lists-heading" className="animate-rise mt-8" style={{ animationDelay: "120ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 id="lists-heading" className="font-brand text-xl font-bold">
            Your lists
          </h2>
          <Link
            href="/lists/new"
            transitionTypes={["nav-forward"]}
            className="-mr-2 flex h-9 items-center gap-1 rounded-xl px-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-4" aria-hidden /> New list
          </Link>
        </div>
        {/* Rows, in your order: the whole name fits, and a handful show without scrolling far. */}
        <div className="flex flex-col gap-2">
          {lists.slice(0, HOME_LISTS).map((list, i) => (
            <ListRow key={list.id} list={list} className="animate-rise" style={{ animationDelay: `${140 + i * 35}ms` }} />
          ))}
          <Link
            href="/lists"
            transitionTypes={["nav-forward"]}
            className="flex h-11 items-center justify-center gap-1 rounded-2xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {lists.length > HOME_LISTS ? `See all ${lists.length} lists` : "Arrange or edit lists"} <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="recent-heading" className="animate-rise mt-8" style={{ animationDelay: "180ms" }}>
          <h2 id="recent-heading" className="mb-3 font-brand text-xl font-bold">
            Just added
          </h2>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {recent.map((item) => (
              <Link
                key={item.itemId}
                href={`/items/${item.itemId}`}
                transitionTypes={["nav-forward"]}
                className="w-28 shrink-0 snap-start transition-transform active:scale-[0.97]"
              >
                <Poster src={item.posterUrl} name={item.name} kind={item.kind} />
                <span className="mt-1.5 line-clamp-2 text-xs leading-snug font-medium">{item.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </Screen>
  );
}
