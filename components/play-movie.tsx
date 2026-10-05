"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Play } from "lucide-react";
import { Cinema, enterFullScreen, leaveFullScreen } from "@/components/cinema";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

// Plays a movie by its TMDB id, through app/api/play (which knows where the player is). Tapping
// Play goes full screen and opens the cinema over the page; the player only loads then, so
// opening a title doesn't pull in the player (and its scripts) for people who just came to look.
export function PlayMovie({ movieId, name, className }: { movieId: string; name: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => {
    leaveFullScreen();
    setOpen(false);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          enterFullScreen();
          sound.whoosh();
          setOpen(true);
        }}
        className={cn(
          "flex h-12 w-full items-center justify-center gap-2 rounded-2xl border bg-card text-base font-semibold transition-[transform,background-color] hover:bg-muted active:scale-[0.98]",
          className,
        )}
      >
        <Play className="size-5 fill-current" aria-hidden />
        Play movie
      </button>
      {open && createPortal(<Cinema src={`/api/play?${new URLSearchParams({ id: movieId })}`} name={name} onClose={close} />, document.body)}
    </>
  );
}
