import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { saveAccount, signOut } from "@/app/login/actions";
import { CountryPicker } from "@/components/country-picker";
import { NameForm } from "@/components/name-form";
import { Screen } from "@/components/screen";
import { GoogleMark } from "@/components/sign-in-marks";
import { requireUser } from "@/lib/auth";
import { APP_VERSION } from "@/lib/changelog";
import { countryName, detectedCountry, viewerCountry } from "@/lib/country";
import { ensureProfile } from "@/lib/social/profiles";
import { COUNTRY_CODES } from "@/lib/timezone-countries";

export const metadata: Metadata = { title: "Settings" };

// Who you're signed in as, a way out, your country, and where the posters and details come from
// (TMDB asks apps using its API to say so).
export default async function SettingsPage() {
  const user = await requireUser();
  const [name, country, detected] = await Promise.all([ensureProfile(user), viewerCountry(), detectedCountry()]);
  const countries = COUNTRY_CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Screen back={{ href: "/", label: "Home" }} title="Settings">
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="text-sm text-muted-foreground">Signed in as</h2>
        <p className="mt-0.5 truncate font-brand text-lg font-bold">{user.guest ? "Guest" : (user.name ?? user.email ?? "You")}</p>
        {!user.guest && user.email && user.name && <p className="truncate text-sm text-muted-foreground">{user.email}</p>}
        {user.guest && (
          <form action={saveAccount} className="mt-4">
            <input type="hidden" name="provider" value="google" />
            <input type="hidden" name="next" value="/settings" />
            <p className="mb-3 text-sm text-muted-foreground">Your lists live on this device. Save your account to keep them and use them anywhere.</p>
            <button type="submit" className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-input bg-background text-sm font-medium hover:bg-muted">
              <GoogleMark /> Save with Google
            </button>
          </form>
        )}
        <div className="mt-4 border-t pt-4">
          <NameForm name={name} />
        </div>
        <form action={signOut} className="mt-4 border-t pt-3">
          <button type="submit" className="-mx-2 flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-destructive hover:bg-destructive/10">
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </form>
      </section>

      <section aria-labelledby="country-heading" className="mt-4 rounded-2xl border bg-card p-4">
        <h2 id="country-heading" className="font-medium">
          Country
        </h2>
        <p className="mt-0.5 mb-3 text-sm text-muted-foreground">For what&apos;s popular where you are, and where to watch.</p>
        <CountryPicker current={country.chosen ? country.code : null} detected={detected.name} countries={countries} />
      </section>

      <section className="mt-6 flex flex-col gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
        <p>
          Movie and series details and posters come from{" "}
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            TMDB
          </a>
          . This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <p>
          Anime details and posters come from{" "}
          <a href="https://anilist.co" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            AniList
          </a>
          .
        </p>
        <Link href="/whats-new" transitionTypes={["nav-forward"]} className="mt-2 w-fit underline underline-offset-2 hover:text-foreground">
          Abduct {APP_VERSION} · What&apos;s new
        </Link>
      </section>
    </Screen>
  );
}
