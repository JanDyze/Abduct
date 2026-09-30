import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { NEXT_COOKIE, safeNextPath } from "@/lib/next-path";
import { siteOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

// Where Google or Apple sign-in lands: it finishes signing in, then carries on to `next`.
// Handles both link styles Supabase sends (a PKCE `code`, or a `token_hash` with its type). When
// `next` got lost on the way (Supabase's Site URL fallback sends "/"), the page they first asked
// for comes from the cookie the proxy left.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const asked = safeNextPath(url.searchParams.get("next"));
  const remembered = safeNextPath(request.cookies.get(NEXT_COOKIE)?.value);
  const next = asked && asked !== "/" ? asked : (remembered ?? "/");
  // Google (or another provider) came back without signing in, e.g. the user tapped Cancel.
  const origin = await siteOrigin();
  // A guest saving their account with a Google account that already has Abduct stays a guest.
  if (url.searchParams.get("error_code") === "identity_already_exists") return NextResponse.redirect(new URL("/?saved=taken", origin));
  if (url.searchParams.has("error")) {
    const signedIn = Boolean((await (await createClient()).auth.getClaims()).data?.claims?.sub);
    return NextResponse.redirect(new URL(signedIn ? "/?saved=cancelled" : "/login?link=cancelled", origin));
  }

  const supabase = await createClient();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing token") };

  const response = NextResponse.redirect(new URL(error ? "/login?link=expired" : next, origin));
  if (!error) response.cookies.delete(NEXT_COOKIE);
  return response;
}
