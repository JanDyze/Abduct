"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Plays a title's official trailer in the app (from YouTube, via app/api/trailer), in a sheet over
// the page. Looks it up when tapped; says so when there isn't one.
export function TrailerButton({ source, sourceId, name, className }: { source: string; sourceId: string; name: string; className?: string }) {
  const [state, setState] = useState<"idle" | "loading" | "none" | { youtube: string }>("idle");
  const [open, setOpen] = useState(false);
  if (source === "manual") return null;

  const play = async () => {
    if (typeof state === "object") return setOpen(true);
    if (state === "loading" || state === "none") return;
    setState("loading");
    try {
      const res = await fetch(`/api/trailer?${new URLSearchParams({ source, id: sourceId })}`);
      const json = await res.json().catch(() => null);
      if (typeof json?.youtube === "string") {
        setState({ youtube: json.youtube });
        setOpen(true);
      } else setState("none");
    } catch {
      setState("idle");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={play}
        disabled={state === "none"}
        className={cn(
          "flex h-10 items-center justify-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold transition-[transform,background-color] hover:bg-muted active:scale-95 disabled:opacity-60",
          className,
        )}
      >
        {state === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Play className="size-4 fill-current" aria-hidden />}
        {state === "none" ? "No trailer" : "Trailer"}
      </button>
      {typeof state === "object" && (
        <Sheet open={open} onOpenChange={setOpen} title={name} description="Trailer">
          <div className="px-2 pb-2">
            {open && (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${state.youtube}?autoplay=1&playsinline=1&rel=0`}
                title={`${name}: trailer`}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="aspect-video w-full rounded-xl bg-black"
              />
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}
