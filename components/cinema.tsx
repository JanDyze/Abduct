"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX, X } from "lucide-react";
import { formatClock, readPlayerMessage, SKIP_SECONDS, skipTo, type PlayerCommand, type PlayerState } from "@/lib/titles/player-bridge";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

// Screen orientation lock isn't in every TypeScript DOM lib; where the browser has it (Android
// Chrome, in full screen) it turns the picture sideways for the movie.
type Lockable = ScreenOrientation & { lock?: (o: "landscape") => Promise<void> };

const HIDE_AFTER = 3000; // ms of no taps before the controls fade

// Full screen has to be asked for inside a tap, so Play (and the toggle here) call this from
// their click. It's the whole page that goes full screen, with the cinema covering it; iPhone
// Safari can't, and the cinema simply fills the screen there.
export function enterFullScreen() {
  document.documentElement
    .requestFullscreen?.({ navigationUI: "hide" })
    .then(() => (screen.orientation as Lockable | undefined)?.lock?.("landscape"))
    .catch(() => {});
}

export function leaveFullScreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  screen.orientation?.unlock?.();
}

// The movie, over everything: black, the player filling it, our own bar on top (close, the
// title, full screen). Back (Android's, or the browser's) closes it too, and the screen stays
// awake while it's open. When the player has Abduct's bridge (lib/titles/player-bridge.ts) our
// own controls take over: tap to show or hide them, double-tap a side to skip 10 seconds, a
// scrubber, mute. Without the bridge the player keeps its own controls.
export function Cinema({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  const layer = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const lastTap = useRef<{ side: number; at: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [full, setFull] = useState(false);
  const [canFull] = useState(() => document.fullscreenEnabled);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [chrome, setChrome] = useState(true);
  const [scrub, setScrub] = useState<number | null>(null);
  const [skipped, setSkipped] = useState<{ by: number; at: number } | null>(null);

  const bridged = player != null;
  const shown = chrome || !loaded || (bridged && !player.playing);

  // The player's address stays on the server (MOVIE_PLAYER_URL), so the page can't name it as the
  // message's target. Only the frame we made gets these, and they only say play, pause, seek.
  const send = useCallback((c: PlayerCommand) => {
    frame.current?.contentWindow?.postMessage({ abduct: 1, ...c }, "*");
  }, []);

  const wake = useCallback(() => {
    setChrome(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setChrome(false), HIDE_AFTER);
  }, []);
  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  // Opening adds a #watch step to the history, so Back closes the movie instead of the page.
  const close = useCallback(() => {
    if (location.hash === "#watch") history.back();
    else onClose();
  }, [onClose]);
  useEffect(() => {
    if (location.hash !== "#watch") history.pushState(null, "", "#watch");
    const onPop = () => {
      if (location.hash !== "#watch") onClose();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onClose]);

  // Keys go to the cinema (Escape, and the controls' shortcuts), nothing behind it scrolls, and
  // the screen doesn't dim mid-movie.
  useEffect(() => {
    layer.current?.focus();
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    let lock: WakeLockSentinel | null = null;
    const awake = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        ?.request("screen")
        .then((l) => (lock = l))
        .catch(() => {});
    };
    awake();
    const onFull = () => setFull(document.fullscreenElement != null);
    document.addEventListener("visibilitychange", awake);
    document.addEventListener("fullscreenchange", onFull);
    onFull();
    return () => {
      root.style.overflow = overflow;
      document.removeEventListener("visibilitychange", awake);
      document.removeEventListener("fullscreenchange", onFull);
      lock?.release().catch(() => {});
    };
  }, []);

  // The bridge's reports, from our frame only.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const state = readPlayerMessage(e.data);
      if (state) setPlayer(state);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Say hello until a bridge answers (players set themselves up a moment after their page loads),
  // for half a minute. Once it does, ours replace the player's own controls.
  useEffect(() => {
    if (!loaded || bridged) return;
    send({ cmd: "hello" });
    let tries = 0;
    const knock = window.setInterval(() => {
      if (++tries > 30) window.clearInterval(knock);
      else send({ cmd: "hello" });
    }, 1000);
    return () => window.clearInterval(knock);
  }, [loaded, bridged, send]);
  useEffect(() => {
    if (bridged) send({ cmd: "controls", value: false });
  }, [bridged, send]);

  const toggle = () => {
    if (!player) return;
    if (player.ended) {
      send({ cmd: "seek", value: 0 });
      send({ cmd: "play" });
    } else send({ cmd: player.playing ? "pause" : "play" });
    setPlayer({ ...player, playing: player.ended || !player.playing, ended: false });
    sound.pop(player.playing ? -3 : 3);
    wake();
  };

  const skip = (by: number) => {
    if (!player) return;
    const to = skipTo(player.time, player.duration, by);
    send({ cmd: "seek", value: to });
    setPlayer({ ...player, time: to, ended: false });
    const at = Date.now();
    setSkipped({ by, at });
    window.setTimeout(() => setSkipped((s) => (s?.at === at ? null : s)), 700);
    sound.tick();
  };

  const seekTo = () => {
    if (scrub == null || !player) return;
    send({ cmd: "seek", value: scrub });
    setPlayer({ ...player, time: scrub, ended: false });
    setScrub(null);
  };

  const mute = () => {
    if (!player) return;
    send({ cmd: "mute", value: !player.muted });
    setPlayer({ ...player, muted: !player.muted });
    wake();
  };

  // A tap shows or hides the controls; two quick taps on a side skip back or ahead.
  const tap = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width;
    const side = x < 0.35 ? -1 : x > 0.65 ? 1 : 0;
    const now = Date.now();
    const prev = lastTap.current;
    if (side !== 0 && prev?.side === side && now - prev.at < 320) {
      lastTap.current = null;
      skip(side * SKIP_SECONDS);
      return;
    }
    lastTap.current = { side, at: now };
    if (shown && player?.playing) {
      window.clearTimeout(hideTimer.current);
      setChrome(false);
    } else wake();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !full) close();
    if (!bridged) return;
    if (e.key === " " || e.key === "k") toggle();
    else if (e.key === "ArrowLeft" || e.key === "j") skip(-SKIP_SECONDS);
    else if (e.key === "ArrowRight" || e.key === "l") skip(SKIP_SECONDS);
    else if (e.key === "m") mute();
    else return;
    e.preventDefault();
  };

  const time = scrub ?? player?.time ?? 0;
  const duration = player?.duration ?? 0;
  const roundButton = "pointer-events-auto flex items-center justify-center rounded-full bg-black/45 backdrop-blur transition-transform active:scale-90";

  return (
    <div
      ref={layer}
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${name}`}
      tabIndex={-1}
      onKeyDown={onKey}
      className="animate-fade-in fixed inset-0 z-[80] overflow-hidden bg-black text-white outline-none"
    >
      <iframe
        ref={frame}
        src={src}
        title={`Play ${name}`}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        onLoad={() => {
          setLoaded(true);
          wake();
        }}
        className={cn("absolute inset-0 size-full transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0")}
      />

      {!loaded && (
        <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-5">
          <div className="animate-hover relative h-40 w-44">
            <div
              className="beam animate-beam absolute top-[38px] left-1/2 h-32 w-32 -translate-x-1/2"
              style={{ clipPath: "polygon(41% 0, 59% 0, 100% 100%, 0 100%)" }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- a decorative SVG over the movie */}
            <img src="/ship.svg" alt="" className="relative w-44" />
          </div>
          <p className="font-brand text-lg font-bold text-white/90">Beaming it in…</p>
        </div>
      )}

      {bridged && <div aria-hidden className="absolute inset-0" onPointerUp={tap} />}

      {skipped && (
        <div
          key={skipped.at}
          aria-hidden
          className={cn(
            "animate-skip pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-black/55 px-4 py-2 font-brand text-lg font-bold",
            skipped.by < 0 ? "left-[12%]" : "right-[12%]",
          )}
        >
          {skipped.by < 0 ? <RotateCcw className="size-5" aria-hidden /> : <RotateCw className="size-5" aria-hidden />}
          {skipped.by < 0 ? "−" : "+"}
          {SKIP_SECONDS}s
        </div>
      )}

      {/* Top: close, what's playing, full screen. Without the bridge only the X stays once it fades,
          since a tap on the player can't bring it back. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/75 to-transparent px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-8 transition-opacity duration-300",
          shown ? "opacity-100" : bridged ? "opacity-0" : "from-transparent",
        )}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close the movie"
          className={cn(roundButton, "size-10 shrink-0", !shown && (bridged ? "pointer-events-none" : "opacity-50"))}
        >
          <X className="size-5" aria-hidden />
        </button>
        <p className={cn("min-w-0 flex-1 truncate font-brand text-base font-bold transition-opacity", !shown && "opacity-0")}>{name}</p>
        {canFull && (
          <button
            type="button"
            onClick={() => (full ? leaveFullScreen() : enterFullScreen())}
            aria-label={full ? "Leave full screen" : "Full screen"}
            className={cn(roundButton, "size-10 shrink-0", !shown && "pointer-events-none opacity-0")}
          >
            {full ? <Minimize className="size-5" aria-hidden /> : <Maximize className="size-5" aria-hidden />}
          </button>
        )}
      </div>

      {bridged && (
        <>
          <div
            className={cn(
              "pointer-events-none absolute inset-0 flex items-center justify-center gap-10 transition-opacity duration-300",
              shown ? "opacity-100" : "opacity-0 [&_button]:pointer-events-none",
            )}
          >
            <button type="button" onClick={() => skip(-SKIP_SECONDS)} aria-label={`Back ${SKIP_SECONDS} seconds`} className={cn(roundButton, "size-12")}>
              <RotateCcw className="size-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label={player.ended ? "Play again" : player.playing ? "Pause" : "Play"}
              className={cn(roundButton, "size-18 bg-primary text-primary-foreground shadow-[0_0_32px] shadow-primary/50")}
            >
              {player.buffering ? (
                <Loader2 className="size-8 animate-spin" aria-hidden />
              ) : player.ended ? (
                <RotateCcw className="size-8" aria-hidden />
              ) : player.playing ? (
                <Pause className="size-8 fill-current" aria-hidden />
              ) : (
                <Play className="ml-1 size-8 fill-current" aria-hidden />
              )}
            </button>
            <button type="button" onClick={() => skip(SKIP_SECONDS)} aria-label={`Ahead ${SKIP_SECONDS} seconds`} className={cn(roundButton, "size-12")}>
              <RotateCw className="size-6" aria-hidden />
            </button>
          </div>

          <div
            className={cn(
              "absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pt-10 pb-[max(1rem,env(safe-area-inset-bottom))] transition-opacity duration-300",
              shown ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <span className="w-16 text-right text-sm tabular-nums">{formatClock(time)}</span>
            <input
              type="range"
              min={0}
              max={Math.max(duration, 1)}
              step={1}
              value={Math.min(time, Math.max(duration, 1))}
              disabled={duration === 0}
              onChange={(e) => {
                setScrub(Number(e.target.value));
                wake();
              }}
              onPointerUp={seekTo}
              onKeyUp={seekTo}
              aria-label="Where in the movie"
              aria-valuetext={`${formatClock(time)} of ${formatClock(duration)}`}
              className="h-1.5 min-w-0 flex-1 cursor-pointer accent-primary disabled:opacity-40"
            />
            <span className="w-16 text-sm text-white/70 tabular-nums">{duration > 0 ? formatClock(duration) : "–:––"}</span>
            <button type="button" onClick={mute} aria-label={player.muted ? "Sound on" : "Mute"} className={cn(roundButton, "size-10 shrink-0")}>
              {player.muted ? <VolumeX className="size-5" aria-hidden /> : <Volume2 className="size-5" aria-hidden />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
