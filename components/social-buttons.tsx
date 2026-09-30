"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { Check, Heart, ListPlus, Loader2, Plus } from "lucide-react";
import { addExistingTitle, undoAdd } from "@/app/add/actions";
import { likeList } from "@/app/lists/actions";
import { ListIcon } from "@/components/list-icon";
import { useUndoToast } from "@/components/undo-toast";
import type { ListOption } from "@/lib/lists/icons";
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

// Puts a title on your lists: the big button adds it to one (your default, or the one you were
// adding to), and the button beside it opens all your lists, to put it on any of them. Tap a list
// again, or Undo, to take it back off. Once it's on one of your lists, links to your copy instead.
export function AddToMine({ titleId, yourItemId, target, lists }: { titleId: string; yourItemId: string | null; target: ListOption; lists: ListOption[] }) {
  const toast = useUndoToast();
  const [added, setAdded] = useState<Record<string, string>>({}); // list id -> the item on it
  const [busy, setBusy] = useState<string | null>(null); // the list being changed
  const [failed, setFailed] = useState(false);
  // Once you've added or undone something here, this button keeps its own state: the page refreshes
  // after an add and would otherwise swap it for "open it" before you could undo.
  const [touched, setTouched] = useState(false);
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

  const remove = async (list: ListOption, itemId: string) => {
    toast.hide();
    setBusy(list.id);
    const res = await undoAdd(itemId);
    if (!res.error)
      setAdded((a) => {
        const next = { ...a };
        delete next[list.id];
        return next;
      });
    setBusy(null);
  };

  const toggle = async (list: ListOption) => {
    setTouched(true);
    setFailed(false);
    if (added[list.id]) return remove(list, added[list.id]);
    setBusy(list.id);
    const res = await addExistingTitle(titleId, list.id);
    setBusy(null);
    if (!res.ok) return setFailed(true);
    setAdded((a) => ({ ...a, [list.id]: res.itemId }));
    if (!res.already) toast.show(`Added to ${list.name}`, () => remove(list, res.itemId));
  };

  const onTarget = Boolean(added[target.id]);
  const elsewhere = lists.filter((l) => l.id !== target.id && added[l.id]);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy === target.id}
          onClick={() => toggle(target)}
          className={cn(
            "flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl px-3 text-base font-semibold transition-transform active:scale-[0.98]",
            onTarget ? "border border-primary/40 bg-primary/10 text-primary" : "bg-primary text-primary-foreground",
          )}
        >
          {busy === target.id ? (
            <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
          ) : onTarget ? (
            <Check className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />
          ) : (
            <Plus className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />
          )}
          <span className="truncate">{onTarget ? `Added to ${target.name}` : `Add to ${target.name}`}</span>
        </button>
        {lists.length > 1 && (
          <Menu.Root>
            <Menu.Trigger
              aria-label="Add to another list"
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl border bg-card text-foreground transition-[transform,background-color] hover:bg-muted active:scale-95 data-popup-open:bg-muted"
            >
              <ListPlus className="size-5" aria-hidden />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner className="z-50 outline-none" sideOffset={6} align="end">
                <Menu.Popup
                  className={cn(
                    "w-64 origin-[var(--transform-origin)] rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-2xl shadow-black/60 outline-none",
                    "transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
                  )}
                >
                  <p className="px-2.5 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">Put it on…</p>
                  <div className="max-h-[min(20rem,var(--available-height))] overflow-y-auto">
                    {lists.map((l) => (
                      <Menu.Item
                        key={l.id}
                        onClick={() => toggle(l)}
                        disabled={busy === l.id}
                        className="flex cursor-default items-center gap-2.5 rounded-xl py-2 pr-3 pl-2 text-sm outline-none select-none data-highlighted:bg-muted"
                      >
                        <ListIcon icon={l.icon} color={l.color} className="size-6" />
                        <span className="min-w-0 flex-1 truncate">{l.name}</span>
                        {busy === l.id ? (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
                        ) : added[l.id] ? (
                          <Check className="size-4 text-primary" strokeWidth={2.5} aria-label="On it" />
                        ) : (
                          <Plus className="size-4 text-muted-foreground" aria-hidden />
                        )}
                      </Menu.Item>
                    ))}
                  </div>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        )}
      </div>
      {elsewhere.length > 0 && <p className="text-center text-xs text-muted-foreground">Also on {elsewhere.map((l) => l.name).join(", ")}</p>}
      {(onTarget || elsewhere.length > 0) && <p className="text-center text-xs text-muted-foreground">Added by mistake? Tap it again to take it off.</p>}
      {failed && <p className="text-center text-sm text-destructive">Couldn&apos;t add it. Try again.</p>}
      {toast.node}
    </div>
  );
}
