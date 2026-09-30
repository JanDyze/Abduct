import type { Metadata } from "next";
import { ListForm } from "@/components/list-form";
import { Screen } from "@/components/screen";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "New list" };

export default async function NewListPage() {
  await requireUser();
  return (
    <Screen back={{ href: "/lists", label: "My lists" }} title="New list">
      <ListForm />
    </Screen>
  );
}
