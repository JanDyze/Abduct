import type { Metadata } from "next";
import { Screen } from "@/components/screen";
import { TidyLists } from "@/components/tidy-lists";
import { requireUser } from "@/lib/auth";
import { tidyAvailable } from "@/lib/lists/tidy";

export const metadata: Metadata = { title: "Tidy with AI" };

// Claude can take a while over a big collection: the plan's server action gets this long.
export const maxDuration = 120;

export default async function TidyPage() {
  await requireUser();
  return (
    <Screen back={{ href: "/lists", label: "My lists" }} title="Tidy with AI">
      {tidyAvailable() ? (
        <TidyLists />
      ) : (
        <p className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">Tidy with AI needs an Anthropic API key on the server (ANTHROPIC_API_KEY).</p>
      )}
    </Screen>
  );
}
