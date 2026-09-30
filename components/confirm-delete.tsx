"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";

// A delete that asks once: the first tap shows what will go and a real Delete button.
export function ConfirmDelete({
  action,
  fields,
  label,
  question,
}: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  question: string;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button type="button" variant="destructive" onClick={() => setAsking(true)} className="h-11 w-full rounded-xl">
        {label}
      </Button>
    );
  }
  return (
    <form action={action} className="animate-fade-in flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <p className="text-sm">{question}</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setAsking(false)} className="h-11 flex-1 rounded-xl">
          Keep it
        </Button>
        <SubmitButton variant="destructive" className="h-11 flex-1 rounded-xl bg-destructive text-background hover:bg-destructive/90">
          Delete
        </SubmitButton>
      </div>
    </form>
  );
}
