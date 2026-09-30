"use client";

import { useActionState } from "react";
import { saveDisplayName, type NameState } from "@/app/settings/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { MAX_DISPLAY_NAME } from "@/lib/social/name";

// The name others see with your public lists and comments.
export function NameForm({ name }: { name: string }) {
  const [state, action] = useActionState<NameState, FormData>(saveDisplayName, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="display-name" className="text-sm text-muted-foreground">
        Your name on Abduct
      </label>
      <div className="flex gap-2">
        <Input
          id="display-name"
          name="name"
          defaultValue={name}
          maxLength={MAX_DISPLAY_NAME}
          required
          aria-invalid={Boolean(state.error)}
          className="h-11 flex-1 rounded-xl px-3.5 text-base"
        />
        <SubmitButton className="h-11 rounded-xl px-4 font-semibold">Save</SubmitButton>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {state.error ?? (state.saved ? "Saved." : "Shown with lists you make public and comments others can see.")}
      </p>
    </form>
  );
}
