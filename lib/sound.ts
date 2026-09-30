// Abduct's little sounds, made on the spot with Web Audio (no files to download): pops for taps,
// the UFO's beam and a chime when it takes a title, ticks while it spins, and so on. Quiet, only
// ever started by a tap (which phones require before a page may play sound), and off with the
// Sounds switch in Settings (kept on this device).
const KEY = "abduct-sounds";
const VOLUME = 0.32;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

export function soundsOn() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundsOn(on: boolean) {
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, "off");
  } catch {}
}

function audio() {
  if (typeof window === "undefined" || !soundsOn()) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = VOLUME;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type ToneOpts = { type?: OscillatorType; gain?: number; to?: number; attack?: number };

// One note: a quick attack, then it dies away (sliding to `to` Hz if given).
function tone(c: AudioContext, freq: number, at: number, dur: number, { type = "sine", gain = 0.2, to, attack = 0.004 }: ToneOpts = {}) {
  const osc = c.createOscillator(), env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, at + dur);
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(env).connect(master!);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

// A puff of air, its colour sweeping from one frequency to another.
function air(c: AudioContext, at: number, dur: number, from: number, to: number, gain = 0.12) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource(), filter = c.createBiquadFilter(), env = c.createGain();
  src.buffer = noiseBuf;
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + dur);
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + dur * 0.4);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(env).connect(master!);
  src.start(at);
  src.stop(at + dur + 0.02);
}

const semis = (base: number, n: number) => base * Math.pow(2, n / 12);

function play(fn: (c: AudioContext, now: number) => void) {
  const c = audio();
  if (c) fn(c, c.currentTime + 0.005);
}

export const sound = {
  /** A light pop, pitched up or down by semitones. */
  pop: (pitch = 0) => play((c, t) => tone(c, semis(620, pitch), t, 0.13, { type: "triangle", gain: 0.2, to: semis(760, pitch) })),
  /** Taking something back off: a falling blip. */
  remove: () => play((c, t) => tone(c, 880, t, 0.22, { type: "triangle", gain: 0.16, to: 260 })),
  /** A star rating: higher for more stars; five gets a sparkle. Nothing for clearing it. */
  star: (n: number | null) =>
    play((c, t) => {
      if (!n) return tone(c, 520, t, 0.16, { type: "triangle", gain: 0.12, to: 300 });
      tone(c, semis(660, (n - 1) * 2), t, 0.14, { type: "triangle", gain: 0.2, to: semis(820, (n - 1) * 2) });
      if (n === 5) [0, 4, 7].forEach((s, i) => tone(c, semis(1320, s), t + 0.08 + i * 0.05, 0.4, { gain: 0.08 }));
    }),
  /** Watched: a two-note ding; not watched after all: a soft drop. */
  watched: (on: boolean) =>
    play((c, t) => {
      if (!on) return tone(c, 660, t, 0.18, { type: "triangle", gain: 0.12, to: 440 });
      tone(c, 1319, t, 0.35, { gain: 0.14 });
      tone(c, 1976, t + 0.09, 0.5, { gain: 0.12 });
    }),
  /** A tick, for each poster flicking past in the UFO's beam. */
  tick: () => play((c, t) => tone(c, 2300, t, 0.025, { type: "square", gain: 0.035 })),
  /** The UFO lands on its pick: a low thump and a bright chime. */
  land: () =>
    play((c, t) => {
      tone(c, 110, t, 0.5, { gain: 0.3, to: 45 });
      [0, 4, 7, 12].forEach((s, i) => tone(c, semis(1047, s), t + 0.02 + i * 0.06, 0.9, { gain: 0.1 }));
    }),
  /** Something sliding away (a card removed, a sheet closing). */
  whoosh: () => play((c, t) => air(c, t, 0.35, 500, 3200, 0.1)),
  /** It didn't work. */
  error: () =>
    play((c, t) => {
      tone(c, 220, t, 0.14, { type: "square", gain: 0.06 });
      tone(c, 165, t + 0.13, 0.2, { type: "square", gain: 0.06 });
    }),
  /** The abduction (lib/abduct.ts), on its timeline: the UFO swoops in, the beam comes on, the title
   * zips up it, a chime when it's aboard, and off it goes. */
  abduct: (leaveAt = 2.15) =>
    play((c, t) => {
      air(c, t, 0.4, 600, 3500, 0.1);
      tone(c, 180, t + 0.45, 0.55, { type: "sawtooth", gain: 0.035, to: 700 });
      tone(c, 300, t + 0.6, 0.55, { gain: 0.1, to: 2400 });
      [0, 4, 7].forEach((s, i) => tone(c, semis(1047, s), t + 1.2 + i * 0.06, 0.7, { gain: 0.09 }));
      air(c, t + leaveAt, 0.45, 3200, 500, 0.08);
    }),
};
