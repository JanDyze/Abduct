import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { deleteList } from "@/app/lists/actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ListForm } from "@/components/list-form";
import { ListSettings } from "@/components/list-settings";
import { Screen } from "@/components/screen";
import { requireUser } from "@/lib/auth";
import { getList } from "@/lib/lists/queries";

export const metadata: Metadata = { title: "Edit list" };

export default async function EditListPage({ params }: PageProps<"/lists/[id]/edit">) {
  const { id } = await params;
  const user = await requireUser();
  const list = z.uuid().safeParse(id).success ? await getList(user.id, id) : null;
  if (!list) notFound();

  return (
    <Screen back={{ href: `/lists/${list.id}`, label: list.name }} title="Edit list">
      <ListForm list={list} />
      <div className="mt-8">
        <ListSettings listId={list.id} isDefault={list.isDefault} isPublic={list.isPublic} />
      </div>
      <div className="mt-8 border-t pt-6">
        {list.isDefault ? (
          <p className="text-sm text-muted-foreground">Your default list can&apos;t be deleted. Make another list your default first.</p>
        ) : (
          <ConfirmDelete
            action={deleteList}
            fields={{ id: list.id }}
            label="Delete this list"
            question={`Delete “${list.name}” and everything on it? Titles stay on your other lists.`}
          />
        )}
      </div>
    </Screen>
  );
}
