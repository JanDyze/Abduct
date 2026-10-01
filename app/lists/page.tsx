import type { Metadata } from "next";
import Link from "next/link";
import { Dices, Hand, Plus, Sparkles } from "lucide-react";
import { reorderLists } from "@/app/lists/actions";
import { Arrangeable } from "@/components/arrange-list";
import { ListBadge } from "@/components/list-icon";
import { ListGrid } from "@/components/list-grid";
import { Screen } from "@/components/screen";
import { requireUser } from "@/lib/auth";
import { getLists, listStats } from "@/lib/lists/queries";
import { tidyAvailable } from "@/lib/lists/tidy";

export const metadata: Metadata = { title: "My lists" };

// Your lists: how you're doing across all of them up top, then a card each. Hold a card for its
// quick actions; Arrange puts them in your order; Tidy with AI lets Claude reorganize the lot.
export default async function ListsPage() {
  const user = await requireUser();
  const [lists, stats] = await Promise.all([getLists(user.id), listStats(user.id)]);
  const watchedShare = stats.total === 0 ? 0 : Math.round((stats.watched / stats.total) * 100);

  return (
    <Screen
      back={{ href: "/", label: "Home" }}
      title="My lists"
      subtitle={`${lists.length} ${lists.length === 1 ? "list" : "lists"}`}
      action={
        <Link
          href="/lists/new"
          transitionTypes={["nav-forward"]}
          className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground active:scale-95"
        >
          <Plus className="size-4" strokeWidth={2.5} aria-hidden /> New
        </Link>
      }
    >
      <section aria-label="Across your lists" className="animate-rise mb-4 rounded-2xl border bg-card p-4">
        <dl className="grid grid-cols-3 gap-2 text-center">
          <Stat label="To watch" value={stats.toWatch} />
          <Stat label="Watched" value={stats.watched} />
          <Stat label="Titles" value={stats.total} />
        </dl>
        {stats.total > 0 && (
          <>
            <div
              role="meter"
              aria-label="Watched across your lists"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={watchedShare}
              aria-valuetext={`${watchedShare}% watched`}
              className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${watchedShare}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{watchedShare}% watched</p>
              {stats.toWatch > 0 && (
                <Link
                  href="/spin"
                  transitionTypes={["nav-forward"]}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-primary/15 px-3 text-sm font-semibold text-primary hover:bg-primary/25 active:scale-95"
                >
                  <Dices className="size-4" aria-hidden /> Pick for me
                </Link>
              )}
            </div>
          </>
        )}
      </section>

      {tidyAvailable() && stats.total > 0 && (
        <Link
          href="/lists/tidy"
          transitionTypes={["nav-forward"]}
          className="animate-rise mb-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3.5 transition-[transform,background-color] hover:bg-primary/15 active:scale-[0.99]"
        >
          <Sparkles className="size-5 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Tidy with AI</span>
            <span className="block text-xs text-muted-foreground">Let Claude sort everything into the right lists</span>
          </span>
        </Link>
      )}

      <Arrangeable
        save={reorderLists}
        items={lists.map((l) => ({
          id: l.id,
          title: l.name,
          subtitle: [l.isDefault && "Default", l.isPublic && "Public", `${l.total} ${l.total === 1 ? "title" : "titles"}`].filter(Boolean).join(" · "),
          thumb: <ListBadge icon={l.icon} color={l.color} className="size-9 rounded-lg" />,
        }))}
      >
        <ListGrid lists={lists} />
        <Link
          href="/lists/new"
          transitionTypes={["nav-forward"]}
          className="mt-3 flex h-14 items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-medium text-muted-foreground transition-[transform,background-color] hover:bg-muted hover:text-foreground active:scale-[0.99]"
        >
          <Plus className="size-4" aria-hidden /> New list
        </Link>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Hand className="size-3.5" aria-hidden /> Hold a list for quick actions
        </p>
      </Arrangeable>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-brand text-2xl leading-tight font-bold tabular-nums">{value}</dd>
    </div>
  );
}
