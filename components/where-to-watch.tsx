import Image from "next/image";
import { Tv } from "lucide-react";
import { viewerCountry } from "@/lib/country";
import { whereToWatch } from "@/lib/titles/providers";

// Where you can watch a title right now, in your country: the services grouped by stream, free,
// rent and buy. Asks the catalog while the rest of the page shows, so wrap it in <Suspense> with
// <WhereToWatchLoading />. Shows nothing for titles added by hand.
export async function WhereToWatch({ source, sourceId }: { source: string; sourceId: string }) {
  const country = await viewerCountry();
  const options = await whereToWatch(source, sourceId, country.code);
  if (!options) return null;

  return (
    <section aria-labelledby="watch-heading" className="animate-rise mt-6">
      <h2 id="watch-heading" className="font-brand text-lg font-bold">
        Where to watch
      </h2>
      {options.groups.length === 0 ? (
        <p className="mt-2 flex items-center gap-2 rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <Tv className="size-4 shrink-0" aria-hidden />
          {options.from === "anilist" ? "No streaming links for it yet." : `Not streaming, for rent or for sale in ${country.name} right now.`}
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-3">
          {options.groups.map((g) => (
            <div key={g.label}>
              <h3 className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">{g.label}</h3>
              <ul className="flex flex-wrap gap-2">
                {g.providers.map((p) => (
                  <li key={p.name}>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 items-center gap-2 rounded-xl border bg-card pr-3 pl-1.5 text-sm font-medium transition-[transform,background-color] hover:bg-muted active:scale-95"
                    >
                      {p.logo ? (
                        <Image src={p.logo} alt="" width={28} height={28} unoptimized className="size-7 rounded-lg bg-muted object-contain" />
                      ) : (
                        <Tv className="mx-1 size-5 text-muted-foreground" aria-hidden />
                      )}
                      {p.name}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {options.from === "justwatch" ? (
          <>
            In {country.name}. Streaming info from{" "}
            <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
              JustWatch
            </a>
            .
          </>
        ) : (
          `From AniList. Some may not be available in ${country.name}.`
        )}
      </p>
    </section>
  );
}

// Holds the section's place while the catalog answers.
export function WhereToWatchLoading() {
  return (
    <div aria-hidden className="mt-6">
      <div className="h-5 w-32 rounded bg-muted" />
      <div className="mt-3 flex gap-2">
        <div className="h-10 w-28 animate-pulse rounded-xl bg-muted" />
        <div className="h-10 w-24 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
