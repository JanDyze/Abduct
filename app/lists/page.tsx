import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { reorderLists } from "@/app/lists/actions";
import { Arrangeable } from "@/components/arrange-list";
import { ListCard } from "@/components/list-card";
import { ListBadge } from "@/components/list-icon";
import { Screen } from "@/components/screen";
import { requireUser } from "@/lib/auth";
import { getLists } from "@/lib/lists/queries";

export const metadata: Metadata = { title: "My lists" };

export default async function ListsPage() {
  const user = await requireUser();
  const lists = await getLists(user.id);

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
      <Arrangeable
        save={reorderLists}
        items={lists.map((l) => ({
          id: l.id,
          title: l.name,
          subtitle: [l.isDefault && "Default", l.isPublic && "Public", `${l.total} ${l.total === 1 ? "title" : "titles"}`].filter(Boolean).join(" · "),
          thumb: <ListBadge icon={l.icon} color={l.color} className="size-9 rounded-lg" />,
        }))}
      >
        <div className="grid grid-cols-2 gap-3">
          {lists.map((list, i) => (
            <ListCard key={list.id} list={list} className="animate-rise" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      </Arrangeable>
    </Screen>
  );
}
