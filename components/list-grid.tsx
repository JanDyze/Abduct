"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Dices, Eye, Globe, Loader2, Lock, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { deleteList, makeDefault, setListPublic } from "@/app/lists/actions";
import { ListBadge } from "@/components/list-icon";
import { ListCard } from "@/components/list-card";
import { SubmitButton } from "@/components/submit-button";
import { Sheet, SheetItem } from "@/components/ui/sheet";
import { countTitles } from "@/lib/format";
import type { ListSummary } from "@/lib/lists/queries";
import { useLongPress } from "@/lib/use-long-press";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";

// My lists' cards, two across. Tap one to open it; hold one (or right-click it) for its quick
// actions: add to it, let the UFO pick from it, make it your default, share it, edit or delete it.
export function ListGrid({ lists }: { lists: ListSummary[] }) {
  const [heldId, setHeldId] = useState<string | null>(null);
  const held = lists.find((l) => l.id === heldId) ?? null;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {lists.map((list, i) => (
          <HoldableCard
            key={list.id}
            list={list}
            held={list.id === heldId}
            onHold={() => {
              sound.pop(2);
              setHeldId(list.id);
            }}
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
      <ListActions list={held} onClose={() => setHeldId(null)} />
    </>
  );
}

function HoldableCard({ list, held, onHold, style }: { list: ListSummary; held: boolean; onHold: () => void; style: React.CSSProperties }) {
  const press = useLongPress(onHold);
  return <ListCard list={list} held={held} className="animate-rise" style={style} aria-description="Hold for quick actions" {...press} />;
}

const LINK_ROW = "flex min-h-13 w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-[background-color,transform] hover:bg-muted active:scale-[0.99] focus-visible:bg-muted focus-visible:outline-none";

// A link styled as a sheet row.
function SheetLink({ href, icon, label, detail, onClick }: { href: string; icon: React.ReactNode; label: string; detail?: string; onClick: () => void }) {
  return (
    <Link href={href} transitionTypes={["nav-forward"]} onClick={onClick} className={LINK_ROW}>
      <span className="flex size-9 shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.95rem] font-semibold">{label}</span>
        {detail && <span className="block truncate text-xs text-muted-foreground">{detail}</span>}
      </span>
    </Link>
  );
}

// What holding a list opens. Default and Public take effect at once; Delete asks first (your
// default can't be deleted: it's where titles go when you add without choosing).
function ListActions({ list: current, onClose }: { list: ListSummary | null; onClose: () => void }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // the last list held, so the sheet keeps its content while it slides away
  const [shown, setShown] = useState(current);
  if (current && current !== shown) setShown(current);

  const close = () => {
    setConfirming(false);
    setError(null);
    onClose();
  };

  const run = (action: () => Promise<{ error?: string }>, done: () => void) =>
    start(async () => {
      setError(null);
      const result = await action();
      if (result.error) {
        sound.error();
        return setError(result.error);
      }
      done();
      close();
      router.refresh();
    });

  if (!shown) return null;
  const l = shown;
  const watched = l.total - l.unwatched;
  const icon = "size-5 text-muted-foreground";

  return (
    <Sheet
      open={current !== null}
      onOpenChange={(o) => !o && close()}
      title={l.name}
      description={[l.isDefault && "Default", l.isPublic ? "Public" : "Private", l.total === 0 ? "Empty" : `${countTitles(l.total)} · ${watched} watched`].filter(Boolean).join(" · ")}
      header={<ListBadge icon={l.icon} color={l.color} className="size-11 rounded-xl" />}
    >
      <ul className={cn(busy && "pointer-events-none opacity-70")}>
        <li>
          <SheetLink href={`/lists/${l.id}`} onClick={close} icon={<ArrowRight className={icon} aria-hidden />} label="Open" />
        </li>
        <li>
          <SheetLink href={`/add?list=${l.id}`} onClick={close} icon={<Plus className={icon} aria-hidden />} label="Add titles" detail="Search and put them straight on this list" />
        </li>
        {l.unwatched > 0 && (
          <li>
            <SheetLink
              href={`/spin?list=${l.id}`}
              onClick={close}
              icon={<Dices className={icon} aria-hidden />}
              label="Pick for me"
              detail={`The UFO chooses from its ${countTitles(l.unwatched)} to watch`}
            />
          </li>
        )}
        {!l.isDefault && (
          <li>
            <SheetItem
              icon={<Star className={icon} aria-hidden />}
              label="Make it my default"
              detail="Where + adds to when you don't choose"
              onClick={() => run(() => makeDefault(l.id), () => sound.pop(5))}
            />
          </li>
        )}
        <li>
          <SheetItem
            icon={l.isPublic ? <Lock className={icon} aria-hidden /> : <Globe className={icon} aria-hidden />}
            label={l.isPublic ? "Make it private" : "Make it public"}
            detail={l.isPublic ? "Take it out of Discover" : "Share it in Discover, with your name"}
            onClick={() => run(() => setListPublic(l.id, !l.isPublic), () => sound.pop(l.isPublic ? -3 : 5))}
          />
        </li>
        {l.isPublic && (
          <li>
            <SheetLink href={`/discover/lists/${l.id}`} onClick={close} icon={<Eye className={icon} aria-hidden />} label="See it as others do" />
          </li>
        )}
        <li>
          <SheetLink href={`/lists/${l.id}/edit`} onClick={close} icon={<Pencil className={icon} aria-hidden />} label="Edit" detail="Name, icon and color" />
        </li>
        {!l.isDefault && (
          <li className="mt-1 border-t pt-1">
            {confirming ? (
              <form
                action={(formData) => {
                  sound.whoosh();
                  return deleteList(formData);
                }}
                className="animate-fade-in flex flex-col gap-2 rounded-2xl bg-destructive/5 p-3"
              >
                <input type="hidden" name="id" value={l.id} />
                <p className="text-sm">
                  Delete {l.name}
                  {l.total > 0 && ` and the ${countTitles(l.total)} on it`}? They stay on your other lists.
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirming(false)} className="h-11 flex-1 rounded-xl border text-sm font-medium hover:bg-muted">
                    Keep it
                  </button>
                  <SubmitButton variant="destructive" className="h-11 flex-1 rounded-xl bg-destructive text-background hover:bg-destructive/90">
                    Delete
                  </SubmitButton>
                </div>
              </form>
            ) : (
              <SheetItem icon={<Trash2 className="size-5" aria-hidden />} label="Delete list" tone="danger" onClick={() => setConfirming(true)} />
            )}
          </li>
        )}
      </ul>
      {busy && (
        <p className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground" aria-live="polite">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Saving…
        </p>
      )}
      {error && (
        <p role="alert" className="px-3 pb-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </Sheet>
  );
}
