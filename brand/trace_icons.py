# Run from the project root: uv run --with potracer --with pillow --with numpy python brand/trace_icons.py "brand/Abduct Icons.png" public/list-icons.svg /dev/null
# Traces the list icons from "Abduct Icons.png" (6 x 8 grid, labels dropped) into an SVG sprite.
# Two layers per icon: the accent (orange in the sheet) drawn first as var(--icon-accent), slightly
# grown under the cream so there are no seams, then the cream (var(--icon-base)) on top.
import sys, json, io
import numpy as np, potrace
from PIL import Image, ImageFilter

SRC, OUT_SVG, OUT_JSON = sys.argv[1], sys.argv[2], sys.argv[3]
NAMES = [
    "popcorn", "heroes", "horror", "comedy", "romance", "action",
    "sci-fi", "fantasy", "mystery", "thriller", "adventure", "animation",
    "drama", "family", "crime", "documentary", "music", "western",
    "sports", "war", "history", "nature", "space", "monsters",
    "favorites", "watchlist", "watched", "rewatch", "top-picks", "hidden-gems",
    "date-night", "with-friends", "movie-night", "weekend", "late-night", "rainy-day",
    "feel-good", "tearjerkers", "mind-benders", "cozy", "nostalgia", "epic",
    "halloween", "christmas", "summer", "travel", "random", "my-list",
]
a = np.asarray(Image.open(SRC).convert("RGB")).astype(float)
lum = a.max(2)
m = lum > 70
rows = m.sum(1); cols = m.sum(0)
def bands(v):
    out, s = [], None
    for i, x in enumerate(v):
        if x > 0 and s is None: s = i
        if x == 0 and s is not None: out.append((s, i)); s = None
    return out
rb = bands(rows)[0::2]   # icon rows (every other band is a label row)
cb = bands(cols)
assert len(rb) == 8 and len(cb) == 6, (len(rb), len(cb))

K = 4  # trace at 4x for smooth curves
def trace(mask):
    bm = potrace.Bitmap(mask)
    plist = bm.trace(turdsize=12 * K, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=0.25)
    d = ""
    H, W = mask.shape
    for c in plist:
        pts = [c.start_point] + [p for seg in c.segments for p in ((seg.c, seg.end_point) if seg.is_corner else (seg.end_point,))]
        xs = [p.x for p in pts]; ys = [p.y for p in pts]
        # potrace also outlines the whole bitmap; that frame isn't part of the icon
        if min(xs) <= 0.5 and min(ys) <= 0.5 and max(xs) >= W - 0.5 and max(ys) >= H - 0.5:
            continue
        s = c.start_point; d += f"M{s.x/K:.1f} {s.y/K:.1f}"
        for seg in c.segments:
            if seg.is_corner:
                d += f"L{seg.c.x/K:.1f} {seg.c.y/K:.1f}L{seg.end_point.x/K:.1f} {seg.end_point.y/K:.1f}"
            else:
                d += f"C{seg.c1.x/K:.1f} {seg.c1.y/K:.1f} {seg.c2.x/K:.1f} {seg.c2.y/K:.1f} {seg.end_point.x/K:.1f} {seg.end_point.y/K:.1f}"
        d += "Z"
    return d

def up(soft):
    img = Image.fromarray(np.clip(soft * 255, 0, 255).astype(np.uint8))
    return np.asarray(img.resize((img.width * K, img.height * K), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6 * K / 2))) > 127

symbols, meta = [], []
for r, (y0, y1) in enumerate(rb):
    for c, (x0, x1) in enumerate(cb):
        name = NAMES[r * 6 + c]
        # padded with background so no icon touches the edge (potrace's frame is then the only
        # outline that does)
        cell = np.pad(a[y0:y1, x0:x1], ((12, 12), (12, 12), (0, 0)), mode="constant", constant_values=20)
        mx = cell.max(2)
        alpha = np.clip((mx - 22) / (235 - 22), 0, 1)
        sat = (cell[..., 0] - cell[..., 2]) / np.maximum(cell[..., 0], 1)
        creamness = np.clip((0.55 - sat) / 0.3, 0, 1)
        base_soft = alpha * creamness
        union = up(alpha)
        cream = up(base_soft)
        accent = up(alpha * (1 - creamness))
        # grow the accent under the cream (clipped to the icon) so no seam shows between them
        grown = np.asarray(Image.fromarray(accent).filter(ImageFilter.MaxFilter(2 * K + 1))) & union
        ys, xs = np.nonzero(union)
        bx0, by0, bx1, by1 = xs.min() / K, ys.min() / K, (xs.max() + 1) / K, (ys.max() + 1) / K
        side = max(bx1 - bx0, by1 - by0) * 1.08
        cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
        vb = f"{cx - side/2:.1f} {cy - side/2:.1f} {side:.1f} {side:.1f}"
        da, db = trace(grown), trace(cream)
        parts = []
        if da: parts.append(f'<path fill="var(--icon-accent, #FBA825)" fill-rule="evenodd" d="{da}"/>')
        if db: parts.append(f'<path fill="var(--icon-base, #FEECD2)" fill-rule="evenodd" d="{db}"/>')
        symbols.append(f'<symbol id="{name}" viewBox="{vb}">{"".join(parts)}</symbol>')
        meta.append({"id": name, "accentShare": round(float(accent.sum()) / max(1, float(union.sum())), 2)})
        print(name, len(da) + len(db), "chars")

sprite = '<svg xmlns="http://www.w3.org/2000/svg"><defs>' + "".join(symbols) + "</defs></svg>\n"
io.open(OUT_SVG, "w", encoding="utf-8").write(sprite)
json.dump(meta, io.open(OUT_JSON, "w", encoding="utf-8"), indent=1)
print("sprite bytes", len(sprite))
