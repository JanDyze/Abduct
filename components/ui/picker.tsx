"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type PickerOption = { value: string; label: string; icon?: React.ReactNode };

// A dropdown in the app's own style (the browser's <select> looks out of place on the dark theme).
// Base UI's Select does the keyboard, screen reader and positioning work.
export function Picker({
  value,
  onChange,
  options,
  label,
  placeholder,
  className,
  disabled,
}: {
  value: string | null;
  onChange: (value: string) => void;
  options: PickerOption[];
  label: string; // for screen readers
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <Select.Root
      items={options.map(({ value, label }) => ({ value, label }))}
      value={value}
      onValueChange={(v) => typeof v === "string" && onChange(v)}
      disabled={disabled}
    >
      <Select.Trigger
        aria-label={label}
        className={cn(
          "flex h-10 min-w-0 items-center gap-2 rounded-xl border bg-card px-3 text-sm outline-none select-none",
          "transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 data-popup-open:bg-muted",
          className,
        )}
      >
        {selected?.icon}
        <Select.Value className="min-w-0 flex-1 truncate text-left data-placeholder:text-muted-foreground" placeholder={placeholder} />
        <Select.Icon className="shrink-0 text-muted-foreground">
          <ChevronsUpDown className="size-4" aria-hidden />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="z-50 outline-none" sideOffset={6} alignItemWithTrigger={false}>
          <Select.Popup
            className={cn(
              "min-w-[var(--anchor-width)] origin-[var(--transform-origin)] rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-2xl shadow-black/60 outline-none",
              "transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
            )}
          >
            <Select.List className="max-h-[min(22rem,var(--available-height))] overflow-y-auto">
              {options.map((o) => (
                <Select.Item
                  key={o.value}
                  value={o.value}
                  className="flex cursor-default items-center gap-2.5 rounded-xl py-2 pr-3 pl-2.5 text-sm outline-none select-none data-highlighted:bg-muted data-selected:font-semibold"
                >
                  {o.icon}
                  <Select.ItemText className="min-w-0 flex-1 truncate">{o.label}</Select.ItemText>
                  <Select.ItemIndicator className="shrink-0 text-primary">
                    <Check className="size-4" strokeWidth={2.5} aria-hidden />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
