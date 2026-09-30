"use server";

import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { NEXT_COOKIE } from "@/lib/next-path";
import { siteOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

// Abduct signs in with Google or Apple (Apple needs its provider set up in Supabase; its button
// shows once it is), or as a guest.

type Provider = "google" | "apple";
const providerOf = (value: FormDataEntryValue | null): Provider => (value === "apple" ? "apple" : "google");

// Only allow redirects back into this app, never to another site.
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

// Remembers `next` for /auth/confirm, in case Google or Apple comes back without it.
async function rememberNext(next: string) {
  if (next !== "/") (await cookies()).set(NEXT_COOKIE, next, { path: "/", maxAge: 60 * 60 * 24, sameSite: "lax", httpOnly: true });
}

// Continue with Google or Apple (the form's `provider`): off to their sign-in, which returns
// through /auth/confirm and on to `next`. Someone new gets an account on the way.
export async function signIn(formData: FormData) {
  const provider = providerOf(formData.get("provider"));
  const next = safeNext(formData.get("next"));
  const origin = await siteOrigin();
  await rememberNext(next);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`/login?link=${provider}`);
  redirect(data.url);
}

// Continue as guest: an anonymous Supabase account, so every page works as usual with a few
// things held back (see GUEST_NOT_ALLOWED in lib/auth.ts). Needs anonymous sign-ins turned on in
// Supabase (Authentication → Sign In / Providers).
export async function continueAsGuest(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    // e.g. 422 anonymous_provider_disabled: the Supabase toggle is off.
    console.error("Continue as guest failed:", error.status, error.code, error.message);
    redirect("/login?link=guest");
  }
  // Replaces the sign-in page, so Home is where the app's history starts (Back from it exits).
  redirect(next, RedirectType.replace);
}

// A guest keeping their account: Google or Apple is linked to the same user, so their lists stay. Needs manual linking turned on in Supabase. Comes back through /auth/confirm.
export async function saveAccount(formData: FormData) {
  const provider = providerOf(formData.get("provider"));
  const next = safeNext(formData.get("next"));
  const origin = await siteOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: { redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`${next}${next.includes("?") ? "&" : "?"}saved=failed`);
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
