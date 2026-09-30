import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { z } from "zod";
import { ListBadge } from "@/components/list-icon";
import { Poster } from "@/components/poster";
import { Screen } from "@/components/screen";
import { LikeButton } from "@/components/social-buttons";
import { requireUser } from "@/lib/auth";
import { countTitles } from "@/lib/format";
import { getPublicList } from "@/lib/social/discover";

async function load(params: PageProps<"/discover/lists/[id]">["params"]) {
  const { id } = await params;
  const user = await requireUser();
  return z.uuid().safeParse(id).success ? getPublicList(id, user.id) : null;
}

export async function generateMetadata({ params }: PageProps<"/discover/lists/[id]">): Promise<Metadata> {
  const list = await load(params);
  return { title: list?.name ?? "List" };
}

// Someone's public list, as anyone on Abduct sees it: what's on it (not what they've watched), who
// made it, and a like. Tap a title to see it and add it to your own lists.
export default async function PublicListPage({ params }: PageProps<"/discover/lists/[id]">) {
  const list = await load(params);
  if (!list) notFound();

  return (
    <Screen back={{ href: "/discover", label: "Discover" }} title={list.name} subtitle={`by ${list.owner} · ${countTitles(list.items.length)}`}>
      <div className="animate-rise flex items-center gap-3">
        <ListBadge icon={list.icon} color={list.color} className="size-14 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-brand text-lg font-bold">{list.name}</p>
          <p className="text-sm text-muted-foreground">
            {list.mine ? (list.isPublic ? "Your public list" : "Only you can see this list") : `Shared by ${list.owner}`}
          </p>
        </div>
        {list.mine ? (
          <Link
            href={`/lists/${list.id}/edit`}
            transitionTypes={["nav-forward"]}
            className="flex h-10 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold hover:bg-muted"
          >
            <Pencil className="size-4" aria-hidden /> Edit
          </Link>
        ) : (
          <LikeButton listId={list.id} liked={list.liked} likes={list.likes} />
        )}
      </div>

      {list.items.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Nothing on this list yet.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-3 gap-x-3 gap-y-4">
          {list.items.map((t, i) => (
            <li key={t.titleId} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
              <Link href={`/titles/${t.titleId}`} transitionTypes={["nav-forward"]} className="block transition-transform active:scale-[0.97]">
                <Poster src={t.posterUrl} name={t.name} kind={t.kind} />
                <span className="mt-1.5 line-clamp-2 text-xs leading-snug font-medium">{t.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
