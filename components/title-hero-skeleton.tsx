"use client";

import { useState } from "react";
import Image from "next/image";
import { tappedPoster } from "@/lib/hero-poster";

// The top of a title page while it loads: the poster that was tapped, in the hero spot and carrying
// the hero's transition name, so the tap's poster grows into it; its name beside it if known.
export function TitleHeroSkeleton() {
  const [p] = useState(tappedPoster);
  return (
    <>
      <div className="relative -mx-4 mb-4 h-44 overflow-hidden">
        <div className="skeleton size-full opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
      </div>
      <div className="-mt-32 flex items-end gap-4">
        <div
          data-poster
          className="relative aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-xl bg-muted shadow-2xl shadow-black/60 ring-1 ring-border"
          style={{ viewTransitionName: "poster-hero" }}
        >
          {p?.src ? <Image src={p.src} alt="" fill sizes="200px" unoptimized priority className="object-cover" /> : <div className="skeleton size-full" />}
        </div>
        <div className="min-w-0 flex-1 pb-1">
          {p?.name ? <h2 className="font-brand text-2xl leading-tight font-bold text-balance">{p.name}</h2> : <div className="skeleton h-7 w-3/4 rounded-lg" />}
          <div className="skeleton mt-2 h-4 w-1/2 rounded-md" />
        </div>
      </div>
    </>
  );
}
