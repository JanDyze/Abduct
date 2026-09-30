"use client";

import { useActionState, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { createList, updateList } from "@/app/lists/actions";
import { ListBadge, ListIcon } from "@/components/list-icon";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { colorValue, DEFAULT_COLOR, LIST_COLORS, LIST_ICONS } from "@/lib/lists/icons";
import type { FormState } from "@/lib/lists/input";
import { cn } from "@/lib/utils";

// Name a list and give it a cover: an icon and a color, so it's easy to spot. The same form makes a
// new list and edits one.

// Icons shown before "All icons" is opened: three rows, so Save isn't a long scroll away.
const FEW_ICONS = 18;

export function ListForm({ list }: { list?: { id: string; name: string; icon: string; color: string } }) {
  const [state, action] = useActionState<FormState, FormData>(list ? updateList : createList, {});
  const [icon, setIcon] = useState<string>(list?.icon ?? "movie-night");
  const [color, setColor] = useState<string>(list?.color ?? DEFAULT_COLOR);
  const [name, setName] = useState(list?.name ?? "");
  const [allIcons, setAllIcons] = useState(false);
  // Closed, the grid still shows the chosen icon: in the last spot when it's not one of the first few.
  const chosen = LIST_ICONS.findIndex((i) => i.id === icon);
  const shownIcons = allIcons
    ? LIST_ICONS
    : chosen < FEW_ICONS
      ? LIST_ICONS.slice(0, FEW_ICONS)
      : [...LIST_ICONS.slice(0, FEW_ICONS - 1), LIST_ICONS[chosen]];

  return (
    <form action={action} className="flex flex-col gap-6">
      {list && <input type="hidden" name="id" value={list.id} />}
      <input type="hidden" name="icon" value={icon} />
      <input type="hidden" name="color" value={color} />

      <div className="flex items-center gap-3">
        <ListBadge icon={icon} color={color} className="size-16 rounded-2xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Date night, Anime backlog…"
            maxLength={40}
            required
            autoFocus={!list}
            aria-invalid={Boolean(state.errors?.name)}
            className="h-12 rounded-xl px-3.5 text-base"
          />
        </div>
      </div>
      {state.errors?.name && <p className="-mt-4 text-sm text-destructive">{state.errors.name}</p>}

      <fieldset>
        <legend className="mb-2.5 text-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2">
          {LIST_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={color === c.id}
              aria-label={c.label}
              title={c.label}
              onClick={() => setColor(c.id)}
              className={cn(
                "flex size-9 items-center justify-center rounded-full transition-transform active:scale-90",
                color === c.id && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
              )}
              style={{ background: c.value }}
            >
              {color === c.id && <Check className="size-5 text-black/70" strokeWidth={3} aria-hidden />}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2.5 text-sm font-medium">Icon</legend>
        <div id="list-icons" className="grid grid-cols-6 gap-2">
          {shownIcons.map((i) => (
            <button
              key={i.id}
              type="button"
              aria-pressed={icon === i.id}
              aria-label={i.label}
              title={i.label}
              onClick={() => setIcon(i.id)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl border transition-[transform,background-color,border-color] active:scale-90",
                icon === i.id ? "border-transparent" : "bg-card hover:bg-muted",
              )}
              style={icon === i.id ? { background: `color-mix(in oklch, ${colorValue(color)} 22%, var(--card))`, borderColor: colorValue(color) } : undefined}
            >
              <ListIcon icon={i.id} color={color} className="size-[68%]" />
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-expanded={allIcons}
          aria-controls="list-icons"
          onClick={() => setAllIcons(!allIcons)}
          className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {allIcons ? "Fewer icons" : `All ${LIST_ICONS.length} icons`}
          <ChevronDown className={cn("size-4 transition-transform", allIcons && "rotate-180")} aria-hidden />
        </button>
      </fieldset>

      {state.errors?.form && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.errors.form}
        </p>
      )}
      {/* Stays at the bottom of the screen while the form scrolls under it. */}
      <div className="sticky bottom-0 z-10 -mx-4 -mt-2 bg-gradient-to-t from-background from-70% to-transparent px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SubmitButton className="h-12 w-full rounded-xl text-base font-semibold">{list ? "Save" : "Make list"}</SubmitButton>
      </div>
    </form>
  );
}
