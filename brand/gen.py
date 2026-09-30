# Builds the Abduct SVGs from traced paths (paths.json) and the evenly spaced lights (newlights_fixed.json).
# Run from this folder: python gen.py . 
import json, os, sys
P = json.load(open('paths.json'))
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

CREAM, ORANGE = '#FEECD2', '#FBA825'

hull = ''.join(P['hull'][i] for i in (1, 2, 3))
windows = [P['windows'][i] for i in (1, 2)]
# Underside lights: identical parallelograms, equally spaced along the rim curve (left -> right).
LIGHTS_FILE = os.environ.get('ABD_LIGHTS', 'newlights_fixed.json')
lights = ['M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in q) + 'Z' for q in json.load(open(LIGHTS_FILE))]
beam_outline, play = P['beamclean'][1], P['play_clean'][0]   # straight-edged beam, geometric rounded play cutout
L = P['label']
letters = [L[6] + L[9], L[3] + L[7], L[4] + L[8], L[2], L[1], L[5]]  # A b d u c t (outer + counter)

# Beam gradient fitted to the original: bright top-left -> fades out bottom-right.
# Kept as orange with falling opacity so it reads right on any dark background.
samples = [(253,196,90),(251,183,68),(247,171,51),(235,161,49),(214,147,46),(194,132,44),
           (167,114,40),(140,96,35),(106,73,28),(70,49,18),(36,25,10)]
stops = ''
for k, c in enumerate(samples):
    m = max(c); col = '#%02X%02X%02X' % tuple(min(255, round(v * 253 / m)) for v in c)
    stops += f'<stop offset="{k/10:.1f}" stop-color="{col}" stop-opacity="{min(1, m/253):.2f}"/>'

def svg(label, animated, beam=True):
    vb = '70 130 1086 1030' if label else '70 130 1086 834'
    defs = f'''<defs>
<linearGradient id="abd-beam" gradientUnits="userSpaceOnUse" x1="683" y1="590" x2="842" y2="940">{stops}</linearGradient>
<mask id="abd-beam-mask" maskUnits="userSpaceOnUse" x="560" y="550" width="440" height="380">
<rect x="560" y="550" width="440" height="380" fill="#fff"/>
<path class="play" fill="#000" d="{play}"/>
</mask>
<clipPath id="abd-beam-clip"><rect class="wipe" x="560" y="550" width="440" height="380"/></clipPath>
</defs>'''
    beam_attrs = 'clip-path="url(#abd-beam-clip)"' if animated else ''
    beam_el = f'<g {beam_attrs}><path class="beam" fill="url(#abd-beam)" mask="url(#abd-beam-mask)" d="{beam_outline}"/></g>' if beam else ''
    if not beam: defs = ''
    ship = f'''<g class="ship">
{beam_el}
<path class="hull" fill="{CREAM}" fill-rule="evenodd" d="{hull}"/>
<g class="windows" fill="{ORANGE}">{''.join(f'<path d="{d}"/>' for d in windows)}</g>
<g class="lights" fill="{ORANGE}">{''.join(f'<path class="light" style="--i:{i}" d="{d}"/>' for i, d in enumerate(lights))}</g>
</g>'''
    word = ''
    if label:
        word = f'<g class="label" fill="{CREAM}">' + ''.join(
            f'<path class="letter" style="--i:{i}" fill-rule="evenodd" d="{d}"/>' for i, d in enumerate(letters)) + '</g>'
    style = ''
    if animated:
        style = '''<style>
.ship,.light,.play,.wipe,.letter{transform-box:fill-box}
.ship{transform-origin:52.8% 57.4%;animation:abd-arrive 1.3s linear both}
.windows{animation:abd-windows .6s linear .75s both}
.light{transform-origin:50% 50%;animation:abd-light .38s cubic-bezier(.3,1.6,.5,1) calc(.9s + var(--i) * .06s) both}
.wipe{transform-origin:50% 0;animation:abd-wipe .5s cubic-bezier(.3,.7,.2,1) 1.2s both}
.beam{animation:abd-flicker .45s linear 1.65s both}
.play{transform-origin:50% 50%;animation:abd-play .45s cubic-bezier(.3,1.7,.5,1) 1.55s both}
.letter{animation:abd-letter .55s cubic-bezier(.2,1.3,.4,1) calc(1.7s + var(--i) * .055s) both}
@keyframes abd-arrive{
0%{transform:translate(330px,-290px) scale(.16) rotate(-22deg);opacity:0;animation-timing-function:cubic-bezier(.35,.1,.3,1)}
15%{opacity:1}
62%{transform:translate(-12px,9px) scale(1.03) rotate(4deg);animation-timing-function:ease-in-out}
82%{transform:translate(3px,-2px) scale(.995) rotate(-1.2deg);animation-timing-function:ease-in-out}
100%{transform:none;opacity:1}}
@keyframes abd-windows{0%{opacity:0}35%{opacity:1}50%{opacity:.35}70%,100%{opacity:1}}
@keyframes abd-light{0%{opacity:0;transform:scale(.2)}100%{opacity:1;transform:none}}
@keyframes abd-wipe{0%{transform:scaleY(0)}100%{transform:none}}
@keyframes abd-flicker{0%,100%{opacity:1}30%{opacity:.6}50%{opacity:1}70%{opacity:.8}}
@keyframes abd-play{0%{transform:scale(0)}100%{transform:none}}
@keyframes abd-letter{0%{opacity:0;transform:translateY(46px)}60%{opacity:1}100%{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>'''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="Abduct">'
            f'<title>Abduct</title>{style}{defs}{ship}{word}</svg>\n')

files = {
    'abduct-mark.svg': (False, False),
    'abduct-mark-intro.svg': (False, True),
    'abduct-logo.svg': (True, False),
    'abduct-logo-intro.svg': (True, True),
}
files['abduct-ship.svg'] = (False, False)
for name, (label, animated) in files.items():
    open(os.path.join(OUT, name), 'w').write(svg(label, animated, beam=name != 'abduct-ship.svg'))
    print(name, os.path.getsize(os.path.join(OUT, name)), 'bytes')

# The ship levelled out, for the app (Home, the randomizer), which draws its own straight-down
# beam. Turned 25.3 degrees about the top of the logo's beam (636, 593): the saucer's tilt, and
# the logo's beam is square to the saucer, so it points straight down once level. The hole the
# beam leaves from is then centred at (641, 595), i.e. 48.2% across and 90.1% down this viewBox
# (components/ship-beam.tsx uses those numbers).
level = svg(False, False, beam=False).replace('viewBox="70 130 1086 834"', 'viewBox="100 278 1122 352"')
level = level.replace('<g class="ship">', '<g class="ship" transform="rotate(25.3 636 593)">')
open(os.path.join(OUT, 'abduct-ship-level.svg'), 'w').write(level)
print('abduct-ship-level.svg', os.path.getsize(os.path.join(OUT, 'abduct-ship-level.svg')), 'bytes')
