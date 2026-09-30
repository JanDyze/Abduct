"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, GripVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ArrangeItem = { id: string; title: string; subtitle?: string; thumb: React.ReactNode };

const EDGE = 96; // px from the top / bottom of the screen where dragging scrolls the page
const SCROLL_SPEED = 10;

type Drag = { id: string; from: number; startY: number; startScroll: number; dy: number; clientY: number };

// Things in your own order: drag a row by its handle (the page scrolls when you near an edge), or
// focus a handle and use the arrow keys. Only the handle drags, so the page still scrolls normally
// under a thumb. Adapted from Kept's My verses arranging.
function ArrangeList({
  items,
  saving,
  error,
  onCancel,
  onDone,
}: {
  items: ArrangeItem[];
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onDone: (ids: string[]) => void;
}) {
  const [order, setOrder] = useState(() => items.map((v) => v.id));
  const [drag, setDrag] = useState<Drag | null>(null);
  const [announce, setAnnounce] = useState("");
  const firstRow = useRef<HTMLLIElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const byId = new Map(items.map((v) => [v.id, v]));
  const label = (id: string) => byId.get(id)?.title ?? "";

  // One row plus the gap between rows.
  const step = () => (firstRow.current ? firstRow.current.offsetHeight + 8 : 72);
  const targetOf = (d: Drag) => Math.max(0, Math.min(order.length - 1, Math.round(d.from + d.dy / step())));

  const update = (d: Drag | null) => {
    dragRef.current = d;
    setDrag(d);
  };

  // While dragging near an edge, scroll the page and keep the row under the finger.
  useEffect(() => {
    if (!drag) return;
    let frame = requestAnimationFrame(function tick() {
      const d = dragRef.current;
      if (!d) return;
      const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 0;
      const by = d.clientY < top + EDGE ? -SCROLL_SPEED : d.clientY > window.innerHeight - EDGE ? SCROLL_SPEED : 0;
      if (by) {
        window.scrollBy(0, by);
        update({ ...d, dy: d.clientY - d.startY + (window.scrollY - d.startScroll) });
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [drag?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function move(id: string, to: number) {
    setOrder((list) => {
      const next = list.filter((x) => x !== id);
      next.splice(to, 0, id);
      return next;
    });
  }

  function start(e: React.PointerEvent, id: string, from: number) {
    e.currentTarget.setPointerCapture(e.pointerId);
    navigator.vibrate?.(8);
    update({ id, from, startY: e.clientY, startScroll: window.scrollY, dy: 0, clientY: e.clientY });
  }
  function follow(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    update({ ...d, clientY: e.clientY, dy: e.clientY - d.startY + (window.scrollY - d.startScroll) });
  }
  function drop() {
    const d = dragRef.current;
    if (!d) return;
    const to = targetOf(d);
    move(d.id, to);
    if (to !== d.from) setAnnounce(`${label(d.id)} moved to ${to + 1} of ${order.length}`);
    update(null);
  }
  function nudge(e: React.KeyboardEvent, id: string, at: number) {
    const to = e.key === "ArrowUp" ? at - 1 : e.key === "ArrowDown" ? at + 1 : -1;
    if (to < 0 || to >= order.length) return;
    e.preventDefault();
    move(id, to);
    setAnnounce(`${label(id)} moved to ${to + 1} of ${order.length}`);
    requestAnimationFrame(() => document.getElementById(`grip-${id}`)?.focus());
  }

  const target = drag ? targetOf(drag) : -1;

  return (
    <>
      <div className="sticky top-(--header-offset) z-20 -mx-4 -mt-2 flex items-center gap-2 bg-background/85 px-4 pt-3 pb-3 backdrop-blur-md transition-[top] duration-300 ease-out">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-10 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Cancel
        </button>
        <p className="flex-1 text-center text-sm font-medium">Drag to arrange</p>
        <button
          type="button"
          onClick={() => onDone(order)}
          disabled={saving}
          className="inline-flex h-10 min-w-20 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-70"
        >
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Done
        </button>
      </div>
      {error && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <ol className="mt-1 flex flex-col gap-2" aria-label="Your order">
        {order.map((id, i) => {
          const v = byId.get(id)!;
          const dragging = drag?.id === id;
          let shift = 0;
          if (drag && !dragging) {
            if (drag.from < target && i > drag.from && i <= target) shift = -1;
            if (drag.from > target && i >= target && i < drag.from) shift = 1;
          }
          return (
            <li
              key={id}
              ref={i === 0 ? firstRow : undefined}
              className={cn(
                "relative flex h-16 items-center gap-3 rounded-2xl border bg-card pr-1 pl-2 select-none",
                dragging ? "z-10 scale-[1.02] shadow-[0_12px_30px_-10px_rgb(0_0_0/0.6)]" : "transition-transform duration-200 ease-out",
              )}
              style={{ transform: dragging ? `translateY(${drag.dy}px)` : shift ? `translateY(${shift * step()}px)` : undefined }}
            >
              <span className="flex h-12 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg" aria-hidden>
                {v.thumb}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-brand text-base leading-tight font-bold">{v.title}</span>
                {v.subtitle && <span className="block truncate text-sm text-muted-foreground">{v.subtitle}</span>}
              </span>
              <button
                id={`grip-${id}`}
                type="button"
                aria-label={`Move ${v.title}, ${i + 1} of ${order.length}`}
                onPointerDown={(e) => start(e, id, i)}
                onPointerMove={follow}
                onPointerUp={drop}
                onPointerCancel={drop}
                onKeyDown={(e) => nudge(e, id, i)}
                className={cn(
                  "flex h-14 w-11 shrink-0 touch-none items-center justify-center rounded-xl text-muted-foreground",
                  "cursor-grab hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing",
                )}
              >
                <GripVertical className="size-5" aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </>
  );
}

// A section you can switch into arranging: shows `children` (the normal view) with an Arrange
// button, or the rows to drag. `save` gets the new order; the page reloads with it.
export function Arrangeable({
  items,
  save,
  children,
  className,
}: {
  items: ArrangeItem[];
  save: (ids: string[]) => Promise<{ error?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [arranging, setArranging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  if (arranging) {
    return (
      <ArrangeList
        items={items}
        saving={saving}
        error={error}
        onCancel={() => {
          setArranging(false);
          setError(null);
        }}
        onDone={(ids) =>
          startSaving(async () => {
            const unchanged = ids.every((id, i) => id === items[i]?.id);
            const result = unchanged ? {} : await save(ids);
            if (result.error) return setError(result.error);
            setArranging(false);
            setError(null);
            router.refresh();
          })
        }
      />
    );
  }
  return (
    <div className={className}>
      {items.length > 1 && (
        <div className="-mt-1 mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => setArranging(true)}
            className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowUpDown className="size-4" aria-hidden /> Arrange
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
