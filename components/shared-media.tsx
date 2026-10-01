"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AudioLines } from "lucide-react";

const CACHE = "abduct-share";
const KEY = "/shared-media";
const RATE = 16000;
const MAX_SECONDS = 120;

// A shared video's sound, as a small WAV: 16 kHz mono, the first two minutes. Speech needs no more,
// and it keeps a reel's audio around 1 MB however big the video was.
async function toWav(blob: Blob) {
  const ctx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  } finally {
    void ctx.close();
  }
  const seconds = Math.min(decoded.duration, MAX_SECONDS);
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(seconds * RATE)), RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start(0, 0, seconds);
  const pcm = (await offline.startRendering()).getChannelData(0);
  const out = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const text = (at: number, s: string) => [...s].forEach((c, i) => out.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF"); out.setUint32(4, 36 + pcm.length * 2, true); text(8, "WAVE");
  text(12, "fmt "); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, RATE, true); out.setUint32(28, RATE * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
  text(36, "data"); out.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
  return new Blob([out.buffer], { type: "audio/wav" });
}

// On the share page, it listens to a shared reel and reopens the page with what was said, so the
// title can be worked out from that too. For a shared video, its sound is shrunk on the phone and
// sent to /api/transcribe (the video itself never leaves it); for a shared link (`link`), the
// server fetches the reel's sound itself (/api/listen-link), which the apps don't always allow.
// A link is listened to right away when `auto`, else from a button.
export function SharedMedia({ params, link, auto = true }: { params: Record<string, string>; link?: string; auto?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "listening" | "failed">(auto ? "listening" : "idle");
  const [failed, setFailed] = useState<string | null>(null);
  const started = useRef(false);

  const listen = useCallback(() => {
    if (started.current) return;
    started.current = true;
    setState("listening");
    const reopen = (transcript: string) => {
      const q = new URLSearchParams(params);
      q.delete("media");
      q.set("transcript", transcript.slice(0, 1500) || "-");
      router.replace(`/share?${q}`);
    };
    const fromVideo = async () => {
      const cache = await caches.open(CACHE);
      const shared = await cache.match(KEY);
      if (!shared) return reopen("");
      const wav = await toWav(await shared.blob()).catch(() => null);
      if (!wav) throw new Error("Couldn't read the sound in that video.");
      const res = await fetch("/api/transcribe", { method: "POST", headers: { "Content-Type": "audio/wav" }, body: wav });
      const body = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Couldn't listen to that clip.");
      await cache.delete(KEY);
      reopen(body.text ?? "");
    };
    const fromLink = async (url: string) => {
      const res = await fetch("/api/listen-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const body = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok) throw new Error(`${body.error ?? "Couldn't listen to that reel."} Save the video and share it to Abduct instead.`);
      reopen(body.text ?? "");
    };
    (link ? fromLink(link) : fromVideo()).catch((e: unknown) => {
      setFailed(e instanceof Error ? e.message : "Couldn't listen to that clip.");
      setState("failed");
    });
  }, [link, params, router]);

  useEffect(() => {
    if (auto) listen();
  }, [auto, listen]);

  if (state === "idle")
    return (
      <button
        type="button"
        onClick={listen}
        className="mt-4 flex h-12 w-full items-center gap-3 rounded-2xl border border-input bg-card px-3.5 text-left text-base transition-colors hover:bg-muted"
      >
        <AudioLines className="size-5 shrink-0 text-primary" aria-hidden />
        Listen to the reel
        <span className="ml-auto truncate text-sm text-muted-foreground">for titles said in it</span>
      </button>
    );

  return (
    <section aria-live="polite" className="mt-5 flex items-center gap-4 rounded-3xl border bg-card p-4">
      <div className="animate-hover relative h-16 w-20 shrink-0">
        {state === "listening" && <div className="beam animate-beam absolute top-[17px] left-1/2 h-12 w-14 -translate-x-1/2" style={{ clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)" }} />}
        {/* eslint-disable-next-line @next/next/no-img-element -- a small decorative SVG */}
        <img src="/ship.svg" alt="" className="relative w-20" />
      </div>
      <div className="min-w-0">
        <p className="font-brand text-lg font-bold">{state === "failed" ? "Couldn't listen to it" : link ? "Listening to the reel…" : "Listening to the clip…"}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{failed ?? "Working out which movie it is from what's said in it."}</p>
      </div>
    </section>
  );
}
