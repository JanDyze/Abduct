"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Globe, Loader2, Star } from "lucide-react";
import { makeDefault, setListPublic } from "@/app/lists/actions";
import { cn } from "@/lib/utils";

// A list's two switches on its edit page: make it your default (where titles go when you add without
// choosing), and share it publicly in Discover. Both take effect straight away.
export function ListSettings({ listId, isDefault, isPublic: initialPublic }: { listId: string; isDefault: boolean; isPublic: boolean }) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [error, setError] = useState<string | null>(null);
  const [makingDefault, startDefault] = useTransition();
  const [, startPublic] = useTransition();

  const togglePublic = () =>
    startPublic(async () => {
      const next = !isPublic;
      setIsPublic(next);
      setError(null);
      const result = await setListPublic(listId, next);
      if (result.error) {
        setIsPublic(!next);
        setError(result.error);
      }
    });

  return (
    <section className="flex flex-col gap-3">
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <Star className={cn("mt-0.5 size-5 shrink-0", isDefault ? "fill-primary text-primary" : "text-muted-foreground")} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{isDefault ? "Your default list" : "Default list"}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isDefault
                ? "Anything you add without choosing a list lands here, to sort later. To change it, make another list your default."
                : "Make this the list titles go to when you add without choosing one."}
            </p>
            {!isDefault && (
              <button
                type="button"
                disabled={makingDefault}
                onClick={() =>
                  startDefault(async () => {
                    const result = await makeDefault(listId);
                    if (result.error) setError(result.error);
                    else router.refresh();
                  })
                }
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60"
              >
                {makingDefault ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
                Make this my default list
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <Globe className={cn("mt-0.5 size-5 shrink-0", isPublic ? "text-primary" : "text-muted-foreground")} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Public</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isPublic ? (
                <>
                  Anyone on Abduct can find it in Discover, see what&apos;s on it (not what you&apos;ve watched) and add from it.{" "}
                  <Link href={`/discover/lists/${listId}`} className="font-medium text-primary underline-offset-4 hover:underline">
                    See it as others do
                  </Link>
                </>
              ) : (
                "Only you can see this list. Make it public to share it in Discover, with your name from Settings."
              )}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            aria-label="Public"
            onClick={togglePublic}
            className={cn("relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors", isPublic ? "bg-primary" : "bg-muted ring-1 ring-border")}
          >
            <span className={cn("absolute top-1 left-1 size-5 rounded-full bg-foreground shadow transition-transform", isPublic && "translate-x-5 bg-primary-foreground")} />
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
