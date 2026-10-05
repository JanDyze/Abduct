import "server-only";
import { whereToWatch } from "./providers";

// Whether a title can be played right now without paying extra: free (with or without ads) in
// your country, or included in a service you have (Settings). Built on Where to watch, whose
// catalog answers are cached, so asking for a whole list is cheap after the first time.
export type Availability = { free: string[]; yours: string[] }; // service names

export async function availabilityOf(source: string, sourceId: string, country: string, mine: Set<string>): Promise<Availability> {
  const options = source === "manual" ? null : await whereToWatch(source, sourceId, country);
  const free: string[] = [];
  const yours: string[] = [];
  for (const g of options?.groups ?? []) {
    if (g.label === "Rent" || g.label === "Buy") continue;
    for (const p of g.providers) {
      if (g.label === "Free" && !free.includes(p.name)) free.push(p.name);
      if (mine.has(p.key) && !yours.includes(p.name)) yours.push(p.name);
    }
  }
  return { free, yours };
}

// Several at once, a few at a time so the catalog isn't flooded.
export async function availabilityOfMany(titles: { source: string; sourceId: string }[], country: string, mine: Set<string>) {
  const out: Record<string, Availability> = {};
  let next = 0;
  const worker = async () => {
    while (next < titles.length) {
      const t = titles[next++];
      out[`${t.source}:${t.sourceId}`] = await availabilityOf(t.source, t.sourceId, country, mine);
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, titles.length) }, worker));
  return out;
}
