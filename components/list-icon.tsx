import { colorValue, iconLabel } from "@/lib/lists/icons";
import { cn } from "@/lib/utils";

// One of the list icons (public/list-icons.svg), its orange parts in the list's color. Decorative
// unless given `label`.
export function ListIcon({ icon, color, label, className }: { icon: string; color: string; label?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("size-6 shrink-0", className)}
      style={{ "--icon-accent": colorValue(color) } as React.CSSProperties}
      {...(label ? { role: "img", "aria-label": iconLabel(icon) } : { "aria-hidden": true })}
    >
      <use href={`/list-icons.svg#${icon}`} />
    </svg>
  );
}

// The icon on a soft tile of the list's color: how a list shows up in cards, headers and pickers.
export function ListBadge({ icon, color, className, iconClassName }: { icon: string; color: string; className?: string; iconClassName?: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", className)}
      style={{ background: `color-mix(in oklch, ${colorValue(color)} 18%, var(--card))` }}
    >
      <ListIcon icon={icon} color={color} className={cn("size-[70%]", iconClassName)} />
    </span>
  );
}
