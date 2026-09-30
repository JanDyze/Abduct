import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { CatalogGrid } from "@/components/catalog-grid";
import { Screen } from "@/components/screen";
import { ShareBest } from "@/components/share-best";
import { requireUser } from "@/lib/auth";
import { getLists } from "@/lib/lists/queries";
import { candidatesFrom, firstUrl, matchScore, yearFrom } from "@/lib/share/extract";
import { sharedLink } from "@/lib/share/resolve";
import { searchCatalog } from "@/lib/titles/catalog";
import type { CatalogResult } from "@/lib/titles/normalize";

export const metadata: Metadata = { title: "Add from a share" };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 2000) : "");

// Where a share lands (the manifest's share_target): a reel from TikTok, Facebook, Instagram or
// YouTube, or any text naming a movie. It reads the link's caption, guesses the title from it
// (lib/share/extract.ts), searches the catalogs, and offers the best match to add in one tap, with
// the other likely ones below and a search to fix a wrong guess.
export default async function SharePage({ searchParams }: PageProps<"/share">) {
  const user = await requireUser();
  const params = await searchParams;
  const title = str(params.title), text = str(params.text);
  const url = str(params.url) || firstUrl(`${text}\n${title}`);

  const [lists, shared] = await Promise.all([getLists(user.id), url ? sharedLink(url) : null]);
  const defaultList = lists.find((l) => l.isDefault) ?? lists[0];
  const pool = [title, text, shared?.caption].filter(Boolean).join("\n");
  const guesses = candidatesFrom(pool);
  const year = yearFrom(pool);

  // Each of the first few guesses searched; every hit scored by how well it matches its guess
  // (earlier guesses count for more), the year if one was named, and the catalog's own order.
  const searched = await Promise.all(guesses.slice(0, 3).map((g) => searchCatalog(g, "all").catch(() => null)));
  const scored = new Map<string, { r: CatalogResult; score: number }>();
  searched.forEach((outcome, gi) =>
    outcome?.results.slice(0, 12).forEach((r, ri) => {
      const score = matchScore(r.name, guesses[gi]) + (3 - gi) * 8 + (year && r.year === year ? 20 : 0) - ri * 1.5;
      const key = `${r.source}:${r.sourceId}`;
      if ((scored.get(key)?.score ?? -Infinity) < score) scored.set(key, { r, score });
    }),
  );
  const ranked = [...scored.values()].sort((a, b) => b.score - a.score);
  const best = ranked[0] && ranked[0].score >= 30 ? ranked[0].r : null;
  const others = ranked.filter((x) => x.r !== best).slice(0, 9).map((x) => x.r);
  const snippet = (shared?.caption ?? text ?? title).replace(/https?:\/\/\S+/g, "").trim();

  return (
    <Screen back={{ href: "/", label: "Home" }} title="From your share">
      <section className="rounded-2xl border bg-card/60 px-4 py-3 text-sm">
        <p className="text-xs text-muted-foreground">
          {shared?.site ?? "Shared"}
          {shared?.author ? ` · ${shared.author}` : ""}
        </p>
        {snippet ? <p className="mt-1 line-clamp-3 text-foreground/85">{snippet}</p> : <p className="mt-1 text-muted-foreground">No caption came with it.</p>}
      </section>

      <div className="mt-5">
        {best ? (
          <ShareBest result={best} listName={defaultList.name} />
        ) : (
          <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Couldn&apos;t tell which title this is{guesses.length ? "" : ": the post didn't say"}. Search for it below.
          </p>
        )}
      </div>

      <Link
        href={guesses[0] ? `/discover/search?${new URLSearchParams({ q: guesses[0] })}` : "/discover/search"}
        transitionTypes={["nav-forward"]}
        className="mt-4 flex h-12 items-center gap-3 rounded-2xl border border-input bg-card px-3.5 text-base text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-5 shrink-0" aria-hidden />
        {best ? "Not it? Search" : "Search"}
        {guesses[0] ? <span className="truncate text-foreground">“{guesses[0]}”</span> : null}
      </Link>

      {others.length > 0 && (
        <section aria-labelledby="others-heading" className="mt-8">
          <h2 id="others-heading" className="mb-3 font-brand text-lg font-bold">
            {best ? "Or maybe" : "Could be"}
          </h2>
          <CatalogGrid results={others} listName={defaultList.name} />
        </section>
      )}
    </Screen>
  );
}
