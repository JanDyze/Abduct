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

// A button in a search field: pick a screenshot (a post, a streaming app, a friend's message) and
// the titles written in it come back (app/api/read-screenshot), for the search to look up.
export function ScreenshotButton({ onResult, className }: { onResult: (result: ScreenshotResult) => void; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  const read = async (file: File) => {
    setReading(true);
    try {
      const small = await shrink(file);
      const body = small ?? (file.size <= 4_000_000 && /^image\/(jpeg|png|webp|gif)$/.test(file.type) ? file : null);
      if (!body) return onResult({ error: "That picture can't be read here. Try a PNG or JPEG screenshot." });
      const res = await fetch("/api/read-screenshot", { method: "POST", headers: { "content-type": body.type || "image/jpeg" }, body });
      const json = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(json?.titles)) return onResult({ error: json?.error ?? "Couldn't read that screenshot." });
      onResult(json.titles.length ? { titles: json.titles } : { error: "No titles written in that screenshot." });
    } catch {
      onResult({ error: "Couldn't read that screenshot. Check your connection." });
    } finally {
      setReading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={reading}
        aria-label="Find titles in a screenshot"
        title="Find titles in a screenshot"
        className={cn("flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-70", className)}
      >
        {reading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ScanText className="size-5" aria-hidden />}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) read(file);
        }}
      />
      {reading && (
        <span role="status" className="sr-only">
          Reading the screenshot…
        </span>
      )}
    </>
  );
}
