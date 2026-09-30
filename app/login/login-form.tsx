"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { AppleMark, GoogleMark } from "@/components/sign-in-marks";
import { cn } from "@/lib/utils";
import { continueAsGuest, signIn } from "./actions";

function GuestButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-70"
    >
      {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
      Continue as guest
    </button>
  );
}

// Each provider's own look, as their sign-in guidelines ask: Google's "G" on a neutral button,
// Apple's logo on white (the app is dark).
function ProviderButton({ provider }: { provider: "google" | "apple" }) {
  const { pending } = useFormStatus();
  const apple = provider === "apple";
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-3 rounded-xl text-base font-medium transition-colors disabled:opacity-70",
        apple ? "bg-foreground text-background hover:bg-foreground/90" : "border border-input bg-card hover:bg-muted",
      )}
    >
      {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : apple ? <AppleMark /> : <GoogleMark />}
      {apple ? "Continue with Apple" : "Continue with Google"}
    </button>
  );
}

// Signing in and signing up are the same: Continue with Google or Apple (someone new gets an
// account on the way). Or try Abduct as a guest and save the account later.
export function LoginForm({ next, guests, apple }: { next?: string; guests: boolean; apple: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {(["google", ...(apple ? ["apple" as const] : [])] as const).map((provider) => (
        <form key={provider} action={signIn}>
          <input type="hidden" name="provider" value={provider} />
          <input type="hidden" name="next" value={next ?? ""} />
          <ProviderButton provider={provider} />
        </form>
      ))}
      {guests && (
        <>
          <form action={continueAsGuest}>
            <input type="hidden" name="next" value={next ?? ""} />
            <GuestButton />
          </form>
          <p className="px-4 text-center text-xs text-muted-foreground">
            As a guest your lists stay on this device. Sign in with Google any time to have them everywhere.
          </p>
        </>
      )}
    </div>
  );
}
