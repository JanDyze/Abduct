"use client";

import { useEffect } from "react";

const EDITABLE = "input, textarea, select, [contenteditable='true']";

// Holding a poster, link or text on a phone opens the browser's menu (Open in new tab, Save image,
// Copy). CSS stops it on iPhone (-webkit-touch-callout in globals.css) but not on Android, where
// the menu comes from the contextmenu event, so that's cancelled here for touch and pen. A mouse's
// right-click still works, and so does holding in a text field (to paste). Dragging a poster or
// link off the page is stopped too.
export function NoLongPressMenu() {
  useEffect(() => {
    let touch = false;
    const onDown = (e: PointerEvent) => {
      touch = e.pointerType !== "mouse";
    };
    const outsideFields = (target: EventTarget | null) => !(target instanceof Element && target.closest(EDITABLE));
    const onMenu = (e: MouseEvent) => {
      if (touch && outsideFields(e.target)) e.preventDefault();
    };
    const onDrag = (e: DragEvent) => {
      if (outsideFields(e.target)) e.preventDefault();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("contextmenu", onMenu);
    document.addEventListener("dragstart", onDrag);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("contextmenu", onMenu);
      document.removeEventListener("dragstart", onDrag);
    };
  }, []);
  return null;
}
