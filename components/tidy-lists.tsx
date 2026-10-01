"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { applyTidyAction, proposeTidyAction, undoTidyAction } from "@/app/lists/tidy/actions";
import { ListBadge } from "@/components/list-icon";
import { countTitles } from "@/lib/format";
import type { Proposal, TidySnapshot } from "@/lib/lists/tidy";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";

const UNDO_KEY = "abduct:tidy-undo";
const AUTO_KEY = "abduct:tidy-auto";

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
};

type Stage = { at: "start" } | { at: "thinking" } | { at: "plan"; proposal: Proposal } | { at: "applying"; proposal: Proposal } | { at: "done"; proposal: Proposal };

// Tidy with AI: say how you'd like your lists sorted (or don't), Claude makes a plan, you look it
// over and apply it, or let it apply straight away. The lists as they were are kept on this phone,
// so Undo puts them back.
export function TidyLists() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ at: "start" });
  const [instructions, setInstructions] = useState("");
  const [auto, setAuto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<TidySnapshot | null>(null);
  const [undoing, startUndo] = useTransition();

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- read once from this phone's storage */
    setAuto(read(AUTO_KEY) === "1");
    const saved = read(UNDO_KEY);
    if (saved) {
      try {
        setUndo(JSON.parse(saved));
      } catch {}
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const apply = async (proposal: Proposal) => {
    setStage({ at: "applying", proposal });
    setError(null);
    const res = await applyTidyAction({ lists: proposal.lists.map(({ id, name, icon, color, titleIds }) => ({ id, name, icon, color, titleIds })) });
    if ("error" in res) {
      sound.error();
      setError(res.error);
      return setStage({ at: "plan", proposal });
    }
    write(UNDO_KEY, JSON.stringify(res.undo));
    setUndo(res.undo);
    sound.land();
    setStage({ at: "done", proposal });
    router.refresh();
  };

  const propose = async () => {
    setStage({ at: "thinking" });
    setError(null);
    const res = await proposeTidyAction(instructions);
    if ("error" in res) {
      sound.error();
      setError(res.error);
      return setStage({ at: "start" });
    }
    if (auto) return apply(res.proposal);
    sound.pop(5);
    setStage({ at: "plan", proposal: res.proposal });
  };

  const undoLast = () =>
    startUndo(async () => {
      if (!undo) return;
      const res = await undoTidyAction(undo);
      if (res.error) {
        sound.error();
        return setError(res.error);
      }
      write(UNDO_KEY, null);
      setUndo(null);
      sound.remove();
      setStage({ at: "start" });
      router.refresh();
    });

  const undoButton = undo && (
    <button
      type="button"
      onClick={undoLast}
      disabled={undoing}
      className="flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60"
    >
      {undoing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
      Undo the last tidy
    </button>
  );

  if (stage.at === "start" || stage.at === "thinking") {
    const thinking = stage.at === "thinking";
    return (
      <div className="flex flex-col gap-4">
        <section className="animate-rise rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Claude looks at every list and every title on them and reorganizes them into lists that are easy to pick from: new ones, renamed or merged ones,
            pointless ones deleted, titles moved where they belong, duplicates taken off. Watched stays watched.
          </p>
          <label htmlFor="tidy-how" className="mt-4 block text-sm font-semibold">
            How should it sort them? <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="tidy-how"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            maxLength={1000}
            rows={3}
            disabled={thinking}
            placeholder="By mood. Keep Date night. One list for anime. Put horror together…"
            className="mt-1.5 w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
          />
          <label className="mt-3 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={auto}
              disabled={thinking}
              onChange={(e) => {
                setAuto(e.target.checked);
                write(AUTO_KEY, e.target.checked ? "1" : null);
              }}
              className="mt-0.5 size-4 accent-[var(--primary)]"
            />
            <span>
              <span className="font-medium">Apply straight away</span>
              <span className="block text-muted-foreground">Skip the preview. You can still undo it.</span>
            </span>
          </label>
          <button
            type="button"
            onClick={propose}
            disabled={thinking}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_8px_30px_-6px] shadow-primary/40 active:scale-[0.98] disabled:opacity-80"
          >
            {thinking ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
            {thinking ? "Claude is sorting your lists…" : "Tidy my lists"}
          </button>
          {thinking && <p className="mt-2 text-center text-xs text-muted-foreground">This can take up to a minute with a lot of titles.</p>}
        </section>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {undoButton}
      </div>
    );
  }

  const { proposal } = stage;
  const applying = stage.at === "applying";
  const done = stage.at === "done";
  return (
    <div className="flex flex-col gap-4">
      <section className={cn("animate-rise rounded-2xl border p-4", done ? "border-primary/40 bg-primary/10" : "bg-card")}>
        <p className="flex items-center gap-2 font-brand text-lg font-bold">
          {done ? <Check className="size-5 text-primary" strokeWidth={2.5} aria-hidden /> : <Sparkles className="size-5 text-primary" aria-hidden />}
          {done ? "Your lists are tidy" : "Claude's plan"}
        </p>
        <p className="mt-1.5 text-sm">{proposal.summary}</p>
      </section>

      <ul className="flex flex-col gap-2.5">
        {proposal.lists.map((l, i) => {
          const posters = l.titleIds.map((id) => proposal.titles[id]?.posterUrl).filter((p): p is string => Boolean(p)).slice(0, 5);
          return (
            <li key={l.id ?? `new-${i}`} className="animate-rise rounded-2xl border bg-card p-3" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-center gap-3">
                <ListBadge icon={l.icon} color={l.color} className="size-11 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-brand text-base leading-tight font-bold">{l.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[l.change === "new" ? "New" : l.was ? `Was ${l.was}` : l.change === "changed" ? "Restyled" : "Kept", l.isDefault && "Default", countTitles(l.titleIds.length)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {posters.length > 0 && (
                  <span className="flex shrink-0" aria-hidden>
                    {posters.map((src, j) => (
                      <span key={src} className="relative -ml-4 aspect-[2/3] w-8 overflow-hidden rounded-md shadow-md ring-2 ring-card first:ml-0" style={{ zIndex: posters.length - j }}>
                        <Image src={src} alt="" fill sizes="32px" unoptimized className="object-cover" />
                      </span>
                    ))}
                  </span>
                )}
              </div>
              {l.titleIds.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-primary">What&apos;s on it</summary>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{l.titleIds.map((id) => proposal.titles[id]?.name).filter(Boolean).join(" · ")}</p>
                </details>
              )}
            </li>
          );
        })}
      </ul>

      {(proposal.deleted.length > 0 || proposal.removed.length > 0) && (
        <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
          {proposal.deleted.length > 0 && (
            <>
              <p className="flex items-center gap-2 font-semibold">
                <Trash2 className="size-4 text-destructive" aria-hidden /> {done ? "Deleted" : "Lists to delete"}
              </p>
              <ul className="mt-1 ml-6 list-disc text-muted-foreground">
                {proposal.deleted.map((d) => (
                  <li key={d.id}>
                    {d.name} <span className="text-xs">({countTitles(d.total)}, moved elsewhere)</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {proposal.removed.length > 0 && (
            <>
              <p className={cn("flex items-center gap-2 font-semibold", proposal.deleted.length > 0 && "mt-3")}>
                <X className="size-4 text-destructive" aria-hidden /> {done ? "Taken off your lists" : "Titles to take off"}
              </p>
              <ul className="mt-1 ml-6 list-disc text-muted-foreground">
                {proposal.removed.map((r) => (
                  <li key={r.titleId}>
                    {proposal.titles[r.titleId]?.name ?? "A title"} <span className="text-xs">({r.why})</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {done ? (
        <div className="flex flex-col gap-2">
          <Link
            href="/lists"
            transitionTypes={["nav-back"]}
            className="flex h-12 items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground active:scale-[0.98]"
          >
            See my lists
          </Link>
          {undoButton}
        </div>
      ) : (
        <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] flex gap-2">
          <button
            type="button"
            onClick={() => setStage({ at: "start" })}
            disabled={applying}
            className="h-12 rounded-2xl border bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => apply(proposal)}
            disabled={applying}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_8px_30px_-6px] shadow-primary/40 active:scale-[0.98] disabled:opacity-80"
          >
            {applying ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Check className="size-5" strokeWidth={2.5} aria-hidden />}
            {applying ? "Tidying…" : "Apply"}
          </button>
        </div>
      )}
    </div>
  );
}
