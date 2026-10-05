import Image from "next/image";
import Link from "next/link";
import { Check, Tv } from "lucide-react";
import { viewerCountry } from "@/lib/country";
import { myServices } from "@/lib/my-services";
import { whereToWatch } from "@/lib/titles/providers";
import { serviceLink } from "@/lib/titles/services";
import { cn } from "@/lib/utils";

// Where you can watch a title right now, in your country: the services grouped by stream, free,
// rent and buy. Each opens the title in that service's app where it can (lib/titles/services.ts),
// and the services you have (Settings) come first, marked. Asks the catalog while the rest of the
// page shows, so wrap it in <Suspense> with <WhereToWatchLoading />. Shows nothing for titles
// added by hand.
export async function WhereToWatch({ source, sourceId, name }: { source: string; sourceId: string; name: string }) {
  const [country, mine] = await Promise.all([viewerCountry(), myServices()]);
  const options = await whereToWatch(source, sourceId, country.code);
  if (!options) return null;
  const yours = new Set(mine);
  const groups = options.groups.map((g) => ({ ...g, providers: [...g.providers].sort((a, b) => Number(yours.has(b.key)) - Number(yours.has(a.key))) }));
  const onYours = groups.some((g) => g.label !== "Rent" && g.label !== "Buy" && g.providers.some((p) => yours.has(p.key)));

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
          {onYours && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <Check className="size-4" strokeWidth={2.5} aria-hidden /> On a service you have
            </p>
          )}
          {groups.map((g) => (
            <div key={g.label}>
              <h3 className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">{g.label}</h3>
              <ul className="flex flex-wrap gap-2">
                {g.providers.map((p) => (
                  <li key={p.name}>
                    <a
                      href={options.from === "justwatch" ? serviceLink(p.name, name, p.url) : p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex h-10 items-center gap-2 rounded-xl border bg-card pr-3 pl-1.5 text-sm font-medium transition-[transform,background-color] hover:bg-muted active:scale-95",
                        yours.has(p.key) && "border-primary/50 bg-primary/10",
                      )}
                    >
                      {p.logo ? (
                        <Image src={p.logo} alt="" width={28} height={28} unoptimized className="size-7 rounded-lg bg-muted object-contain" />
                      ) : (
                        <Tv className="mx-1 size-5 text-muted-foreground" aria-hidden />
                      )}
                      {p.name}
                      {yours.has(p.key) && <Check className="size-3.5 text-primary" strokeWidth={3} aria-label="You have it" />}
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
            In {country.name}.{" "}
            <Link href="/settings#services" className="underline underline-offset-2 hover:text-foreground">
              {mine.length ? "Your services" : "Pick your services"}
            </Link>
            . Streaming info from{" "}
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
