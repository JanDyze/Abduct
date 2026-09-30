"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { ShipBeam } from "@/components/ship-beam";

const WIDTH = 44; // the ship's width
const BEAM = 14;
const HEIGHT = WIDTH * (352 / 1122) + BEAM;
const OVERHANG = WIDTH * 0.3; // how far past the card's corner it sits
const EDGE = 4; // closest it comes to the side of the screen
const HOVER_DELAY = 120; // ms the mouse rests on a card before the ship comes over
const HOLD_DELAY = 200; // ms a finger rests on a card (without scrolling) before it comes over

type Side = "left" | "right";

// A card, for the ship to perch on: a rounded box with a fill or a border, big enough to hold it
// (cards, list rows, posters, buttons, fields). Icon buttons and bare text aren't.
function isCard(el: Element) {
  const r = el.getBoundingClientRect();
  if (r.width < 96 || r.height < 36) return false;
  const s = getComputedStyle(el);
  if (parseFloat(s.borderTopLeftRadius) < 8) return false;
  const filled = s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent";
  return filled || parseFloat(s.borderTopWidth) > 0 || el.tagName === "IMG";
}

function cardAround(target: EventTarget | null) {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    if (el.closest("header")) return null; // the top bar's buttons aren't cards
    if (isCard(el)) return el;
  }
  return null;
}

// How much of the screen the top bar covers (HideOnScroll keeps --header-offset up to date).
const headerBottom = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 56;

// The first (or last) card whose top is on screen: where the ship goes when a page opens, and
// where it moves to when scrolling takes its card away.
function cardOnScreen(which: "first" | "last") {
  const top = headerBottom();
  let found: Element | null = null;
  for (const el of document.querySelectorAll("main *")) {
    const r = el.getBoundingClientRect();
    if (r.top >= top && r.top < innerHeight - 80 && isCard(el)) {
      if (which === "first") return el;
      found = el;
    }
  }
  return found;
}

// Whether a card is still on screen, with room for the ship on it.
function inView(card: Element) {
  const r = card.getBoundingClientRect();
  return r.bottom > headerBottom() + HEIGHT && r.top < innerHeight - HEIGHT;
}

// A small UFO that keeps you company on pages without the big one (Home and Pick for me have
// theirs). It perches on a top corner of the card you're on (the corner nearer your pointer), beam
// shining down on it: the card you tap, hover over with a mouse, hold a finger on, or tab to.
// Scrolling, it follows: it rides along its card while that's on screen, and when the card leaves,
// it moves to the next card coming into view. It's the same shared element as the big
// ship (ShipBeam `flight`), so between pages it flies: out of Home's ship shrinking onto the new
// page's first card, from card to card, and back into the big ship.
export function ShipCompanion() {
  const ref = useRef<HTMLDivElement>(null);
  const perch = useRef<{ card: Element | null; side: Side }>({ card: null, side: "right" });
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Places the ship on its card, in page coordinates so it scrolls with it. Without a card it
  // waits under the top bar on the right.
  const place = (bank: boolean) => {
    const el = ref.current;
    if (!el) return;
    const { card, side } = perch.current;
    let left: number, top: number;
    if (card?.isConnected) {
      const r = card.getBoundingClientRect();
      left = side === "right" ? r.right - WIDTH + OVERHANG : r.left - OVERHANG;
      // the beam just touches the card's edge; once the card slides under the top bar, it stays on
      // the bar's bottom edge, riding along the card's corner
      top = scrollY + Math.max(r.top - HEIGHT + 4, headerBottom() - 8);
    } else {
      left = Math.min(innerWidth, 576 + (innerWidth - 576) / 2) - WIDTH - 12;
      top = scrollY + headerBottom() + 10;
    }
    left = Math.max(EDGE, Math.min(innerWidth - WIDTH - EDGE, left));
    const from = parseFloat(el.style.left);
    if (bank && Math.abs(left - from) > 24) {
      // banks into the turn, then levels out once it's there
      el.style.rotate = left > from ? "10deg" : "-10deg";
      clearTimeout(settle.current);
      settle.current = setTimeout(() => el && (el.style.rotate = "0deg"), 450);
    }
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  };

  // Before the page is shown, so the flight between pages lands where the ship will be.
  // Again once the page's cards have finished rising into place.
  useLayoutEffect(() => {
    perch.current = { card: cardOnScreen("first"), side: "right" };
    place(false);
    const again = setTimeout(() => place(false), 450);
    return () => clearTimeout(again);
  }, []);

  useEffect(() => {
    const perchOn = (target: EventTarget | null, x: number) => {
      const card = cardAround(target);
      if (!card) return;
      const r = card.getBoundingClientRect();
      perch.current = { card, side: x < r.left + r.width / 2 ? "left" : "right" };
      place(true);
    };
    // Hover and hold wait a moment, so passing over cards (or starting to scroll) doesn't drag the
    // ship around.
    let wait: ReturnType<typeof setTimeout> | undefined;
    let held = false; // a finger is down and hasn't started scrolling
    const later = (ms: number, target: EventTarget | null, x: number) => {
      clearTimeout(wait);
      wait = setTimeout(() => perchOn(target, x), ms);
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return perchOn(e.target, e.clientX);
      held = true;
      later(HOLD_DELAY, e.target, e.clientX);
    };
    // A tap too quick to count as holding still picks the card.
    const onUp = (e: PointerEvent) => {
      if (!held) return;
      held = false;
      clearTimeout(wait);
      perchOn(e.target, e.clientX);
    };
    // The finger started a scroll: that's not holding.
    const onCancel = () => {
      held = false;
      clearTimeout(wait);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") later(HOVER_DELAY, e.target, e.clientX);
      // a held finger sliding onto another card (touch keeps targeting where it went down)
      else if (held) later(HOLD_DELAY, document.elementFromPoint(e.clientX, e.clientY), e.clientX);
    };
    // Keyboard focus; a tap has already moved it.
    const onFocus = (e: FocusEvent) => {
      if (e.target instanceof Element && e.target.matches(":focus-visible")) perchOn(e.target, Infinity);
    };

    let frame = 0;
    let lastY = scrollY;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const down = scrollY >= lastY;
        lastY = scrollY;
        const { card, side } = perch.current;
        if (!card?.isConnected || !inView(card)) perch.current = { card: cardOnScreen(down ? "first" : "last"), side };
        place(false);
      });
    };
    const onResize = () => place(false);

    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onCancel, true);
    document.addEventListener("pointermove", onMove, { capture: true, passive: true });
    document.addEventListener("focusin", onFocus);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onCancel, true);
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("focusin", onFocus);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      clearTimeout(wait);
      cancelAnimationFrame(frame);
      clearTimeout(settle.current);
    };
  }, []);

  // Above the top bar and sticky bars (z-30 and under), below toasts (z-50).
  return (
    <div
      ref={ref}
      className="animate-ufo-hop pointer-events-none absolute z-40 transition-[left,top,rotate] duration-700 ease-[cubic-bezier(0.45,0,0.2,1)] motion-reduce:transition-none"
      style={{ "--bob": "-3px" } as React.CSSProperties}
    >
      <ShipBeam width={WIDTH} beam={BEAM} spread={26} beamClassName="animate-beam opacity-60" flight />
    </div>
  );
}
