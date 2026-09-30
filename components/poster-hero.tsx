"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { setTappedPoster } from "@/lib/hero-poster";

const NAME = "poster-hero";

// Opening a title from its poster, the poster grows into the big one on the title's page (a shared
// view transition named "poster-hero", which that page's poster has; see Poster's `hero`). Only the
// poster that was tapped gets the name, when it's tapped: the same title can be on a page twice (in
// two rows), and two elements with one name would cancel the transition.
export function PosterHero() {
  const pathname = usePathname();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!link || !/^\/(titles|items)\//.test(link.getAttribute("href") ?? "")) return;
      const poster = link.querySelector<HTMLElement>("[data-poster]");
      if (!poster) return;
      for (const el of document.querySelectorAll<HTMLElement>("[data-poster]")) if (el.style.viewTransitionName === NAME) el.style.viewTransitionName = "";
      poster.style.viewTransitionName = NAME;
      // for the title page's loading skeleton, which shows this poster in the hero spot
      const name = link.getAttribute("aria-label")?.replace(/: details$/, "") ?? link.textContent?.trim() ?? "";
      setTappedPoster({ src: poster.querySelector("img")?.getAttribute("src") ?? null, name: name.slice(0, 120) });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Once the new page is in, nothing on it keeps the name by accident (Back to the same list).
  useEffect(() => {
    const timer = setTimeout(() => {
      for (const el of document.querySelectorAll<HTMLElement>("[data-poster]")) if (el.style.viewTransitionName === NAME) el.style.viewTransitionName = "";
    }, 900);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
