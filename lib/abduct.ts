import { sound } from "./sound";

// Adding a title, the UFO abducts it: a ship swoops over the poster, beams it up, lingers a moment
// over the card, then flies off. On pages with the little UFO (components/ship-companion.tsx) it's
// that one that goes, staying big until it heads home; elsewhere a ship flies in from off screen.
// The poster itself stays put: a glowing copy is what rises into the ship. Drawn on its own layer
// over the page, with its sound (lib/sound.ts); skipped with reduced motion.
const SHIP_RATIO = 352 / 1122;
const HOLE_X = 0.479, HOLE_Y = 0.904, HOLE_W = 0.149; // the lit hole, as in components/ship-beam.tsx

// The timeline, in ms.
const ARRIVE = 380; // swoops in over the poster
const BEAM_ON = 450, BEAM_FULL = 600; // the beam comes down
const LIFT_FROM = 600, LIFT_TO = 1200; // the copy rises into the ship
const BEAM_UP = 1250, BEAM_OFF = 1400; // the beam pulls back
const LEAVE = 2150; // lingers over the card until now, then heads home
const DURATION = 2600;

export function abduct(poster: Element | null | undefined) {
  if (!(poster instanceof HTMLElement) || typeof window === "undefined") return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = poster.getBoundingClientRect();
  if (r.width < 20 || r.bottom < 0 || r.top > innerHeight) return;

  const companion = document.querySelector<HTMLElement>("[data-ship-companion]");
  const home = companion?.getBoundingClientRect();
  const shipW = Math.round(Math.min(150, Math.max(72, r.width * 0.95)));
  const shipH = shipW * SHIP_RATIO;
  // hovering above the poster, low enough to stay on screen
  const x = r.left + r.width / 2 - shipW / 2;
  const y = Math.max(12, r.top - shipH - Math.min(60, r.height * 0.35));
  // where it comes from and goes back to: the little UFO's spot and size, or off the top right
  const homeScale = home && home.width ? Math.min(1, home.width / shipW) : 0.7;
  const [fx, fy] = home && home.width ? [home.left + (home.width - shipW) / 2, home.top] : [innerWidth + 40, -shipH - 40];

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden";

  const beamTop = y + shipH * HOLE_Y, beamBottom = r.bottom + 6;
  const topW = shipW * HOLE_W, bottomW = r.width * 1.15, cx = x + shipW * HOLE_X;
  const beam = document.createElement("div");
  beam.className = "beam";
  const inset = ((bottomW - topW) / 2 / bottomW) * 100;
  beam.style.cssText = `position:absolute;left:${cx - bottomW / 2}px;top:${beamTop}px;width:${bottomW}px;height:${beamBottom - beamTop}px;` +
    `clip-path:polygon(${inset}% 0,${100 - inset}% 0,100% 100%,0 100%);opacity:0;transform-origin:50% 0`;

  const copy = poster.cloneNode(true) as HTMLElement;
  copy.style.cssText = `position:absolute;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;` +
    "view-transition-name:none;transform-origin:50% 50%;opacity:0";

  const ship = new Image();
  ship.src = "/ship.svg";
  ship.alt = "";
  ship.style.cssText = `position:absolute;left:0;top:0;width:${shipW}px;transform-origin:50% 50%;transform:translate(${fx}px,${fy}px) scale(${homeScale})`;
  layer.append(beam, copy, ship);
  document.body.append(layer);
  if (companion) companion.style.visibility = "hidden";
  sound.abduct(LEAVE / 1000);

  const o = (ms: number) => ms / DURATION;
  const opts = { duration: DURATION, fill: "forwards" as const };
  const at = (px: number, py: number, s: number, deg: number) => `translate(${px}px,${py}px) scale(${s}) rotate(${deg}deg)`;
  // The ship's own timeline runs straight (no overall easing, which would bunch its steps toward the
  // start); each step eases on its own.
  ship.animate(
    [
      { transform: at(fx, fy, homeScale, 8), easing: "cubic-bezier(.2,.7,.3,1)" },
      { transform: at(x, y, 1, -3), offset: o(ARRIVE), easing: "ease-in-out" },
      { transform: at(x, y - 3, 1, 0), offset: o(LIFT_FROM), easing: "ease-in-out" },
      { transform: at(x, y + 3, 1.05, 0), offset: o(LIFT_TO), easing: "ease-out" }, // gulp
      { transform: at(x, y, 1, 0), offset: o(BEAM_OFF), easing: "ease-in-out" },
      // aboard: it stays put a moment, bobbing, still full size
      { transform: at(x, y - 5, 1, -2), offset: o(1650), easing: "ease-in-out" },
      { transform: at(x, y + 1, 1, 1.5), offset: o(1900), easing: "ease-in-out" },
      { transform: at(x, y - 2, 1, 0), offset: o(LEAVE), easing: "cubic-bezier(.5,0,.75,.3)" },
      { transform: at(fx, fy, homeScale, -8) },
    ],
    opts,
  );
  beam.animate(
    [
      { opacity: 0, transform: "scaleY(0)" },
      { opacity: 0, transform: "scaleY(0)", offset: o(BEAM_ON) },
      { opacity: 1, transform: "scaleY(1)", offset: o(BEAM_FULL) },
      { opacity: 0.85, offset: o(800) },
      { opacity: 1, offset: o(1000) },
      { opacity: 1, transform: "scaleY(1)", offset: o(BEAM_UP) },
      { opacity: 0, transform: "scaleY(.2)", offset: o(BEAM_OFF) },
      { opacity: 0, transform: "scaleY(0)" },
    ],
    opts,
  );
  const into = { x: x + shipW * HOLE_X - (r.left + r.width / 2), y: y + shipH * 0.8 - (r.top + r.height / 2) };
  copy.animate(
    [
      { opacity: 0, transform: "none", filter: "brightness(1)" },
      { opacity: 0, transform: "none", offset: o(LIFT_FROM) },
      { opacity: 1, transform: "translateY(-4px)", filter: "brightness(1.35)", offset: o(LIFT_FROM + 100) },
      { opacity: 1, transform: `translate(${into.x * 0.35}px,${into.y * 0.35}px) scale(.8) rotate(-4deg)`, filter: "brightness(1.6)", offset: o(900), easing: "cubic-bezier(.5,0,.8,.4)" },
      { opacity: 0, transform: `translate(${into.x}px,${into.y}px) scale(.08) rotate(6deg)`, filter: "brightness(2.2)", offset: o(LIFT_TO) },
      { opacity: 0, transform: `translate(${into.x}px,${into.y}px) scale(.08)` },
    ],
    opts,
  );
  window.setTimeout(() => {
    layer.remove();
    if (companion) companion.style.visibility = "";
  }, DURATION + 50);
}
