import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Star, Users } from "lucide-react";
import { z } from "zod";
import { OthersComments } from "@/components/comments";
import { PlayMovie } from "@/components/play-movie";
import { Poster } from "@/components/poster";
import { TrailerButton } from "@/components/trailer-button";
import { Screen } from "@/components/screen";
import { AddToMine } from "@/components/social-buttons";
import { WhereToWatch, WhereToWatchLoading } from "@/components/where-to-watch";
import { autoSortAvailable } from "@/lib/lists/auto-sort";
import { requireUser } from "@/lib/auth";
import { titleMeta } from "@/lib/format";
import { firstItemOf, getLists } from "@/lib/lists/queries";
import { communityRating, getTitle, publicComments } from "@/lib/social/discover";
import { playableMovieId, playerEnabled } from "@/lib/titles/player";

async function load(params: PageProps<"/titles/[id]">["params"]) {
  const { id } = await params;
  const user = await requireUser();
  const title = z.uuid().safeParse(id).success ? await getTitle(id) : null;
  return { user, title };
}

export async function generateMetadata({ params }: PageProps<"/titles/[id]">): Promise<Metadata> {
  const { title } = await load(params);
  return { title: title?.name ?? "Title" };
}

// A title as anyone sees it, reached from Discover or someone's public list: what it is, how people
// on Abduct rate it, what they said, and a button to put it on your own list.
export default async function TitlePage({ params, searchParams }: PageProps<"/titles/[id]">) {
  const { user, title } = await load(params);
  if (!title) notFound();
  const { list: listParam, from } = await searchParams;
  const [rating, said, lists, yourItem] = await Promise.all([
    communityRating(title.id),
    publicComments(title.id),
    getLists(user.id),
    firstItemOf(user.id, title.id),
  ]);
  // Opened from Add a title, Add goes to the list chosen there; otherwise to your default.
  const target = lists.find((l) => l.id === listParam) ?? lists.find((l) => l.isDefault) ?? lists[0];
  const back = from === "add" ? { href: `/add?list=${target.id}`, label: "Search" } : { href: "/discover", label: "Discover" };
  const movieId = playerEnabled() ? playableMovieId(title.source, title.sourceId) : null;

  return (
    <Screen back={back} title={back.label} className="pt-0">
      <div className="relative -mx-4 mb-4 h-44 overflow-hidden">
        {title.backdropUrl ? (
          <Image src={title.backdropUrl} alt="" fill sizes="640px" unoptimized priority className="object-cover opacity-50" />
        ) : (
          <div className="size-full bg-gradient-to-b from-primary/15 to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
      </div>
      <div className="animate-rise -mt-32 flex items-end gap-4">
        <Poster src={title.posterUrl} name={title.name} kind={title.kind} priority hero className="w-32 shrink-0 shadow-2xl shadow-black/60" />
        <div className="min-w-0 pb-1">
          <h2 className="font-brand text-2xl leading-tight font-bold text-balance">{title.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{titleMeta(title)}</p>
          {title.score != null && (
            <p className="mt-1.5 flex items-center gap-1 text-sm font-medium">
              <Star className="size-4 fill-primary text-primary" aria-hidden /> {title.score}%<span className="sr-only"> audience score</span>
            </p>
          )}
          <TrailerButton source={title.source} sourceId={title.sourceId} name={title.name} className="mt-2.5 h-9 px-3.5" />
        </div>
      </div>

      {title.genres.length > 0 && (
        <ul className="animate-rise mt-4 flex flex-wrap gap-1.5">
          {title.genres.map((g) => (
            <li key={g} className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground">
              {g}
            </li>
          ))}
        </ul>
      )}

      <div className="animate-rise mt-5">
        <AddToMine
          titleId={title.id}
          yourItemId={yourItem}
          target={{ id: target.id, name: target.name, icon: target.icon, color: target.color }}
          autoSort={target.isDefault && target.id !== listParam && autoSortAvailable()}
          lists={lists.map(({ id, name, icon, color }) => ({ id, name, icon, color }))}
        />
      </div>

      {movieId && <PlayMovie movieId={movieId} name={title.name} className="animate-rise mt-3" />}

      <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="size-4" aria-hidden />
        {rating.votes === 0 ? (
          "No one on Abduct has rated it yet."
        ) : (
          <>
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Star className="size-4 fill-primary text-primary" aria-hidden /> {rating.average}
            </span>
            from {rating.votes} {rating.votes === 1 ? "person" : "people"} on Abduct
          </>
        )}
      </p>

      {title.source !== "manual" && (
        <Suspense fallback={<WhereToWatchLoading />}>
          <WhereToWatch source={title.source} sourceId={title.sourceId} name={title.name} />
        </Suspense>
      )}

      {title.overview && <p className="mt-5 text-[0.95rem] leading-relaxed whitespace-pre-line text-foreground/85">{title.overview}</p>}

      <OthersComments comments={said} title="What people said" />
      {said.length === 0 && <p className="mt-8 text-sm text-muted-foreground">No one has said anything about it yet.</p>}
    </Screen>
  );
}
