"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// A panel that slides up from the bottom of the screen (centered on a wide one), over a dimmed
// page: what holding a poster or a list opens. Base UI's Dialog does the focus, Escape and
// screen reader work; tapping the dimmed page closes it.
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  header,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  header?: React.ReactNode; // shown beside the title (a poster, a list's icon)
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-xl flex-col rounded-t-3xl border border-b-0 bg-popover text-popover-foreground shadow-2xl shadow-black/70 outline-none",
            "pb-[max(1rem,env(safe-area-inset-bottom))] select-none",
            "transition-[translate,opacity] duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)] data-ending-style:translate-y-full data-starting-style:translate-y-full",
            className,
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden />
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            {header}
            <div className="min-w-0 flex-1">
              <Dialog.Title className="line-clamp-2 font-brand text-lg leading-tight font-bold">{title}</Dialog.Title>
              {description && <Dialog.Description className="mt-0.5 truncate text-sm text-muted-foreground">{description}</Dialog.Description>}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto px-2 pb-1">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// A row in a sheet: an icon, a label (with a line under it), and something on the right.
export function SheetItem({
  icon,
  label,
  detail,
  trailing,
  tone,
  className,
  ...props
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  detail?: React.ReactNode;
  trailing?: React.ReactNode;
  tone?: "danger";
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex min-h-13 w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-[background-color,transform] hover:bg-muted active:scale-[0.99] disabled:opacity-50",
        "focus-visible:bg-muted focus-visible:outline-none",
        tone === "danger" && "text-destructive",
        className,
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.95rem] font-semibold">{label}</span>
        {detail && <span className="block truncate text-xs font-normal text-muted-foreground">{detail}</span>}
      </span>
      {trailing}
    </button>
  );
}
