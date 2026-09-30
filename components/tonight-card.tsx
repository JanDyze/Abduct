"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { acceptPick, dismissPick } from "@/app/spin/actions";
import { Poster } from "@/components/poster";
import { useUndoToast } from "@/components/undo-toast";
import type { Kind } from "@/lib/titles/kinds";
import { sound } from "@/lib/sound";

// Home's "Tonight's pick", with a way to take it off: it goes at once, and Undo brings it back.
export function TonightCard({
  pick,
  className,
  style,
}: {
  pick: { pickId: string; name: string; posterUrl: string | null; kind: Kind };
  className?: string;
  style?: React.CSSProperties;
}) {
  const [hidden, setHidden] = useState(false);
  const [, start] = useTransition();
  const toast = useUndoToast();

  const remove = () => {
    setHidden(true);
    sound.whoosh();
    start(() => dismissPick(pick.pickId));
    toast.show("Tonight's pick removed", () => {
      toast.hide();
      setHidden(false);
      sound.pop(4);
      start(() => acceptPick(pick.pickId));
    });
  };

  return (
    <>
      {!hidden && (
        <div className={className} style={style}>
          <div className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            <Poster src={pick.posterUrl} name={pick.name} kind={pick.kind} className="w-11 shrink-0 rounded-lg" />
            <p className="min-w-0 flex-1 leading-tight">
              <span className="block text-xs text-muted-foreground">Tonight&apos;s pick</span>
              <span className="block truncate font-brand font-bold">{pick.name}</span>
            </p>
            <button
              type="button"
              onClick={remove}
              aria-label={`Remove ${pick.name} as tonight's pick`}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      )}
      {toast.node}
    </>
  );
}
