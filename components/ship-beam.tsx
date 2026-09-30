import { ViewTransition } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Where the beam leaves the level ship (public/ship.svg), as fractions of its box. brand/gen.py
// explains the numbers: the hole under the saucer is centred 48.2% across and 90.1% down.
const SHIP_RATIO = 352 / 1122;
const EMITTER_X = 0.482;
const EMITTER_Y = 0.901;
const HOLE = 0.1; // how wide the beam is where it leaves, as a share of the ship's width

// The ship, level, with its beam coming straight down out of the hole underneath. Sizes are in
// px and everything is placed from the ship's width, so the beam starts at the hole at any size.
// Ship and beam bob together, rocking about the hole. Its parent positions it (not with
// translate utilities, which the bob animation would override).
//
// `flight`: the ship flies between pages: it's a shared element named "ufo" (the big one on Home and
// Pick for me, the small one in a corner everywhere else, components/ship-companion.tsx), so going
// from one page to the next it moves and resizes into its new place while the page slides
// (::view-transition-*(.ufo-flight) in globals.css). A page must have only one. Only the ship flies;
// each page's beam is a different shape, so it fades in once the ship has arrived.
// `default="none"` keeps it still for every other update.
export function ShipBeam({
  width,
  beam,
  spread,
  beamClassName,
  className,
  priority,
  flight,
}: {
  width: number; // the ship's width
  beam: number; // how far down the beam reaches
  spread: number; // the beam's width at the bottom
  beamClassName?: string;
  className?: string;
  priority?: boolean;
  flight?: boolean;
}) {
  const shipHeight = width * SHIP_RATIO;
  const top = shipHeight * EMITTER_Y - 2; // tucked just inside the hole
  const x = width * EMITTER_X;
  const inset = ((spread - width * HOLE) / 2 / spread) * 100;
  return (
    <div aria-hidden className={cn("animate-hover relative", className)} style={{ width, height: top + beam, transformOrigin: `${x}px ${top}px` }}>
      <div className={cn("absolute inset-0", flight && "animate-beam-arrive")}>
        <div
          className={cn("beam absolute", beamClassName)}
          style={{ top, left: x - spread / 2, width: spread, height: beam, clipPath: `polygon(${inset}% 0, ${100 - inset}% 0, 100% 100%, 0 100%)` }}
        />
      </div>
      {flight ? (
        <ViewTransition name="ufo" share="ufo-flight" default="none">
          <Image src="/ship.svg" alt="" width={width} height={Math.round(shipHeight)} unoptimized priority={priority} className="relative" />
        </ViewTransition>
      ) : (
        <Image src="/ship.svg" alt="" width={width} height={Math.round(shipHeight)} unoptimized priority={priority} className="relative" />
      )}
    </div>
  );
}
