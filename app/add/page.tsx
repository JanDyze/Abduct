import type { Metadata } from "next";
import { Screen } from "@/components/screen";
import { TitleSearch } from "@/components/title-search";
import { requireUser } from "@/lib/auth";
import { getLists } from "@/lib/lists/queries";

export const metadata: Metadata = { title: "Add a title" };

// Search and add. Opened from a list it adds to that list; otherwise to your default list, so
// adding in a hurry needs no choosing (sort it later from the title's page).
export default async function AddPage({ searchParams }: PageProps<"/add">) {
  const { list } = await searchParams;
  const user = await requireUser();
  const lists = await getLists(user.id);
  const from = lists.find((l) => l.id === list);

  return (
    <Screen back={from ? { href: `/lists/${from.id}`, label: from.name } : { href: "/", label: "Home" }} title="Add a title">
      <TitleSearch lists={lists.map(({ id, name, icon, color }) => ({ id, name, icon, color }))} initialList={(from ?? lists.find((l) => l.isDefault) ?? lists[0]).id} />
    </Screen>
  );
}
