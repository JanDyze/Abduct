import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// `guest`: signed in anonymously ("Continue as guest"). Their lists are real rows like anyone's,
// and signing in with Google later links Google to the same account, so nothing is lost.
export type SessionUser = { id: string; email: string | null; name: string | null; guest: boolean };

// Verifies the session JWT. Cached per request so several callers share one check. `name` is the
// name a provider like Google gave, used for the greeting.
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const name = [meta.full_name, meta.name].find((n): n is string => typeof n === "string" && n.trim() !== "");
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    name: name?.trim() ?? null,
    guest: claims.is_anonymous === true,
  };
});

// Use in every page and server action that touches user data; filter queries by user.id.
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
