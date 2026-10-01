"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

// On the share page, for a shared video: it listens to the clip (its audio goes to /api/transcribe)
// and reopens the page with what was said, so the title can be worked out from that too. The video
// itself never leaves the phone.
export function SharedMedia({ params }: { params: Record<string, string> }) {
  const router = useRouter();
  const [failed, setFailed] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const reopen = (transcript: string) => {
      const q = new URLSearchParams(params);
      q.delete("media");
      q.set("transcript", transcript.slice(0, 1500) || "-");
      router.replace(`/share?${q}`);
    };
    (async () => {
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
    })().catch((e: unknown) => setFailed(e instanceof Error ? e.message : "Couldn't listen to that clip."));
  }, [params, router]);

  return (
    <section aria-live="polite" className="mt-5 flex items-center gap-4 rounded-3xl border bg-card p-4">
      <div className="animate-hover relative h-16 w-20 shrink-0">
        {!failed && <div className="beam animate-beam absolute top-[17px] left-1/2 h-12 w-14 -translate-x-1/2" style={{ clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)" }} />}
        {/* eslint-disable-next-line @next/next/no-img-element -- a small decorative SVG */}
        <img src="/ship.svg" alt="" className="relative w-20" />
      </div>
      <div className="min-w-0">
        <p className="font-brand text-lg font-bold">{failed ? "Couldn't listen to it" : "Listening to the clip…"}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{failed ?? "Working out which movie it is from what's said in it."}</p>
      </div>
    </section>
  );
}
