"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { Check, Heart, ListPlus, Loader2, Plus, X } from "lucide-react";
import { addExistingTitle, undoAdd } from "@/app/add/actions";
import { createNamedList, likeList } from "@/app/lists/actions";
import { ListIcon } from "@/components/list-icon";
import { useUndoToast } from "@/components/undo-toast";
import { abduct } from "@/lib/abduct";
import type { ListOption } from "@/lib/lists/icons";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";

// Like someone's public list; the count moves at once.
export function LikeButton({ listId, liked: initialLiked, likes: initialLikes }: { listId: string; liked: boolean; likes: number }) {
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={liked}
      onClick={() => {
        // the heart and count change at once; the save runs after
        const next = !liked;
        setLiked(next);
        setLikes((n) => n + (next ? 1 : -1));
        sound.pop(next ? 7 : -3);
        start(async () => {
          const result = await likeList(listId, next);
          if (result.error) {
            setLiked(!next);
            setLikes((n) => n + (next ? -1 : 1));
          }
        });
      }}
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
// adding to), and the button beside it opens all your lists, to put it on any of them or on a new
// one. Taps show at once (the server catches up); tap a list again, or Undo, to take it back off.
// Once it's on one of your lists, links to your copy instead.
const PENDING = "pending";

export function AddToMine({ titleId, yourItemId, target, lists }: { titleId: string; yourItemId: string | null; target: ListOption; lists: ListOption[] }) {
  const toast = useUndoToast();
  const [myLists, setMyLists] = useState(lists);
  const [added, setAdded] = useState<Record<string, string>>({}); // list id -> the item on it (or PENDING)
  const [failed, setFailed] = useState(false);
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [creating, startCreate] = useTransition();
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

  const without = (listId: string) => (a: Record<string, string>) => {
    const next = { ...a };
    delete next[listId];
    return next;
  };

  const remove = async (list: ListOption, itemId: string) => {
    toast.hide();
    sound.remove();
    setAdded(without(list.id));
    const res = await undoAdd(itemId);
    if (res.error) setAdded((a) => ({ ...a, [list.id]: itemId }));
  };

  const toggle = async (list: ListOption) => {
    setTouched(true);
    setFailed(false);
    const current = added[list.id];
    if (current === PENDING) return;
    if (current) return remove(list, current);
    setAdded((a) => ({ ...a, [list.id]: PENDING }));
    abduct(document.querySelector('[data-poster][style*="poster-hero"]'));
    const res = await addExistingTitle(titleId, list.id);
    if (!res.ok) {
      setAdded(without(list.id));
      sound.error();
      return setFailed(true);
    }
    setAdded((a) => ({ ...a, [list.id]: res.itemId }));
    if (!res.already) toast.show(`Added to ${list.name}`, () => remove(list, res.itemId));
  };

  const createAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    startCreate(async () => {
      const res = await createNamedList(newName);
      if ("error" in res) return setNameError(res.error);
      setMyLists((ls) => [...ls, res.list]);
      setNaming(false);
      setNewName("");
      await toggle(res.list);
    });
  };

  const onTarget = Boolean(added[target.id]);
  const elsewhere = myLists.filter((l) => l.id !== target.id && added[l.id]);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => toggle(target)}
          className={cn(
            "flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl px-3 text-base font-semibold transition-[transform,background-color,color] active:scale-[0.98]",
            onTarget ? "border border-primary/40 bg-primary/10 text-primary" : "bg-primary text-primary-foreground",
          )}
        >
          {onTarget ? <Check className="size-5 shrink-0" strokeWidth={2.5} aria-hidden /> : <Plus className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />}
          <span className="truncate">{onTarget ? `Added to ${target.name}` : `Add to ${target.name}`}</span>
        </button>
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
                  {myLists.map((l) => (
                    <Menu.Item
                      key={l.id}
                      onClick={() => toggle(l)}
                      closeOnClick={false}
                      className="flex cursor-default items-center gap-2.5 rounded-xl py-2 pr-3 pl-2 text-sm outline-none select-none data-highlighted:bg-muted"
                    >
                      <ListIcon icon={l.icon} color={l.color} className="size-6" />
                      <span className="min-w-0 flex-1 truncate">{l.name}</span>
                      {added[l.id] ? <Check className="size-4 text-primary" strokeWidth={2.5} aria-label="On it" /> : <Plus className="size-4 text-muted-foreground" aria-hidden />}
                    </Menu.Item>
                  ))}
                </div>
                <Menu.Separator className="my-1 h-px bg-border" />
                <Menu.Item
                  onClick={() => setNaming(true)}
                  className="flex cursor-default items-center gap-2.5 rounded-xl py-2 pr-3 pl-2.5 text-sm font-medium text-primary outline-none select-none data-highlighted:bg-muted"
                >
                  <Plus className="size-5" aria-hidden /> New list…
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
      {naming && (
        <form onSubmit={createAndAdd} className="animate-rise mt-1 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New list name"
            aria-label="New list name"
            maxLength={40}
            autoFocus
            className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-card px-3.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          />
          <button type="submit" disabled={creating || !newName.trim()} className="flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {creating && <Loader2 className="size-4 animate-spin" aria-hidden />} Make &amp; add
          </button>
          <button type="button" onClick={() => setNaming(false)} aria-label="Cancel" className="flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted">
            <X className="size-5" aria-hidden />
          </button>
        </form>
      )}
      {nameError && <p className="text-sm text-destructive">{nameError}</p>}
      {elsewhere.length > 0 && <p className="text-center text-xs text-muted-foreground">Also on {elsewhere.map((l) => l.name).join(", ")}</p>}
      {(onTarget || elsewhere.length > 0) && <p className="text-center text-xs text-muted-foreground">Added by mistake? Tap it again to take it off.</p>}
      {failed && <p className="text-center text-sm text-destructive">Couldn&apos;t add it. Try again.</p>}
      {toast.node}
    </div>
  );
}
