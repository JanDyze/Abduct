import type { Metadata } from "next";
import { ReleaseNotes } from "@/components/release-notes";
import { Screen } from "@/components/screen";
import { requireUser } from "@/lib/auth";
import { APP_VERSION } from "@/lib/changelog";
import { getReleases } from "@/lib/releases";

export const metadata: Metadata = { title: "What's new" };

// Every release, newest first, from CHANGELOG.md.
export default async function WhatsNewPage() {
  await requireUser();
  const releases = await getReleases();

  return (
    <Screen back={{ href: "/settings", label: "Settings" }} title="What's new" subtitle={`Abduct ${APP_VERSION}`}>
      <div className="flex flex-col gap-4">
        {releases.map((r, i) => (
          <section
            key={r.version}
            aria-labelledby={`v${r.version}`}
            className="animate-rise rounded-2xl border bg-card p-4"
            style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
          >
            <h2 id={`v${r.version}`} className="flex items-baseline justify-between gap-3">
              <span className="font-brand text-lg font-bold tracking-tight">{r.title || `Version ${r.version}`}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{r.version}</span>
            </h2>
            <ReleaseNotes notes={r.notes} className="mt-3 flex flex-col gap-2" />
          </section>
        ))}
      </div>
    </Screen>
  );
}
