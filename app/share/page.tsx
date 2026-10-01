import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { CatalogGrid } from "@/components/catalog-grid";
import { SavedTitles } from "@/components/catalog-poster";
import { Screen } from "@/components/screen";
import { ShareBest } from "@/components/share-best";
import { SharedMedia } from "@/components/shared-media";
import { requireUser } from "@/lib/auth";
import { getLists, savedTitles } from "@/lib/lists/queries";
import { candidatesFrom, firstUrl, matchScore, yearFrom } from "@/lib/share/extract";
import { identifyTitle } from "@/lib/share/identify";
import { sharedLink } from "@/lib/share/resolve";
import { searchCatalog } from "@/lib/titles/catalog";
import type { CatalogResult } from "@/lib/titles/normalize";

export const metadata: Metadata = { title: "Add from a share" };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 2000) : "");

// Where a share lands (the manifest's share_target): a reel from TikTok, Facebook, Instagram or
// YouTube, or any text naming a movie. It reads the link's caption (and what's said in a shared
// video), asks Claude which title it is (lib/share/identify.ts) alongside its own word-pattern
// guesses (lib/share/extract.ts), searches the catalogs, and offers the best match to add in one
// tap, with the other likely ones below and a search to fix a wrong guess.
export default async function SharePage({ searchParams }: PageProps<"/share">) {
  const user = await requireUser();
  const params = await searchParams;
  const title = str(params.title), text = str(params.text);
  const transcript = str(params.transcript).replace(/^-$/, "");
  const media = str(params.media);
  const canListen = Boolean(process.env.ASSEMBLYAI_API_KEY);
  const url = str(params.url) || firstUrl(`${text}\n${title}`);

  const [lists, saved, shared] = await Promise.all([getLists(user.id), savedTitles(user.id), url ? sharedLink(url) : null]);
  const defaultList = lists.find((l) => l.isDefault) ?? lists[0];
  // What was said in the clip first (a narrator naming the movie beats a caption's hashtags), but
  // only titles it names: someone talking is never searched as if it were a title.
  const captionText = [title, text, shared?.caption].filter(Boolean).join("\n");
  const guesses = [...new Set([...(transcript ? candidatesFrom(transcript, 5, { firstLine: false }) : []), ...candidatesFrom(captionText)])].slice(0, 5);
  const year = yearFrom([transcript, captionText].join("\n"));

  // Each of the first few guesses searched; every hit scored by how well it matches its guess
  // (earlier guesses count for more), the year if one was named, and the catalog's own order.
  // Claude's picks are searched in their own catalog (anime on AniList) and count for more,
  // by how sure it is: it recognises clips that never say their title.
  const waiting = media === "1" && canListen;
  const [searched, identified] = waiting
    ? [[], null]
    : await Promise.all([
        Promise.all(guesses.slice(0, 4).map((g) => searchCatalog(g, "all").catch(() => null))),
        identifyTitle({ caption: shared?.caption, transcript, text: [title, text].filter(Boolean).join("\n"), site: shared?.site }),
      ]);
  const claude = identified ?? [];
  const claudeSearched = await Promise.all(claude.map((t) => searchCatalog(t.name, t.kind).catch(() => null)));
  const scored = new Map<string, { r: CatalogResult; score: number; why?: string }>();
  const keep = (r: CatalogResult, score: number, why?: string) => {
    const key = `${r.source}:${r.sourceId}`;
    if ((scored.get(key)?.score ?? -Infinity) < score) scored.set(key, { r, score, why });
  };
  searched.forEach((outcome, gi) =>
    outcome?.results.slice(0, 12).forEach((r, ri) => keep(r, matchScore(r.name, guesses[gi]) + (4 - gi) * 8 + (year && r.year === year ? 20 : 0) - ri * 1.5)),
  );
  const SURE = { high: 90, medium: 60, low: 30 };
  claudeSearched.forEach((outcome, ti) => {
    const t = claude[ti];
    outcome?.results.slice(0, 6).forEach((r, ri) =>
      keep(r, SURE[t.confidence] + matchScore(r.name, t.name) + (t.year && r.year === t.year ? 25 : 0) - ri * 4 - ti * 12, t.why),
    );
  });
  const ranked = [...scored.values()].sort((a, b) => b.score - a.score);
  const best = ranked[0] && ranked[0].score >= 30 ? ranked[0].r : null;
  const bestWhy = ranked[0]?.why;
  // A reel about several titles (a ranking, recommendations): each one Claude named, after the first.
  const alsoIn = claude.length > 1
    ? [...new Map(claudeSearched.slice(1).map((o) => o?.results[0]).filter((r): r is CatalogResult => Boolean(r) && r !== best).map((r) => [`${r.source}:${r.sourceId}`, r])).values()]
    : [];
  const alsoKeys = new Set(alsoIn.map((r) => `${r.source}:${r.sourceId}`));
  const others = ranked.filter((x) => x.r !== best && !alsoKeys.has(`${x.r.source}:${x.r.sourceId}`)).slice(0, 9).map((x) => x.r);
  // What "Search" looks for: the titles found, comma-separated so each is searched (never the
  // transcript itself).
  const searchFor = (claude.length ? claude.map((t) => t.name) : guesses.filter((g) => g.length <= 50).slice(0, 3)).join(", ");
  const snippet = (shared?.caption ?? text ?? title).replace(/https?:\/\/\S+/g, "").trim();
  // A reel link not yet listened to: listen to it straight away (lib/share/media.ts) unless Claude
  // is already sure; then it's a button.
  const linkToListen = canListen && url && !transcript && media !== "1" && ["TikTok", "YouTube", "Instagram", "Facebook"].includes(shared?.site ?? "") ? url : null;
  const sure = Boolean(best) && claude[0]?.confidence === "high";
  const linkParams = Object.fromEntries(Object.entries({ title, text, url: url ?? "" }).filter(([, v]) => v));

  return (
    <Screen back={{ href: "/", label: "Home" }} title="From your share">
      <SavedTitles saved={saved} lists={lists.map(({ id, name, icon, color, isDefault }) => ({ id, name, icon, color, isDefault }))}>
      <section className="rounded-2xl border bg-card/60 px-4 py-3 text-sm">
        <p className="text-xs text-muted-foreground">
          {shared?.site ?? "Shared"}
          {shared?.author ? ` · ${shared.author}` : ""}
        </p>
        {snippet ? <p className="mt-1 line-clamp-3 text-foreground/85">{snippet}</p> : <p className="mt-1 text-muted-foreground">No caption came with it.</p>}
      </section>

      {transcript && (
        <section className="mt-3 rounded-2xl border bg-card/60 px-4 py-3 text-sm">
          <p className="text-xs text-muted-foreground">Heard in the clip</p>
          <p className="mt-1 line-clamp-4 text-foreground/85">“{transcript}”</p>
        </section>
      )}

      {media === "1" && canListen ? (
        <SharedMedia params={Object.fromEntries(Object.entries({ title, text, url: url ?? "", media }).filter(([, v]) => v))} />
      ) : (
      <>
      {linkToListen && !sure && <SharedMedia params={linkParams} link={linkToListen} />}

      <div className="mt-5">
        {best ? (
          <ShareBest result={best} listName={defaultList.name} why={bestWhy} />
        ) : (
          <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Couldn&apos;t tell which title this is{guesses.length ? "" : ": the post didn't say"}. Search for it below.
          </p>
        )}
      </div>

      {alsoIn.length > 0 && (
        <section aria-labelledby="also-heading" className="mt-6">
          <h2 id="also-heading" className="mb-3 font-brand text-lg font-bold">
            Also in this reel
          </h2>
          <CatalogGrid results={alsoIn} listName={defaultList.name} />
        </section>
      )}

      <Link
        href={searchFor ? `/discover/search?${new URLSearchParams({ q: searchFor })}` : "/discover/search"}
        transitionTypes={["nav-forward"]}
        className="mt-4 flex h-12 items-center gap-3 rounded-2xl border border-input bg-card px-3.5 text-base text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-5 shrink-0" aria-hidden />
        {best ? "Not it? Search" : "Search"}
        {searchFor ? <span className="truncate text-foreground">{searchFor}</span> : null}
      </Link>

      {linkToListen && sure && <SharedMedia params={linkParams} link={linkToListen} auto={false} />}

      {!best && canListen && !transcript && !linkToListen && (
        <p className="mt-4 rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          The post doesn&apos;t say which movie it is? Save the video to your phone, then share the video itself to Abduct: it&apos;ll
          listen to the clip for the title.
          {media === "lost" ? " (Open Abduct once from your home screen first, so it can take videos.)" : ""}
        </p>
      )}

      {others.length > 0 && (
        <section aria-labelledby="others-heading" className="mt-8">
          <h2 id="others-heading" className="mb-3 font-brand text-lg font-bold">
            {best ? "Or maybe" : "Could be"}
          </h2>
          <CatalogGrid results={others} listName={defaultList.name} />
        </section>
      )}
      </>
      )}
      </SavedTitles>
    </Screen>
  );
}
