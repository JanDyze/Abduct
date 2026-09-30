"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { setRating } from "@/app/items/actions";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";

const WORDS = ["", "Not for me", "Meh", "Good", "Great", "Loved it"];

// Five stars to rate a title. Tapping a star sets it, tapping the same one again clears it. Saved
// right away; if saving fails the stars go back and say why. The stars are kept here rather than
// read back from the page, because in the randomizer the page doesn't reload after saving.
export function StarRating({ titleId, stars, size = "md", className }: { titleId: string; stars: number | null; size?: "md" | "lg"; className?: string }) {
  const [shown, setShown] = useState(stars);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  // The stars change at once; the save runs after, in a transition.
  const rate = (n: number) => {
    const before = shown;
    const next = shown === n ? null : n;
    setShown(next);
    setError(null);
    sound.star(next);
    start(async () => {
      const result = await setRating(titleId, next);
      if (result.error) {
        setShown(before);
        setError(result.error);
      }
    });
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div role="radiogroup" aria-label="Your rating" className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={shown === n}
            aria-label={`${n} ${n === 1 ? "star" : "stars"}: ${WORDS[n]}`}
            onClick={() => rate(n)}
            className={cn("rounded-lg transition-transform active:scale-90", size === "lg" ? "p-1.5" : "p-1")}
          >
            <Star
              className={cn(
                "transition-colors",
                size === "lg" ? "size-9" : "size-7",
                shown != null && n <= shown ? "fill-primary text-primary" : "text-muted-foreground/50",
              )}
              strokeWidth={1.75}
              aria-hidden
            />
          </button>
        ))}
        <span className="ml-2 text-sm font-medium text-muted-foreground" aria-live="polite">
          {shown ? WORDS[shown] : ""}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
