// Run from the project root: node brand/extra_icons.mjs
// Hand-drawn list icons that aren't on "Abduct Icons.png". Same look as the traced ones: flat
// shapes in two tones, the accent (var(--icon-accent), the list's color) and the cream
// (var(--icon-base)). Writes them into public/list-icons.svg between the EXTRA markers, so run it
// again after brand/trace_icons.py regenerates the sprite. Each icon is drawn on a 100 x 100 grid.
import fs from "node:fs";

const SPRITE = "public/list-icons.svg";
const ACC = "var(--icon-accent, #FBA825)";
const BASE = "var(--icon-base, #FEECD2)";

const n = (v) => +v.toFixed(1);
const fill = (c) => (d) => `<path fill="${c}" fill-rule="evenodd" d="${d}"/>`;
const line = (c) => (d, w) => `<path fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" d="${d}"/>`;
const A = fill(ACC), B = fill(BASE), sA = line(ACC), sB = line(BASE);
const g = (transform, ...kids) => `<g transform="${transform}">${kids.join("")}</g>`;
const ellipse = (c) => (cx, cy, rx, ry, rot = 0) => `<ellipse fill="${c}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ""}/>`;
const eA = ellipse(ACC), eB = ellipse(BASE);

const circle = (cx, cy, r) => `M${n(cx - r)} ${n(cy)}a${r} ${r} 0 1 0 ${n(2 * r)} 0a${r} ${r} 0 1 0 ${n(-2 * r)} 0Z`;
const rect = (x, y, w, h, r = 0) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${2 * r - w}a${r} ${r} 0 0 1 ${-r} ${-r}v${2 * r - h}a${r} ${r} 0 0 1 ${r} ${-r}Z`;
const poly = (pts) => "M" + pts.map(([x, y]) => `${n(x)} ${n(y)}`).join("L") + "Z";
const polar = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
const star = (cx, cy, points, ro, ri, rot = -90) =>
  poly(Array.from({ length: points * 2 }, (_, i) => polar(cx, cy, i % 2 ? ri : ro, rot + (i * 180) / points)));
const mirror = (d) => d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (_, x, y) => `${n(100 - +x)} ${y}`);

// The bones of a crossbones pair: a thick line with a double knob at each end.
function bone(x1, y1, x2, y2) {
  const len = Math.hypot(x2 - x1, y2 - y1), px = (-(y2 - y1) / len) * 4, py = ((x2 - x1) / len) * 4;
  return sA(`M${x1} ${y1}L${x2} ${y2}`, 7) + [[x1, y1], [x2, y2]].map(([x, y]) => A(circle(x + px, y + py, 4.6) + circle(x - px, y - py, 4.6))).join("");
}

// An annular sector (one blade of the radiation trefoil).
function sector(cx, cy, ri, ro, a1, a2) {
  const [x1, y1] = polar(cx, cy, ro, a1), [x2, y2] = polar(cx, cy, ro, a2), [x3, y3] = polar(cx, cy, ri, a2), [x4, y4] = polar(cx, cy, ri, a1);
  return `M${n(x4)} ${n(y4)}L${n(x1)} ${n(y1)}A${ro} ${ro} 0 0 1 ${n(x2)} ${n(y2)}L${n(x3)} ${n(y3)}A${ri} ${ri} 0 0 0 ${n(x4)} ${n(y4)}Z`;
}

// A waving checkered flag: a grid of cells whose corners follow a wave.
function checkered() {
  const cols = 5, rows = 4, x0 = 26, x1 = 90, y0 = 14, h = 40;
  const at = (c, r) => {
    const x = x0 + ((x1 - x0) * c) / cols;
    return [x, y0 + (h * r) / rows + 5 * Math.sin(((x - x0) / (x1 - x0)) * Math.PI * 2)];
  };
  let a = "", b = "";
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const cell = poly([at(c, r), at(c + 1, r), at(c + 1, r + 1), at(c, r + 1)]);
      if ((r + c) % 2) a += cell;
      else b += cell;
    }
  return B(b) + A(a);
}

const ICONS = {
  zombies: [
    sB("M40 50L36 24", 9), sB("M48.5 48L48 16", 9), sB("M57 48L60 20", 9), sB("M63 54L70 32", 8), sB("M38 66L25 52", 8.5),
    B(rect(35, 46, 30, 30, 9)),
    sA("M42 60L58 58", 2.5), sA("M46 56L46.5 62M50 55.5L50.5 61.5M54 55L54.5 61", 2),
    A("M30 70L36 74.5L42 69.5L49 74.5L56 69.5L63 74.5L70 70L71 86L29 86Z"),
    B("M6 94C10 82 22 80 34 82L66 82C78 80 90 82 94 94Z"),
    A(circle(20, 89, 2.2) + circle(80, 89.5, 2) + circle(70, 91.5, 1.6)),
  ],
  comics: [
    g("rotate(-8 50 50)", A(star(50, 50, 12, 46, 33))),
    B("M44 26Q44 22 48 22L52 22Q56 22 56 26L54 57Q53.5 61 50 61Q46.5 61 46 57Z"),
    B(circle(50, 71, 5.5)),
  ],
  swords: [45, -45].map((deg) =>
    g(`rotate(${deg} 50 50)`, B("M45 20L50 5L55 20L55 64L45 64Z"), A(rect(34, 64, 32, 7, 3.5)), A(rect(46, 71, 8, 15, 2)), A(circle(50, 90, 5))),
  ),
  guns: [
    g(
      "translate(1 -7)",
      B("M16 46L42 46L35 86Q34 91 29 91L13 91Q7.5 91 8.5 85.5Z"),
      sA("M42 47L42 58Q42 65 49 65L58 65Q63 65 63 60L63 47", 5),
      sB("M52 49Q49.5 55 51.5 60", 3.5),
      A(rect(10, 30, 80, 18, 4)),
      A(rect(80, 25, 6, 7, 1.5) + rect(13, 26, 6, 6, 1.5)),
      sB("M19 34L19 43M24 34L24 43M29 34L29 43", 2.2),
    ),
  ],
  aliens: [
    B("M50 8C74 8 88 26 86 46C84 66 64 90 50 92C36 90 16 66 14 46C12 26 26 8 50 8Z"),
    A("M24 46C26 36 40 38 44 50C44 58 34 60 28 56C24 53 23 50 24 46Z"),
    A(mirror("M24 46C26 36 40 38 44 50C44 58 34 60 28 56C24 53 23 50 24 46Z")),
    sA("M44 76Q50 79 56 76", 3),
  ],
  robots: [
    sA("M50 22L50 10", 4), A(circle(50, 8, 5)),
    A(rect(9, 38, 10, 20, 3) + rect(81, 38, 10, 20, 3)),
    A(rect(42, 72, 16, 10, 0)),
    A("M30 82L70 82Q78 82 78 90L78 95L22 95L22 90Q22 82 30 82Z"),
    B(rect(18, 20, 64, 54, 12)),
    A(circle(36, 42, 8) + circle(64, 42, 8)),
    A(rect(33, 56, 34, 9, 3)),
    sB("M42 57.5L42 63.5M50 57.5L50 63.5M58 57.5L58 63.5", 2.5),
  ],
  vampires: [
    g(
      "translate(0 5.5)",
      A("M50 31L45 22L43 32C34 28 16 28 4 46C10 43 17 44 20 49C25 44 32 45 35 51C39 47 45 49 46 57L50 66L54 57C55 49 61 47 65 51C68 45 75 44 80 49C83 44 90 43 96 46C84 28 66 28 57 32L55 22Z"),
      B(circle(46.5, 37, 1.9) + circle(53.5, 37, 1.9)),
    ),
  ],
  pirates: [
    bone(20, 62, 80, 90), bone(80, 62, 20, 90),
    B(
      "M50 8C31 8 20 21 20 37C20 47 25 54 32 57L32 64Q32 69 37 69L63 69Q68 69 68 64L68 57C75 54 80 47 80 37C80 21 69 8 50 8Z" +
        circle(38, 38, 8) + circle(62, 38, 8) + "M50 46L46 54L54 54Z" + rect(42, 60, 2.6, 6, 1) + rect(48.7, 60, 2.6, 6, 1) + rect(55.4, 60, 2.6, 6, 1),
    ),
  ],
  ninjas: [
    A(circle(48, 54, 38)),
    A("M76 26L94 12L92 28Z"), A("M82 32L98 30L90 42Z"),
    B(rect(14, 40, 68, 20, 10)),
    A("M24 46L42 50Q40 55 33 55Q26 54 24 46Z"),
    A(mirror("M24 46L42 50Q40 55 33 55Q26 54 24 46Z").replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (_, x, y) => `${n(+x - 4)} ${y}`)),
  ],
  slasher: [
    g(
      "rotate(35 50 52)",
      B("M42 62L42 10Q56 18 58 38L58 62Z"),
      A("M42 10Q50 14 53 21L53 30Q53 33 50.5 33Q48 33 48 30L48 27Q47.5 38 45 38Q42 38 42 34Z"),
      A(rect(40, 62, 20, 5, 1.5)),
      A(rect(43, 67, 14, 27, 5)),
      B(circle(50, 74, 2) + circle(50, 86, 2)),
    ),
  ],
  explosive: [
    A(circle(44, 58, 32)),
    g("rotate(45 64 30)", A(rect(56, 23, 16, 14, 3))),
    sB("M68 24Q72 12 82 15", 4),
    B(star(86, 13, 8, 9, 3.5)),
    sB("M24 52Q26 40 36 35", 5),
  ],
  spies: [
    g(
      "translate(0 6)",
      A("M24 44C24 24 30 14 38 16Q50 22 62 16C70 14 76 24 76 44Q50 38 24 44Z"),
      A("M6 46Q50 34 94 46Q95 52 88 52Q50 43 12 52Q5 52 6 46Z"),
      B("M24.6 36Q50 30 75.4 36L76 44Q50 38 24 44Z"),
      sB("M14 60L86 60", 4),
      B("M18 60L46 60Q46 76 33 76Q20 76 18 60Z"),
      B(mirror("M18 60L46 60Q46 76 33 76Q20 76 18 60Z")),
      sB("M44 62Q50 57 56 62", 4),
      sA("M24 64L28 68M60 64L64 68", 2.5),
    ),
  ],
  rockets: [
    g(
      "rotate(45 50 52)",
      A("M40 74L60 74Q61 88 50 97Q39 88 40 74Z"),
      A("M36 52L22 70L22 82L36 72Z"), A("M64 52L78 70L78 82L64 72Z"),
      B("M50 6C62 18 64 34 64 52L64 74L36 74L36 52C36 34 38 18 50 6Z"),
      A(circle(50, 38, 8)),
      B(circle(50, 38, 4)),
      A(rect(36, 60, 28, 5, 0)),
    ),
  ],
  games: [
    g(
      "translate(0 -6)",
      A("M28 30L72 30C86 30 94 44 96 62C98 76 90 84 82 80C76 77 72 68 66 66L34 66C28 68 24 77 18 80C10 84 2 76 4 62C6 44 14 30 28 30Z"),
      B(rect(24.5, 38, 7, 20, 2) + rect(18, 44.5, 20, 7, 2)),
      B(circle(72, 41, 4) + circle(80, 48.5, 4) + circle(64, 48.5, 4) + circle(72, 56, 4)),
    ),
  ],
  anime: [
    B("M50 12C56 12 60 16 64 22L88 66C94 78 88 88 74 88L26 88C12 88 6 78 12 66L36 22C40 16 44 12 50 12Z"),
    A("M33 62L67 62L67 88L33 88Z"),
    A(circle(40, 46, 3.6) + circle(60, 46, 3.6)),
    sA("M46 52Q50 56 54 52", 2.5),
  ],
  books: [
    g(
      "translate(0 -4)",
      A("M50 32C40 26 20 24 5 28L5 86C22 82 40 84 50 90C60 84 78 82 95 86L95 28C80 24 60 26 50 32Z"),
      B("M49 26C40 20 24 18 10 22L10 78C24 74 40 76 49 82Z"),
      B(mirror("M49 26C40 20 24 18 10 22L10 78C24 74 40 76 49 82Z")),
      sA("M18 36C27 34 35 35 41 38M18 48C27 46 35 47 41 50M18 60C27 58 35 59 41 62", 2.5),
      sA(mirror("M18 36C27 34 35 35 41 38M18 48C27 46 35 47 41 50M18 60C27 58 35 59 41 62"), 2.5),
    ),
  ],
  series: [
    g(
      "translate(0 3)",
      sA("M36 8L50 21L64 8", 4),
      A(rect(22, 80, 12, 8, 2) + rect(66, 80, 12, 8, 2)),
      A(rect(8, 21, 84, 60, 10)),
      B(rect(15, 28, 60, 46, 6)),
      A(poly([[39, 40], [39, 62], [56, 51]])),
      B(circle(83.5, 40, 3.5) + circle(83.5, 52, 3.5)),
    ),
  ],
  classics: [
    g(
      "rotate(-16 13 38)",
      A(rect(12, 26, 76, 12, 3)),
      B([20, 38, 56, 74].map((x) => poly([[x - 6, 26], [x + 3, 26], [x + 9, 38], [x, 38]])).join("")),
    ),
    A(rect(12, 40, 76, 50, 5)),
    B([20, 38, 56, 74].map((x) => poly([[x, 40], [x + 9, 40], [x + 3, 52], [x - 6, 52]])).join("")),
    B(rect(18, 58, 64, 26, 3)),
    sA("M25 66L60 66M25 76L48 76", 3),
  ],
  awards: [
    sA("M27 20L17 20Q12 20 12 26Q12 40 29 44", 5),
    sA(mirror("M27 20L17 20Q12 20 12 26Q12 40 29 44"), 5),
    A("M26 12L74 12L74 34C74 50 64 60 50 62C36 60 26 50 26 34Z"),
    A(rect(45, 60, 10, 14, 0)),
    B(rect(33, 72, 34, 8, 2) + rect(26, 80, 48, 10, 3)),
    B(star(50, 34, 5, 11, 4.6)),
  ],
  animals: [
    B("M50 50C62 50 74 62 74 74C74 84 66 88 58 86C54 85 52 84 50 84C48 84 46 85 42 86C34 88 26 84 26 74C26 62 38 50 50 50Z"),
    eA(21, 47, 8, 10.5, -25), eA(37, 28, 8.5, 11.5, -8), eA(63, 28, 8.5, 11.5, 8), eA(79, 47, 8, 10.5, 25),
  ],
  kids: [
    A(circle(25, 26, 12) + circle(75, 26, 12)),
    B(circle(25, 26, 6) + circle(75, 26, 6)),
    A(circle(50, 52, 34) + circle(37, 44, 4.2) + circle(63, 44, 4.2)),
    eB(50, 64, 16, 12),
    eA(50, 59, 6, 4.5),
    sA("M50 63L50 67M44 69Q50 73 56 69", 2.5),
  ],
  trending: [
    A("M50 6C56 22 76 32 78 58C80 78 66 94 50 94C34 94 20 80 22 60C23 48 30 40 34 34C35 44 38 50 44 52C42 36 44 18 50 6Z"),
    B("M50 50C54 60 64 66 64 76C64 86 57 92 50 92C43 92 36 86 36 77C36 68 44 64 46 56C48 60 49 58 50 50Z"),
  ],
  magic: [
    A("M30 70Q50 80 70 70L78 89Q79 93 75 93L25 93Q21 93 22 89Z"),
    B(circle(50, 44, 32)),
    A(star(40, 38, 4, 10, 2.8) + star(61, 55, 4, 6.5, 1.9) + star(63, 27, 4, 5, 1.5)),
  ],
  "time-travel": [
    B("M26 18L74 18C74 36 58 44 56 50C58 56 74 64 74 82L26 82C26 64 42 56 44 50C42 44 26 36 26 18Z"),
    A("M36 30L64 30C60 38 54 42 50 46C46 42 40 38 36 30Z"),
    sA("M50 46L50 70", 2.5),
    A("M30 80C32 70 42 66 50 64C58 66 68 70 70 80Z"),
    A(rect(16, 8, 68, 11, 4) + rect(16, 81, 68, 11, 4)),
  ],
  apocalypse: [
    A(circle(50, 50, 44)),
    B([-150, -30, 90].map((c) => sector(50, 50, 12, 37, c - 30, c + 30)).join("") + circle(50, 50, 7.5)),
  ],
  spiders: [
    sA("M50 24L50 4", 2),
    ...[
      "M42 38L28 26L22 10", "M40 48L22 42L10 34", "M40 60L22 64L9 74", "M42 70L30 82L24 94",
    ].map((d) => sA(d, 4) + sA(mirror(d), 4)),
    A(circle(50, 34, 10)),
    eA(50, 62, 16, 20),
    B(circle(46.5, 32, 2) + circle(53.5, 32, 2)),
    B(poly([[45, 54], [55, 54], [50, 61]]) + poly([[45, 68], [55, 68], [50, 61]])),
  ],
  knights: [
    A("M50 6L86 18L86 46C86 70 70 86 50 94C30 86 14 70 14 46L14 18Z"),
    B(rect(44, 20, 12, 60, 3) + rect(26, 38, 48, 12, 3)),
  ],
  winter: [
    ...[0, 60, 120].map((deg) => {
      const [x1, y1] = polar(50, 50, 42, deg - 90), [x2, y2] = polar(50, 50, 42, deg + 90);
      return sB(`M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`, 7);
    }),
    ...[0, 60, 120, 180, 240, 300].map((deg) => {
      const [bx, by] = polar(50, 50, 26, deg - 90), [lx, ly] = polar(bx, by, 12, deg - 90 - 50), [rx, ry] = polar(bx, by, 12, deg - 90 + 50);
      return sA(`M${n(lx)} ${n(ly)}L${n(bx)} ${n(by)}L${n(rx)} ${n(ry)}`, 5);
    }),
    A(star(50, 50, 6, 10, 6, -90)),
  ],
  ocean: [
    B(circle(76, 20, 10)),
    ...[
      [40, sA], [60, sB], [80, sA],
    ].map(([y, s]) => s(`M8 ${y}Q19 ${y - 11} 30 ${y}T52 ${y}T74 ${y}T96 ${y}`, 8)),
  ],
  racing: [sA("M20 12L20 94", 6), A(circle(20, 9, 5)), checkered()],
};

const symbols = Object.entries(ICONS)
  .map(([id, parts]) => `<symbol id="${id}" viewBox="0 0 100 100">${parts.join("")}</symbol>`)
  .join("");

const sprite = fs.readFileSync(SPRITE, "utf8");
const block = `<!--EXTRA-->${symbols}<!--/EXTRA-->`;
const next = sprite.includes("<!--EXTRA-->")
  ? sprite.replace(/<!--EXTRA-->[\s\S]*<!--\/EXTRA-->/, block)
  : sprite.replace("</defs>", `${block}</defs>`);
fs.writeFileSync(SPRITE, next);
console.log(Object.keys(ICONS).length, "extra icons:", Object.keys(ICONS).join(", "));
