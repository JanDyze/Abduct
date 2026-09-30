"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Heart, Loader2, Plus } from "lucide-react";
import { addExistingTitle, undoAdd } from "@/app/add/actions";
import { likeList } from "@/app/lists/actions";
import { useUndoToast } from "@/components/undo-toast";
import { cn } from "@/lib/utils";

// Like someone's public list; the count moves at once.
export function LikeButton({ listId, liked: initialLiked, likes: initialLikes }: { listId: string; liked: boolean; likes: number }) {
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={liked}
      onClick={() =>
        start(async () => {
          const next = !liked;
          setLiked(next);
          setLikes((n) => n + (next ? 1 : -1));
          const result = await likeList(listId, next);
          if (result.error) {
            setLiked(!next);
            setLikes((n) => n + (next ? -1 : 1));
          }
        })
      }
      className={cn(
        "flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-[transform,background-color] active:scale-95",
        liked ? "border-primary/40 bg-primary/15 text-primary" : "bg-card hover:bg-muted",
      )}
    >
      <Heart className={cn("size-4", liked && "fill-primary")} aria-hidden />
      {liked ? "Liked" : "Like"}
      <span className="tabular-nums text-muted-foreground">{likes}</span>
    </button>
  );
}

// Puts a title on one of your lists (your default, or the one you were adding to). Once it's on
// one of your lists, links to your copy instead. Tap it again, or Undo, to take it back off.
export function AddToMine({ titleId, yourItemId, listId, listName }: { titleId: string; yourItemId: string | null; listId: string; listName: string }) {
  const toast = useUndoToast();
  const [state, setState] = useState<"idle" | "adding" | "removing" | "failed" | { itemId: string }>("idle");
  // Once you've added or undone something here, this button keeps its own state: the page refreshes
  // after an add and would otherwise swap it for "open it" before you could undo.
  const [touched, setTouched] = useState(false);
  const added = typeof state === "object";
  const itemLink = touched ? null : yourItemId;
  if (itemLink) {
    return (
      <Link
        href={`/items/${itemLink}`}
        transitionTypes={["nav-forward"]}
        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 text-base font-semibold text-primary"
      >
        <Check className="size-5" strokeWidth={2.5} aria-hidden /> On your lists: open it
      </Link>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={state === "adding" || state === "removing"}
        onClick={async () => {
          setTouched(true);
          // Tapping it again once added takes it back off.
          if (added) {
            toast.hide();
            setState("removing");
            const res = await undoAdd(state.itemId);
            setState(res.error ? state : "idle");
            return;
          }
          setState("adding");
          const res = await addExistingTitle(titleId, listId);
          setState(res.ok ? { itemId: res.itemId } : "failed");
          if (res.ok && !res.already) {
            const itemId = res.itemId;
            toast.show(`Added to ${listName}`, async () => {
              setState("removing");
              const undone = await undoAdd(itemId);
              setState(undone.error ? { itemId } : "idle");
            });
          }
        }}
        className={cn(
          "flex h-12 items-center justify-center gap-2 rounded-2xl text-base font-semibold transition-transform active:scale-[0.98]",
          added ? "border border-primary/40 bg-primary/10 text-primary" : "bg-primary text-primary-foreground",
        )}
      >
        {state === "adding" || state === "removing" ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : added ? (
          <Check className="size-5" strokeWidth={2.5} aria-hidden />
        ) : (
          <Plus className="size-5" strokeWidth={2.5} aria-hidden />
        )}
        {added ? `Added to ${listName}` : `Add to ${listName}`}
      </button>
      {added && <p className="text-center text-xs text-muted-foreground">Added by mistake? Tap it again to take it off.</p>}
      {state === "failed" && <p className="text-center text-sm text-destructive">Couldn&apos;t add it. Try again.</p>}
      {toast.node}
    </div>
  );
}
