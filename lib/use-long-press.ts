"use client";

import { useEffect, useRef } from "react";

const HOLD_FOR = 450; // ms
const SLOP = 10; // px a finger can drift before it counts as a scroll, not a hold

// Holding something down (a poster, a list) for its extra options. Spread the handlers on the
// element; `onHold` runs once the finger has stayed put long enough, with a little buzz. The tap
// that ends a hold is swallowed, so holding a link doesn't also open it. A right-click, or the
// keyboard's menu key, counts as a hold too, so it works without a touch screen.
export function useLongPress(onHold: () => void) {
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const held = useRef(false);
  const touch = useRef(false);
  const hold = useRef(onHold);
  useEffect(() => {
    hold.current = onHold;
  });
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const cancel = () => {
    window.clearTimeout(timer.current);
    start.current = null;
  };
  const fire = () => {
    held.current = true;
    navigator.vibrate?.(12);
    hold.current();
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      held.current = false;
      touch.current = e.pointerType !== "mouse";
      if (!touch.current && e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY };
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        start.current = null;
        fire();
      }, HOLD_FOR);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = start.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > SLOP) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onClickCapture: (e: React.MouseEvent) => {
      if (!held.current) return;
      held.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (held.current) return; // a touch hold also raises this on Android, after it fired
      cancel();
      fire();
      // a right-click or the menu key brings no click after it to swallow
      if (!touch.current) held.current = false;
    },
  };
}
