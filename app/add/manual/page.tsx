import type { Metadata } from "next";
import { ManualForm } from "@/components/manual-form";
import { Screen } from "@/components/screen";
import { requireUser } from "@/lib/auth";
import { getLists } from "@/lib/lists/queries";

export const metadata: Metadata = { title: "Add by hand" };

export default async function ManualAddPage({ searchParams }: PageProps<"/add/manual">) {
  const { list } = await searchParams;
  const user = await requireUser();
  const lists = await getLists(user.id);
  const target = lists.find((l) => l.id === list) ?? lists.find((l) => l.isDefault) ?? lists[0];

  return (
    <Screen back={{ href: `/add?list=${target.id}`, label: "Search" }} title="Add by hand" subtitle={`To ${target.name}`}>
      <ManualForm listId={target.id} />
    </Screen>
  );
}
