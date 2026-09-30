"use client";

import { useOptimistic, useTransition } from "react";
import { Check, Eye } from "lucide-react";
import { setWatched } from "@/app/lists/actions";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";

// Marks a title watched (or not yet) right away; the server catches up behind it.
export function WatchedToggle({ itemId, watched, className }: { itemId: string; watched: boolean; className?: string }) {
  const [shown, setShown] = useOptimistic(watched);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={shown}
      onClick={() =>
        start(async () => {
          sound.watched(!shown);
          setShown(!shown);
          await setWatched(itemId, !shown);
        })
      }
      className={cn(
        "flex h-12 items-center justify-center gap-2 rounded-2xl text-base font-semibold transition-[transform,background-color] active:scale-[0.98]",
        shown ? "border border-primary/40 bg-primary/10 text-primary" : "bg-primary text-primary-foreground",
        className,
      )}
    >
      {shown ? <Check className="size-5" strokeWidth={2.5} aria-hidden /> : <Eye className="size-5" aria-hidden />}
      {shown ? "Watched" : "Mark as watched"}
    </button>
  );
}
