"use client";

import { useRef, useState } from "react";
import { Loader2, ScanText } from "lucide-react";
import { cn } from "@/lib/utils";

const LONG_EDGE = 1568; // px: as big as Claude reads an image at, so bigger only costs more

// Shrinks a picture on the phone to a JPEG no bigger than Claude needs. Null if it can't be read
// here (some HEIC photos outside Safari), and then the original goes if it's small enough.
async function shrink(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, LONG_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  } catch {
    return null;
  }
}

export type ScreenshotResult = { titles: string[] } | { error: string };

const MAX_FILES = 10;

// One screenshot's titles (app/api/read-screenshot), or an error message.
async function readOne(file: File): Promise<ScreenshotResult> {
  const small = await shrink(file);
  const body = small ?? (file.size <= 4_000_000 && /^image\/(jpeg|png|webp|gif)$/.test(file.type) ? file : null);
  if (!body) return { error: "That picture can't be read here. Try a PNG or JPEG screenshot." };
  try {
    const res = await fetch("/api/read-screenshot", { method: "POST", headers: { "content-type": body.type || "image/jpeg" }, body });
    const json = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(json?.titles)) return { error: json?.error ?? "Couldn't read that screenshot." };
    return { titles: json.titles };
  } catch {
    return { error: "Couldn't read that screenshot. Check your connection." };
  }
}

// A button in a search field: pick one or more screenshots (posts, a streaming app, a friend's
// messages) and the titles written in them come back, in order and without repeats, for the
// search to look up. Up to ten at a time, read three at once.
export function ScreenshotButton({ onResult, className }: { onResult: (result: ScreenshotResult) => void; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const reading = progress !== null;

  const read = async (files: File[]) => {
    const picked = files.slice(0, MAX_FILES);
    setProgress({ done: 0, total: picked.length });
    const results: ScreenshotResult[] = new Array(picked.length);
    let next = 0;
    const worker = async () => {
      while (next < picked.length) {
        const i = next++;
        results[i] = await readOne(picked[i]);
        setProgress((p) => p && { ...p, done: p.done + 1 });
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, picked.length) }, worker));
    setProgress(null);

    const seen = new Set<string>();
    const titles = results
      .flatMap((r) => ("titles" in r ? r.titles : []))
      .filter((t) => !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()));
    if (titles.length) return onResult({ titles });
    const failed = results.find((r): r is { error: string } => "error" in r);
    onResult({ error: failed?.error ?? (picked.length > 1 ? "No titles written in those screenshots." : "No titles written in that screenshot.") });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={reading}
        aria-label="Find titles in screenshots"
        title="Find titles in screenshots"
        className={cn("flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-70", className)}
      >
        {reading ? (
          progress.total > 1 ? (
            <span className="text-xs font-semibold tabular-nums">
              {progress.done}/{progress.total}
            </span>
          ) : (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          )
        ) : (
          <ScanText className="size-5" aria-hidden />
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) read(files);
        }}
      />
      {reading && (
        <span role="status" className="sr-only">
          {progress.total > 1 ? `Reading screenshot ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…` : "Reading the screenshot…"}
        </span>
      )}
    </>
  );
}
