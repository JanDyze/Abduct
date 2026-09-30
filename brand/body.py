# Run from this folder: uv run --with potracer --with pillow --with numpy --with scipy python body.py [radius]
# The ship's solid body, for gen.py (body.json): the area inside the ship's outline, so its dark
# parts are painted in instead of showing whatever is behind (a poster under the small UFO). The
# dark parts are open at the ends (the bands don't join), so the outline is found by closing: grow
# the shapes until the openings seal, fill, shrink back. (The hole under the saucer is lit by an
# ellipse gen.py draws on top.)
# Writes body-preview.png (not kept in git) to check the result.
import json, re, sys
import numpy as np, potrace
from PIL import Image, ImageDraw
from scipy import ndimage

P = json.load(open('paths.json'))
X0, Y0, W, H = 70, 130, 1086, 834  # the mark's viewBox (gen.py)
K = 4  # traced at 4x for smooth curves
R = float(sys.argv[1]) if len(sys.argv) > 1 else 22  # closing radius, in viewBox units


def flatten(d):
    """Absolute M/L/C/Z path (one subpath) to a polygon in raster pixels."""
    pts, cur = [], None
    for cmd, args in re.findall(r'([MLCZ])([^MLCZ]*)', d):
        n = [float(v) for v in re.findall(r'-?\d*\.?\d+', args)]
        if cmd == 'M':
            cur = (n[0], n[1]); pts.append(cur)
        elif cmd == 'L':
            for i in range(0, len(n), 2):
                cur = (n[i], n[i + 1]); pts.append(cur)
        elif cmd == 'C':
            for i in range(0, len(n), 6):
                p0, p1, p2, p3 = cur, (n[i], n[i + 1]), (n[i + 2], n[i + 3]), (n[i + 4], n[i + 5])
                for s in range(1, 13):
                    t = s / 12; u = 1 - t
                    pts.append(tuple(u ** 3 * a + 3 * u * u * t * b + 3 * u * t * t * c + t ** 3 * e for a, b, c, e in zip(p0, p1, p2, p3)))
                cur = p3
    return [((x - X0) * K, (y - Y0) * K) for x, y in pts]


def fill(poly):
    img = Image.new('L', (W * K, H * K), 0)
    ImageDraw.Draw(img).polygon(poly, fill=255)
    return np.asarray(img) > 0


def close(mask, r):
    """Morphological closing with a disk of radius r pixels."""
    grown = ndimage.distance_transform_edt(~mask) <= r
    return ndimage.distance_transform_edt(grown) > r


def path_of(mask):
    """Traces a mask back to an SVG path in viewBox units (draw it with fill-rule evenodd)."""
    plist = potrace.Bitmap(mask).trace(turdsize=12 * K, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=0.25)
    d = ''
    for c in plist:
        pts = [c.start_point] + [p for seg in c.segments for p in ((seg.c, seg.end_point) if seg.is_corner else (seg.end_point,))]
        xs = [p.x for p in pts]; ys = [p.y for p in pts]
        # potrace also outlines the whole bitmap (as in trace_icons.py); that frame isn't the ship
        if min(xs) <= 0.5 and min(ys) <= 0.5 and max(xs) >= W * K - 0.5 and max(ys) >= H * K - 0.5:
            continue
        s = c.start_point
        d += f'M{s.x / K + X0:.1f} {s.y / K + Y0:.1f}'
        for seg in c.segments:
            if seg.is_corner:
                d += f'L{seg.c.x / K + X0:.1f} {seg.c.y / K + Y0:.1f}L{seg.end_point.x / K + X0:.1f} {seg.end_point.y / K + Y0:.1f}'
            else:
                d += f'C{seg.c1.x / K + X0:.1f} {seg.c1.y / K + Y0:.1f} {seg.c2.x / K + X0:.1f} {seg.c2.y / K + Y0:.1f} {seg.end_point.x / K + X0:.1f} {seg.end_point.y / K + Y0:.1f}'
        d += 'Z'
    return d


hull_parts = [fill(flatten(P['hull'][i])) for i in (1, 2, 3)]
hull = hull_parts[0] ^ hull_parts[1] ^ hull_parts[2]  # evenodd, as gen.py draws it
shapes = hull.copy()
for i in (1, 2):
    shapes |= fill(flatten(P['windows'][i]))
for q in json.load(open('newlights_fixed.json')):
    shapes |= fill([((x - X0) * K, (y - Y0) * K) for x, y in q])

body = ndimage.binary_fill_holes(close(shapes, R * K)) | shapes
body = ndimage.binary_erosion(body, iterations=1) | ndimage.binary_erosion(shapes, iterations=2)  # a hair inside the cream edge

prev = np.full((H * K, W * K, 3), (40, 60, 90), np.uint8)  # a blue backdrop, so see-through shows
prev[body] = (11, 10, 9)
prev[shapes] = (254, 236, 210)
Image.fromarray(prev).resize((W, H)).save('body-preview.png')

body_d = path_of(body)
json.dump({'body': body_d}, open('body.json', 'w'))
print(f'body.json: {len(body_d)} chars')
