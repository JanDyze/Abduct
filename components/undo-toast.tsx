"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

type Toast = { id: number; text: string; undo: () => void };

const SHOW_FOR = 6000;

// "Added to Watchlist · Undo" along the bottom of the screen after an add, so a mistaken tap is
// easy to take back. One at a time; a new add replaces it, and it goes after a few seconds. It's
// drawn on the page body: inside the sliding page, "fixed" would pin it to the page, not the screen.
export function useUndoToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((text: string, undo: () => void) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), text, undo });
    timer.current = window.setTimeout(() => setToast(null), SHOW_FOR);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const node = toast ? createPortal(
    <div
      key={toast.id}
      role="status"
      className="animate-rise fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto flex w-[min(100%-2rem,28rem)] items-center gap-3 rounded-2xl border bg-popover py-2 pr-2 pl-4 shadow-2xl shadow-black/70"
    >
      <Check className="size-5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{toast.text}</p>
      <button
        type="button"
        onClick={() => {
          toast.undo();
          hide();
        }}
        className="h-10 shrink-0 rounded-xl bg-primary/15 px-4 text-sm font-semibold text-primary hover:bg-primary/25"
      >
        Undo
      </button>
    </div>,
    document.body,
  ) : null;

  return { show, hide, node };
}
