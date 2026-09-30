"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { ArrowUp, Globe, Loader2, Lock } from "lucide-react";
import { addComment, deleteComment } from "@/app/items/actions";
import type { PublicComment } from "@/lib/social/discover";
import type { CommentView } from "@/lib/titles/feedback";
import { cn } from "@/lib/utils";
import { when } from "@/lib/when";
import { sound } from "@/lib/sound";

type Comment = CommentView & { sending?: boolean };

const noSubscription = () => () => {};
const phoneZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// When a comment was written, in the phone's time zone (the server only knows UTC). Blank until known.
export function When({ at }: { at: string }) {
  const zone = useSyncExternalStore(noSubscription, phoneZone, () => null);
  return <>{zone ? when(new Date(at), zone) : ""}</>;
}

// What others said about a title, with their names: read-only.
export function OthersComments({ comments, title = "What others said" }: { comments: PublicComment[]; title?: string }) {
  if (comments.length === 0) return null;
  return (
    <section aria-labelledby="others-heading" className="mt-8">
      <h2 id="others-heading" className="flex items-baseline gap-2 font-brand text-lg font-bold">
        {title}
        <span className="text-sm font-normal text-muted-foreground tabular-nums">{comments.length}</span>
      </h2>
      <ol className="mt-3 flex flex-col gap-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-2xl border bg-card px-4 py-3">
            <p className="flex items-baseline gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{c.name}</span>
              <span aria-hidden>·</span>
              <When at={c.at} />
            </p>
            <p className="mt-1 leading-relaxed break-words whitespace-pre-line">{c.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// What you thought of a title, as a thread: dated comments added over time, newest at the foot, like
// Kept's notes on a verse. Each is for everyone (shown on the title with your name) or only you;
// the switch by the box says which the next one will be. New comments show at once and settle when
// saved.
export function Comments({ titleId, initial }: { titleId: string; initial: CommentView[] }) {
  const [comments, setComments] = useState<Comment[]>(initial);
  const [draft, setDraft] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function send() {
    const body = draft.trim();
    if (!body) return;
    const temp: Comment = { id: `sending-${Date.now()}`, body, at: new Date().toISOString(), isPublic, sending: true };
    setComments((list) => [...list, temp]);
    setDraft("");
    setError(null);
    sound.pop(2);
    startTransition(async () => {
      const result = await addComment(titleId, body, isPublic);
      if ("error" in result) {
        setComments((list) => list.filter((c) => c.id !== temp.id));
        setDraft(body);
        setError(result.error);
      } else {
        setComments((list) => list.map((c) => (c.id === temp.id ? result.comment : c)));
      }
    });
  }

  function remove(comment: Comment) {
    if (!window.confirm("Delete this comment?")) return;
    const at = comments.indexOf(comment);
    setComments((list) => list.filter((c) => c.id !== comment.id));
    sound.remove();
    startTransition(async () => {
      const result = await deleteComment(comment.id);
      if (result.error) {
        setComments((list) => [...list.slice(0, at), comment, ...list.slice(at)]);
        setError(result.error);
      }
    });
  }

  return (
    <section aria-labelledby="comments-heading" className="mt-8">
      <h2 id="comments-heading" className="flex items-baseline gap-2 font-brand text-lg font-bold">
        Your comments
        {comments.length > 0 && <span className="text-sm font-normal text-muted-foreground tabular-nums">{comments.length}</span>}
      </h2>

      {comments.length > 0 && (
        <ol className="relative mt-3 flex flex-col gap-4 border-l border-border pl-5">
          {comments.map((c) => (
            <li key={c.id} className={cn("animate-rise relative", c.sending && "opacity-60")}>
              <span className="absolute top-3.5 -left-[1.53rem] size-2 rounded-full bg-primary/60 ring-4 ring-background" aria-hidden />
              <p className="w-fit max-w-full rounded-2xl rounded-tl-md bg-muted/80 px-4 py-2.5 leading-relaxed break-words whitespace-pre-line">{c.body}</p>
              <p className="mt-1 flex items-center gap-2 pl-1 text-xs text-muted-foreground">
                <span>{c.sending ? "Saving…" : <When at={c.at} />}</span>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1">
                  {c.isPublic ? <Globe className="size-3" aria-hidden /> : <Lock className="size-3" aria-hidden />}
                  {c.isPublic ? "Everyone" : "Only you"}
                </span>
                {!c.sending && (
                  <>
                    <span aria-hidden>·</span>
                    <button type="button" onClick={() => remove(c)} className="py-1 hover:text-destructive">
                      Delete
                    </button>
                  </>
                )}
              </p>
            </li>
          ))}
        </ol>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-4 rounded-2xl border bg-card p-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40"
      >
        <div className="flex items-end gap-2 pl-2.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={comments.length ? "Add to the thread…" : "What did you think?"}
            aria-label="Add a comment"
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-2 text-base leading-snug outline-none [field-sizing:content] placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Add comment"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
          >
            {comments.some((c) => c.sending) ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowUp className="size-4" aria-hidden />}
          </button>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          onClick={() => setIsPublic((v) => !v)}
          className="mt-1 flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {isPublic ? <Globe className="size-3.5" aria-hidden /> : <Lock className="size-3.5" aria-hidden />}
          {isPublic ? "Everyone can see this" : "Only you can see this"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
