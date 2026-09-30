"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { makeDefault } from "@/app/lists/actions";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";

// In a list's top bar: a filled star on your default list (where titles go when you add without
// choosing one); an empty one elsewhere, which makes that list the default with one tap.
export function DefaultStar({ listId, isDefault: initial }: { listId: string; isDefault: boolean }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [error, setError] = useState(false);
  // filled at once when tapped; back to empty if the server says no
  const [isDefault, setIsDefault] = useState(initial);
  const label = isDefault ? "Your default list" : "Make this your default list";
  return (
    <button
      type="button"
      aria-label={label}
      title={error ? "Couldn't change the default. Try again." : label}
      aria-pressed={isDefault}
      disabled={isDefault}
      onClick={() => {
        setIsDefault(true);
        setError(false);
        sound.pop(5);
        start(async () => {
          const result = await makeDefault(listId);
          if (result.error) {
            setIsDefault(false);
            setError(true);
          } else router.refresh();
        });
      }}
      className={cn(
        "flex size-10 items-center justify-center rounded-xl transition-colors disabled:cursor-default",
        isDefault ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        error && "text-destructive",
      )}
    >
      <Star className={cn("size-4.5 transition-[fill,color]", isDefault && "fill-primary")} aria-hidden />
    </button>
  );
}
