import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { saveCatalogTitle } from "@/lib/titles/save";

const schema = z.object({
  source: z.enum(["tmdb", "anilist"]),
  id: z.string().min(1).max(40),
  list: z.uuid().optional(),
  from: z.enum(["add", "discover"]).optional(),
});

// Opening a search hit or a trending title that may not be on Abduct yet: its details are fetched
// from the catalog and kept (like adding does, without putting it on a list), then its page shows.
// `list` and `from` carry over so the page adds to the list you were adding to and goes back there.
export default async function OpenTitle({ searchParams }: PageProps<"/titles/open">) {
  await requireUser();
  const params = await searchParams;
  const parsed = schema.safeParse({
    source: params.source,
    id: params.id,
    list: params.list || undefined,
    from: params.from || undefined,
  });
  if (!parsed.success) notFound();
  const titleId = await saveCatalogTitle(parsed.data.source, parsed.data.id).catch(() => null);
  if (!titleId) notFound();
  const next = new URLSearchParams();
  if (parsed.data.list) next.set("list", parsed.data.list);
  if (parsed.data.from) next.set("from", parsed.data.from);
  const qs = next.toString();
  redirect(`/titles/${titleId}${qs ? `?${qs}` : ""}`);
}
