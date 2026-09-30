"use client";

import { useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { setOnList } from "@/app/lists/actions";
import { ListIcon } from "@/components/list-icon";
import { colorValue, type ListOption } from "@/lib/lists/icons";
import { cn } from "@/lib/utils";

// Which of your lists a title is on, as chips to tap: how something added in a hurry (to your
// default list) gets sorted later. The list you opened it from stays put here; "Remove from ..."
// at the foot of the page takes it off that one.
export function ListToggles({
  titleId,
  currentListId,
  lists,
  onLists,
}: {
  titleId: string;
  currentListId: string;
  lists: (ListOption & { isDefault: boolean })[];
  onLists: string[];
}) {
  const [on, setOn] = useState(() => new Set(onLists));
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const onlyDefault = on.size === 1 && lists.find((l) => on.has(l.id))?.isDefault;

  const toggle = (listId: string) =>
    start(async () => {
      const next = !on.has(listId);
      const flip = (value: boolean) =>
        setOn((s) => {
          const copy = new Set(s);
          if (value) copy.add(listId);
          else copy.delete(listId);
          return copy;
        });
      flip(next);
      setError(null);
      const result = await setOnList(titleId, listId, next);
      if (result.error) {
        flip(!next);
        setError(result.error);
      }
    });

  if (lists.length < 2) return null;

  return (
    <section aria-labelledby="lists-heading" className="mt-6">
      <h2 id="lists-heading" className="font-brand text-lg font-bold">
        On your lists
      </h2>
      {onlyDefault && <p className="mt-0.5 text-sm text-muted-foreground">Added in a hurry? Tap a list to sort it there.</p>}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {lists.map((l) => {
          const here = l.id === currentListId;
          const checked = on.has(l.id);
          return (
            <button
              key={l.id}
              type="button"
              aria-pressed={checked}
              disabled={here}
              title={here ? "You opened it from this list" : undefined}
              onClick={() => toggle(l.id)}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full border pr-3.5 pl-2 text-sm font-medium transition-[transform,background-color,border-color] active:scale-95 disabled:cursor-default",
                checked ? "text-foreground" : "bg-card text-muted-foreground hover:text-foreground",
              )}
              style={checked ? { background: `color-mix(in oklch, ${colorValue(l.color)} 16%, var(--card))`, borderColor: colorValue(l.color) } : undefined}
            >
              <ListIcon icon={l.icon} color={l.color} className="size-6" />
              {l.name}
              {checked ? <Check className="size-4" strokeWidth={2.5} aria-hidden /> : <Plus className="size-4" aria-hidden />}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
