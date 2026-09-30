"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { viewerCountry } from "@/lib/country";
import { browse, type BrowsePage } from "@/lib/titles/catalog";
import { KINDS } from "@/lib/titles/kinds";

const schema = z.object({
  kind: z.enum(KINDS),
  feed: z.enum(["trending", "genre", "country", "topic"]),
  genre: z.string().max(40).optional(),
  topic: z.number().int().positive().optional(),
  page: z.number().int().min(2).max(50),
});

// The next page of a Discover feed, for its See all page as you scroll.
export async function browseMore(
  kind: string,
  feed: string,
  genre: string | undefined,
  topic: number | undefined,
  page: number,
): Promise<BrowsePage & { failed?: true }> {
  await requireUser();
  const parsed = schema.safeParse({ kind, feed, genre, topic, page });
  if (!parsed.success) return { results: [], hasMore: false };
  try {
    const { code } = await viewerCountry();
    return await browse(parsed.data.kind, parsed.data.feed, { genre: parsed.data.genre, topic: parsed.data.topic, country: code, page: parsed.data.page });
  } catch (e) {
    console.error("Browse failed:", e);
    return { results: [], hasMore: true, failed: true };
  }
}
