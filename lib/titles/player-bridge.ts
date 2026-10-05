// Abduct's side of the player bridge. The movie player lives on another site, so Abduct can't
// reach into it; the bridge (player-bridge/abduct-bridge.js, added to the player's page) talks
// to it with window messages marked { abduct: 1 }. Abduct sends commands, the player answers
// with what it's doing. Until a player answers, it plays with its own controls.

export type PlayerState = {
  playing: boolean;
  buffering: boolean;
  ended: boolean;
  time: number; // seconds in
  duration: number; // seconds long; 0 while the player doesn't know yet
  muted: boolean;
};

export type PlayerCommand =
  | { cmd: "hello" } // asks the bridge to say it's there (it answers "ready")
  | { cmd: "play" }
  | { cmd: "pause" }
  | { cmd: "seek"; value: number }
  | { cmd: "mute"; value: boolean }
  | { cmd: "controls"; value: boolean }; // the player's own controls, hidden while ours show

export const SKIP_SECONDS = 10;

const seconds = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

// What the player says it's doing, or null when a message isn't from the bridge.
export function readPlayerMessage(data: unknown): PlayerState | null {
  if (!data || typeof data !== "object") return null;
  const m = data as Record<string, unknown>;
  if (m.abduct !== 1 || (m.type !== "ready" && m.type !== "state")) return null;
  return {
    playing: m.playing === true,
    buffering: m.buffering === true,
    ended: m.ended === true,
    time: seconds(m.time),
    duration: seconds(m.duration),
    muted: m.muted === true,
  };
}

// Where skipping `by` seconds lands, kept inside the movie.
export function skipTo(time: number, duration: number, by: number) {
  const to = Math.max(0, time + by);
  return duration > 0 ? Math.min(to, Math.max(0, duration - 1)) : to;
}

// 0:07, 12:34, 1:02:03.
export function formatClock(total: number) {
  const s = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}
