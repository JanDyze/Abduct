"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Check, Tv } from "lucide-react";
import { saveServices } from "@/app/settings/actions";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";

type Service = { key: string; name: string; logo: string | null };

// Settings: tap the streaming services you have. Saved as you tap.
export function ServicesPicker({ services, initial }: { services: Service[]; initial: string[] }) {
  const [mine, setMine] = useState(() => new Set(initial));
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const toggle = (key: string) => {
    const before = mine;
    const next = new Set(mine);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setMine(next);
    setError(null);
    sound.pop(next.has(key) ? 4 : -2);
    start(async () => {
      const res = await saveServices([...next]);
      if (res.error) {
        setMine(before);
        setError(res.error);
      }
    });
  };

  if (services.length === 0) return <p className="text-sm text-muted-foreground">The list of services isn&apos;t available right now.</p>;
  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {services.map((s) => {
          const on = mine.has(s.key);
          return (
            <li key={s.key}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(s.key)}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-xl border pr-3 pl-1.5 text-sm font-medium transition-[transform,background-color,border-color] active:scale-95",
                  on ? "border-primary/60 bg-primary/15 text-foreground" : "bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {s.logo ? (
                  <Image src={s.logo} alt="" width={28} height={28} unoptimized className={cn("size-7 rounded-lg object-contain", !on && "opacity-70 grayscale")} />
                ) : (
                  <Tv className="mx-1 size-5" aria-hidden />
                )}
                {s.name}
                {on && <Check className="size-4 text-primary" strokeWidth={2.5} aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}
