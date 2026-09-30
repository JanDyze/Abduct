"use client";

import { useActionState, useState } from "react";
import { addManualTitle } from "@/app/add/actions";
import { KIND_ICON } from "@/components/poster";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/lists/input";
import { KIND_LABEL, KINDS, type Kind } from "@/lib/titles/kinds";
import { cn } from "@/lib/utils";

// A title the catalogs don't have: its name, what it is, and (if known) the year.
export function ManualForm({ listId }: { listId: string }) {
  const [state, action] = useActionState<FormState, FormData>(addManualTitle, {});
  const [kind, setKind] = useState<Kind>("movie");

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="listId" value={listId} />
      <input type="hidden" name="kind" value={kind} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Title</Label>
        <Input id="name" name="name" required maxLength={200} autoFocus aria-invalid={Boolean(state.errors?.name)} className="h-12 rounded-xl px-3.5 text-base" />
        {state.errors?.name && <p className="text-sm text-destructive">{state.errors.name}</p>}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">It&apos;s a</legend>
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => {
            const Icon = KIND_ICON[k];
            return (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border bg-card text-sm font-medium transition-colors",
                  kind === k ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {KIND_LABEL[k]}
              </button>
            );
          })}
        </div>
        {state.errors?.kind && <p className="mt-2 text-sm text-destructive">{state.errors.kind}</p>}
      </fieldset>
      <div className="flex flex-col gap-2">
        <Label htmlFor="year">
          Year <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input id="year" name="year" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="2019" aria-invalid={Boolean(state.errors?.year)} className="h-12 w-32 rounded-xl px-3.5 text-base" />
        {state.errors?.year && <p className="text-sm text-destructive">{state.errors.year}</p>}
      </div>
      {state.errors?.form && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.errors.form}
        </p>
      )}
      <SubmitButton className="h-12 rounded-xl text-base font-semibold">Add to list</SubmitButton>
    </form>
  );
}
