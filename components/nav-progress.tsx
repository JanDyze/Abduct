"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const BAR_AFTER = 200; // ms before the bar shows
const OVERLAY_AFTER = 1000; // ms before the UFO overlay shows
const GIVE_UP = 10000;

// When changing page takes a while, it shows: a thin orange bar along the top after a moment, then
// the UFO beaming over a dimmed page ("Beaming you there…"). Pages with a skeleton
// (loading.tsx) change almost at once, so this is for the slow cases. It starts on a tap on a link
// within the app and shows only while the address is still the one it started from, so it's gone
// the moment the new page arrives; it never blocks taps.
type Stage = "waiting" | "bar" | "overlay";
const addressOf = (path: string, query: string) => `${path}?${query}`;

export function NavProgress() {
  const here = addressOf(usePathname(), useSearchParams().toString());
  const [nav, setNav] = useState<{ from: string; stage: Stage } | null>(null);
  // Arrived (the address moved on): done with this one. Kept, it would show again on coming back
  // to the page it started from (Back, or a redirect) and stick there.
  if (nav && nav.from !== here) setNav(null);
  const stage = nav && nav.from === here ? nav.stage : "idle";
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    // In the capture phase: <Link> cancels the click's default to navigate in place, which would
    // hide it from a listener that runs after.
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      const from = addressOf(location.pathname, new URLSearchParams(location.search).toString());
      if (addressOf(url.pathname, url.searchParams.toString()) === from) return; // same page (or just a #hash)
      clear();
      const to = (next: Stage, after: Stage) => setNav((n) => (n && n.stage === after ? { ...n, stage: next } : n));
      setNav({ from, stage: "waiting" });
      timers.current.push(
        window.setTimeout(() => to("bar", "waiting"), BAR_AFTER),
        window.setTimeout(() => to("overlay", "bar"), OVERLAY_AFTER),
        window.setTimeout(() => setNav(null), GIVE_UP),
      );
    };
    // Back/Forward, or the page coming back from the browser's cache: whatever was loading isn't.
    const reset = () => {
      clear();
      setNav(null);
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", reset);
    window.addEventListener("pageshow", reset);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", reset);
      window.removeEventListener("pageshow", reset);
      clear();
    };
  }, []);

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-[70] h-[3px] overflow-hidden transition-opacity duration-300"
        style={{ opacity: stage === "bar" || stage === "overlay" ? 1 : 0 }}
      >
        <div className="nav-bar h-full w-1/3 rounded-full bg-primary shadow-[0_0_12px] shadow-primary" />
      </div>
      <div
        aria-hidden={stage !== "overlay"}
        role={stage === "overlay" ? "status" : undefined}
        className="pointer-events-none fixed inset-0 z-[65] flex flex-col items-center justify-center gap-5 bg-background/55 backdrop-blur-[2px] transition-opacity duration-300"
        style={{ opacity: stage === "overlay" ? 1 : 0 }}
      >
        {stage === "overlay" && (
          <>
            <div className="animate-hover relative h-40 w-44">
              <div
                className="beam animate-beam absolute top-[38px] left-1/2 h-32 w-32 -translate-x-1/2"
                style={{ clipPath: "polygon(41% 0, 59% 0, 100% 100%, 0 100%)" }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element -- a decorative SVG in an overlay */}
              <img src="/ship.svg" alt="" className="relative w-44" />
            </div>
            <p className="font-brand text-lg font-bold text-foreground/90">Beaming you there…</p>
          </>
        )}
      </div>
    </>
  );
}
