"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

// The browser's own install prompt is replaced by this, as in Kept: a slim bar at the top with the
// app icon and an Install button (which opens the real install dialog). iPhones have no such
// dialog, so there the bar says where Safari keeps it. Never shown inside the installed app;
// closing it hides it for 30 days.

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISSED = "abduct:install-dismissed";
const QUIET_FOR = 30 * 24 * 60 * 60 * 1000;

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISSED));
    return Boolean(at) && Date.now() - at < QUIET_FOR;
  } catch {
    return false;
  }
}

function installed() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function InstallBanner() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [ios, setIos] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const quiet = installed() || dismissedRecently();
    const onPrompt = (e: Event) => {
      e.preventDefault(); // no browser prompt; ours instead
      setPrompt(e as InstallPrompt);
      if (!quiet) setOpen(true);
    };
    const onInstalled = () => setOpen(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    // iPhone Safari fires no install event; offer the Share-sheet route after a moment.
    const iosTimer = !quiet && isIosSafari() ? setTimeout(() => (setIos(true), setOpen(true)), 1500) : undefined;
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(iosTimer);
    };
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(DISMISSED, String(Date.now()));
    } catch {}
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    if (outcome === "accepted") setOpen(false);
    else dismiss();
  }

  if (!open || (!prompt && !ios)) return null;
  return (
    <div role="region" aria-label="Install Abduct" className="animate-rise relative z-40 border-b bg-card pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- a tiny static icon */}
        <img src="/icons/icon-192.png" alt="" width={36} height={36} className="size-9 shrink-0 rounded-[10px] ring-1 ring-border" />
        <p className="min-w-0 flex-1 leading-tight">
          <span className="block text-sm font-semibold">Install Abduct</span>
          <span className="block truncate text-xs text-muted-foreground">
            {ios ? (
              <>
                Tap <Share className="inline size-3.5 -translate-y-px" aria-label="Share" /> then Add to Home Screen
              </>
            ) : (
              "The UFO, right on your home screen"
            )}
          </span>
        </p>
        {!ios && (
          <button
            type="button"
            onClick={() => void install()}
            className="h-9 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Not now"
          className="-mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
