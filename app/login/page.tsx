import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

// Why Google or Apple sign-in brought someone back here.
const LINK_MESSAGES = {
  expired: "That sign-in link has expired or was already used. Try again.",
  google: "Google sign-in isn't available right now. Try again in a moment.",
  apple: "Apple sign-in isn't available right now. Try again in a moment.",
  cancelled: "Sign-in was cancelled.",
  guest: "Guest mode isn't available right now. Sign in with Google instead.",
};

export const metadata: Metadata = { title: "Sign in" };

// Continue as guest and Continue with Apple show only while they're on in Supabase (checked every
// 5 min), so neither is offered before it works.
async function providers() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
      next: { revalidate: 300 },
    });
    const settings = (await res.json()) as { external?: { anonymous_users?: boolean; apple?: boolean } };
    return { guests: settings.external?.anonymous_users === true, apple: settings.external?.apple === true };
  } catch {
    return { guests: false, apple: false };
  }
}

// One way in: Continue with Google (or Apple), which also makes the account the first time. The
// logo plays its intro here: the ship flies in, the lights come on, the beam drops the wordmark.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, link } = await searchParams;
  const { guests, apple } = await providers();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <div className="mb-10 flex flex-col items-center gap-5 text-center">
        <Image src="/logo-full-animated.svg" alt="Abduct" width={240} height={228} priority unoptimized />
        <p className="text-muted-foreground">Can&apos;t pick what to watch? Let the UFO decide.</p>
      </div>
      {typeof link === "string" && link in LINK_MESSAGES && (
        <p role="alert" className="mb-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {LINK_MESSAGES[link as keyof typeof LINK_MESSAGES]}
        </p>
      )}
      <LoginForm next={typeof next === "string" ? next : undefined} guests={guests} apple={apple} />
    </main>
  );
}
