"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

// Plays a movie right on its page, by its TMDB id, through app/api/play (which knows where the
// player is). It only loads once you tap Play, so opening a title doesn't pull in the player (and
// its scripts) for people who just came to look.
export function PlayMovie({ movieId, name, className }: { movieId: string; name: string; className?: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className={cn("aspect-video overflow-hidden rounded-2xl border bg-black", className)}>
        <iframe
          src={`/api/play?${new URLSearchParams({ id: movieId })}`}
          title={`Play ${name}`}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          className="size-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-2xl border bg-card text-base font-semibold transition-[transform,background-color] hover:bg-muted active:scale-[0.98]",
        className,
      )}
    >
      <Play className="size-5 fill-current" aria-hidden />
      Play movie
    </button>
  );
}
