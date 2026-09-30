"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, Eye, RotateCcw, Star } from "lucide-react";
import { acceptPick, recordPick } from "@/app/spin/actions";
import { setWatched } from "@/app/lists/actions";
import { ListIcon } from "@/components/list-icon";
import { Poster } from "@/components/poster";
import { StarRating } from "@/components/star-rating";
import { Picker } from "@/components/ui/picker";
import type { ListOption } from "@/lib/lists/icons";
import { ShipBeam } from "@/components/ship-beam";
import { countTitles, titleMeta } from "@/lib/format";
import { DEFAULT_FILTERS, filterPool, genresOf, pick, reel, TIME_OPTIONS, type Candidate, type Filters, type TimeOption } from "@/lib/randomizer/pick";
import { KIND_PLURAL, KINDS, type Kind } from "@/lib/titles/kinds";
import { cn } from "@/lib/utils";

export type SpinItem = Candidate & {
  listId: string;
  name: string;
  year: number | null;
  posterUrl: string | null;
  episodes: number | null;
  score: number | null;
  overview: string | null;
  stars: number | null;
};

type Phase = "idle" | "spinning" | "landed" | "accepted";

const STORAGE_KEY = "abduct-spin";
const REEL_STEPS = 18;

// The gap before each reel step: quick at first, slowing into the pick (about 2.2 s in all).
const stepDelay = (i: number) => 45 + Math.pow(i / REEL_STEPS, 2.4) * 260;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      {children}
    </div>
  );
}

type Saved = { listId?: string; filters?: Partial<Filters> };
type Props = { items: SpinItem[]; lists: ListOption[]; recent: string[]; initialList: string | null };

// The filters saved on this device, read once per visit to the page (the server has none).
const noSubscription = () => () => {};
let savedOnce: string | null | undefined;
function readSaved() {
  if (savedOnce === undefined) {
    try {
      savedOnce = localStorage.getItem(STORAGE_KEY);
    } catch {
      savedOnce = null;
    }
  }
  return savedOnce;
}
function parseSaved(raw: string | null): Saved {
  try {
    return (JSON.parse(raw ?? "null") as Saved | null) ?? {};
  } catch {
    return {};
  }
}

// The UFO picks something to watch. Filters narrow the pool (a list, a kind, how much time you
// have, a genre); the pick itself is weighted (lib/randomizer/pick.ts). "Nope, again" rules the
// title out until you leave the page. Filters are remembered on this device: the page first draws
// with the defaults, then once more with the saved ones.
export function Randomizer(props: Props) {
  const raw = useSyncExternalStore(noSubscription, readSaved, () => null);
  useEffect(
    () => () => {
      savedOnce = undefined;
    },
    [],
  );
  return <Spinner key={raw === null ? "defaults" : "saved"} {...props} saved={parseSaved(raw)} />;
}

