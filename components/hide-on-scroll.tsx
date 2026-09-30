"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const THRESHOLD = 8; // px of travel before the bar reacts, so small jitters don't flicker it

// The top bar slides away while scrolling down and comes back on the way up (always shown near the
// top). It publishes its visible height as --header-offset so sticky bars below it (filters, the
// card preview) move up into the space instead of leaving a gap.
export function HideOnScroll({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);
  const hiddenRef = useRef(false);

  const show = (next: boolean) => {
    const el = ref.current;
    if (!el) return;
    hiddenRef.current = !next;
    setHidden(!next);
    document.documentElement.style.setProperty("--header-offset", next ? `${el.offsetHeight}px` : "0px");
  };

  useEffect(() => {
    const el = ref.current!;
    const root = document.documentElement;
    root.style.setProperty("--header-offset", `${el.offsetHeight}px`);
    let last = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const travel = y - last;
        if (y <= el.offsetHeight) {
          if (hiddenRef.current) show(true);
          last = y;
        } else if (Math.abs(travel) >= THRESHOLD) {
          if (travel > 0 !== hiddenRef.current) show(travel < 0);
          last = y;
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      root.style.removeProperty("--header-offset");
    };
  }, []);

  return (
    <header
      ref={ref}
      style={style}
      onFocusCapture={() => hiddenRef.current && show(true)}
      className={cn(
        "transition-transform duration-300 ease-out motion-reduce:transition-none",
        hidden && "-translate-y-full",
        className,
      )}
    >
      {children}
    </header>
  );
}
