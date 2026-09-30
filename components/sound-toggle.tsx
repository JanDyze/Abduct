"use client";

import { useState, useSyncExternalStore } from "react";
import { setSoundsOn, sound, soundsOn } from "@/lib/sound";
import { cn } from "@/lib/utils";

const noop = () => () => {};

// Settings: Abduct's little sounds on or off, on this device. Turning them on plays one, so you
// hear what you've switched on.
export function SoundToggle() {
  // what's saved on this device (on, before the page knows)
  const saved = useSyncExternalStore(noop, soundsOn, () => true);
  const [override, setOverride] = useState<boolean | null>(null);
  const on = override ?? saved;
  const flip = () => {
    const next = !on;
    setSoundsOn(next);
    setOverride(next);
    if (next) sound.pop(7);
  };
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 id="sounds-heading" className="font-medium">
          Sounds
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Little sounds when you add, rate and let the UFO pick.</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby="sounds-heading"
        onClick={flip}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted ring-1 ring-border")}
      >
        <span className={cn("absolute top-1 left-1 size-5 rounded-full bg-foreground shadow transition-transform", on && "translate-x-5 bg-primary-foreground")} />
      </button>
    </div>
  );
}