function Spinner({ items: initialItems, lists, recent: initialRecent, initialList, saved }: Props & { saved: Saved }) {
  const [items, setItems] = useState(initialItems);
  // A list named in the address wins over the remembered one.
  const [listId, setListId] = useState<string>(
    () => initialList ?? (saved.listId && (saved.listId === "all" || lists.some((l) => l.id === saved.listId)) ? saved.listId : "all"),
  );
  const [filters, setFilters] = useState<Filters>(() => ({ ...DEFAULT_FILTERS, ...saved.filters }));
  const [phase, setPhase] = useState<Phase>("idle");
  const [shown, setShown] = useState<SpinItem | null>(null); // the poster in the beam
  const [chosen, setChosen] = useState<SpinItem | null>(null);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [recent, setRecent] = useState(initialRecent);
  const [pickId, setPickId] = useState<Promise<string | null> | null>(null);
  const [emptyNote, setEmptyNote] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ listId, filters }));
    } catch {}
  }, [listId, filters]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const inList = useMemo(() => (listId === "all" ? items : items.filter((i) => i.listId === listId)), [items, listId]);
  const pool = useMemo(() => filterPool(inList, filters), [inList, filters]);
  const open = pool.filter((c) => !excluded.includes(c.titleId));
  const kindsHere = KINDS.filter((k) => inList.some((i) => i.kind === k));
  const genres = useMemo(() => genresOf(inList.filter((i) => filters.includeWatched || !i.watched)), [inList, filters.includeWatched]);

  const update = (next: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...next }));
    setEmptyNote(null);
  };
  const toggleKind = (k: Kind) => update({ kinds: filters.kinds.includes(k) ? filters.kinds.filter((x) => x !== k) : [...filters.kinds, k] });

  const land = (c: SpinItem) => {
    setShown(c);
    setChosen(c);
    setPhase("landed");
    setRecent((r) => [c.titleId, ...r.filter((id) => id !== c.titleId)].slice(0, 10));
    setPickId(recordPick(c.itemId));
  };

  const spin = (skip: string[] = excluded) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const c = pick(pool, { recent, exclude: skip });
    if (!c) {
      setPhase("idle");
      setShown(null);
      setChosen(null);
      setEmptyNote(pool.length === 0 ? null : "That's everything that fits. Loosen the filters, or start over.");
      return;
    }
    setEmptyNote(null);
    setChosen(null);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return land(c);
    setPhase("spinning");
    const run = reel(open.length > 1 ? open : pool, c, REEL_STEPS);
    let at = 0;
    run.forEach((step, i) => {
      at += stepDelay(i);
      const last = i === run.length - 1;
      timers.current.push(window.setTimeout(() => (last ? land(step) : setShown(step)), last ? at + 180 : at));
    });
  };

  const again = () => {
    if (!chosen) return;
    const skip = [...excluded, chosen.titleId];
    setExcluded(skip);
    spin(skip);
  };

  const seenIt = () => {
    if (!chosen) return;
    void setWatched(chosen.itemId, true);
    setItems((all) => all.map((i) => (i.titleId === chosen.titleId ? { ...i, watched: true } : i)));
    again();
  };

  const accept = async () => {
    if (!chosen) return;
    setPhase("accepted");
    const id = await pickId;
    if (id) await acceptPick(id);
  };

  const markWatched = () => {
    if (!chosen) return;
    void setWatched(chosen.itemId, true);
    setItems((all) => all.map((i) => (i.titleId === chosen.titleId ? { ...i, watched: true } : i)));
    setChosen({ ...chosen, watched: true });
  };

  const startOver = () => {
    setExcluded([]);
    setEmptyNote(null);
    setPhase("idle");
    setShown(null);
    setChosen(null);
  };

  const spinning = phase === "spinning";
  const hasPick = (phase === "landed" || phase === "accepted") && chosen;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <ShipBeam width={200} beam={70} spread={120} beamClassName="opacity-50" />
        <h2 className="mt-4 font-brand text-xl font-bold">Nothing to pick from yet</h2>
        <p className="max-w-64 text-sm text-muted-foreground">Add a few movies, series or anime to a list, then come back and let the UFO choose.</p>
        <Link href="/add" className="mt-2 flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
          Add titles
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* The stage: ship, beam, and whatever is in the beam right now. */}
      <div className="relative mx-auto h-[364px] w-full max-w-xs">
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          <ShipBeam
            width={240}
            beam={300}
            spread={290}
            priority
            flight
            beamClassName={spinning ? "animate-beam opacity-100 brightness-110" : hasPick ? "opacity-75" : "opacity-45"}
          />
        </div>
        {/* In the beam, a little below the ship, where it's wide enough to hold a poster. */}
        <div className="absolute top-[166px] left-1/2 w-32 -translate-x-1/2">
          {shown ? (
            <div key={`${shown.itemId}-${phase}`} className={cn(phase === "spinning" ? "animate-fade-in" : "animate-beam-down")}>
              <Poster src={shown.posterUrl} name={shown.name} kind={shown.kind} priority className={cn("shadow-2xl shadow-black/70", spinning && "brightness-110 saturate-50")} />
            </div>
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center rounded-xl border-2 border-dashed border-primary/30 font-brand text-5xl font-bold text-primary/40">
              ?
            </div>
          )}
        </div>
      </div>

      <div aria-live="polite" className="sr-only">
        {hasPick ? `The UFO picked ${chosen.name}.` : ""}
      </div>

      {hasPick ? (
        <div key={chosen.itemId} className="animate-rise mt-2 flex flex-col items-center text-center">
          <h2 className="font-brand text-2xl leading-tight font-bold text-balance">{chosen.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{titleMeta(chosen)}</p>
          {(chosen.score != null || chosen.genres.length > 0) && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              {chosen.score != null && (
                <span className="flex items-center gap-0.5 font-medium text-foreground">
                  <Star className="size-3.5 fill-primary text-primary" aria-hidden /> {chosen.score}%
                </span>
              )}
              {chosen.genres.slice(0, 3).join(" · ")}
            </p>
          )}
          {chosen.overview && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-foreground/80">{chosen.overview}</p>}

          {phase === "landed" ? (
            <div className="mt-6 flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={accept}
                className="flex h-13 items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_8px_30px_-6px] shadow-primary/40 active:scale-[0.98]"
              >
                We&apos;re watching this
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={again} className="flex h-12 items-center justify-center gap-2 rounded-2xl border bg-card text-sm font-semibold active:scale-[0.98]">
                  <RotateCcw className="size-4" aria-hidden /> Nope, again
                </button>
                <button type="button" onClick={seenIt} className="flex h-12 items-center justify-center gap-2 rounded-2xl border bg-card text-sm font-semibold active:scale-[0.98]">
                  <Eye className="size-4" aria-hidden /> Seen it
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex w-full flex-col items-center gap-2">
              <p className="font-brand text-lg font-bold text-primary">Enjoy the show 🍿</p>
              {chosen.watched ? (
                <div className="flex flex-col items-center gap-1 py-1">
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="size-4 text-primary" aria-hidden /> Marked as watched. How was it?
                  </p>
                  <StarRating titleId={chosen.titleId} stars={chosen.stars} size="lg" />
                </div>
              ) : (
                <button type="button" onClick={markWatched} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border bg-card text-sm font-semibold active:scale-[0.98]">
                  <Eye className="size-4" aria-hidden /> Done? Mark as watched
                </button>
              )}
              <Link href="/" className="flex h-12 w-full items-center justify-center rounded-2xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                Back home
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {emptyNote ?? (pool.length === 0 ? "Nothing fits these filters." : `${countTitles(open.length)} in the running`)}
            </p>
            <button
              type="button"
              onClick={() => spin()}
              disabled={spinning || open.length === 0}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground shadow-[0_8px_30px_-6px] shadow-primary/40 transition-[transform,opacity] active:scale-[0.98] disabled:opacity-50"
            >
              {spinning ? "Scanning…" : "Pick for me"}
            </button>
            {excluded.length > 0 && !spinning && (
              <button type="button" onClick={startOver} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Start over ({excluded.length} ruled out)
              </button>
            )}
          </div>

          <fieldset disabled={spinning} className="flex min-w-0 flex-col gap-3 transition-opacity disabled:opacity-50">
            <legend className="sr-only">Filters</legend>
            {lists.length > 1 && (
              <Row label="List">
                <Chip active={listId === "all"} onClick={() => setListId("all")}>
                  All lists
                </Chip>
                {lists.map((l) => (
                  <Chip key={l.id} active={listId === l.id} onClick={() => setListId(l.id)}>
                    <ListIcon icon={l.icon} color={l.color} className="mr-1.5 -ml-1 size-5" />
                    {l.name}
                  </Chip>
                ))}
              </Row>
            )}
            {kindsHere.length > 1 && (
              <Row label="Kind">
                <Chip active={filters.kinds.length === 0} onClick={() => update({ kinds: [] })}>
                  Anything
                </Chip>
                {kindsHere.map((k) => (
                  <Chip key={k} active={filters.kinds.includes(k)} onClick={() => toggleKind(k)}>
                    {KIND_PLURAL[k]}
                  </Chip>
                ))}
              </Row>
            )}
            <Row label="Time">
              {(Object.keys(TIME_OPTIONS) as TimeOption[]).map((t) => (
                <Chip key={t} active={filters.time === t} onClick={() => update({ time: t })}>
                  {TIME_OPTIONS[t].label}
                </Chip>
              ))}
            </Row>
            <div className="flex items-center gap-3">
              {genres.length > 0 && (
                <Picker
                  label="Genre"
                  value={filters.genre ?? ""}
                  onChange={(g) => update({ genre: g || null })}
                  options={[{ value: "", label: "Any genre" }, ...genres.map((g) => ({ value: g, label: g }))]}
                  className="flex-1"
                />
              )}
              <label className="flex h-10 shrink-0 items-center gap-2 rounded-xl border bg-card px-3 text-sm">
                <input
                  type="checkbox"
                  checked={filters.includeWatched}
                  onChange={(e) => update({ includeWatched: e.target.checked })}
                  className="size-4 accent-[var(--primary)]"
                />
                Rewatches
              </label>
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}
