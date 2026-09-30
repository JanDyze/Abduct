"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { makeDefault } from "@/app/lists/actions";
import { cn } from "@/lib/utils";

// In a list's top bar: a filled star on your default list (where titles go when you add without
// choosing one); an empty one elsewhere, which makes that list the default with one tap.
export function DefaultStar({ listId, isDefault }: { listId: string; isDefault: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  const label = isDefault ? "Your default list" : "Make this your default list";
  return (
    <button
      type="button"
      aria-label={label}
      title={error ? "Couldn't change the default. Try again." : label}
      aria-pressed={isDefault}
      disabled={isDefault || pending}
      onClick={() =>
        start(async () => {
          const result = await makeDefault(listId);
          setError(Boolean(result.error));
          if (!result.error) router.refresh();
        })
      }
      className={cn(
        "flex size-10 items-center justify-center rounded-xl transition-colors disabled:cursor-default",
        isDefault ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        error && "text-destructive",
      )}
    >
      {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : <Star className={cn("size-4.5", isDefault && "fill-primary")} aria-hidden />}
    </button>
  );
}
