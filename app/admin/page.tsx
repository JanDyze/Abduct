import type { Metadata } from "next";
import { ColumnChart } from "@/components/admin/column-chart";
import { Screen } from "@/components/screen";
import { requireAdmin } from "@/lib/admin";
import { adminStats } from "@/lib/admin-stats";
import { APP_VERSION } from "@/lib/changelog";
import { getTimeZone, localDate } from "@/lib/day";
import { KIND_LABEL, KIND_PLURAL, KINDS } from "@/lib/titles/kinds";

export const metadata: Metadata = { title: "Dashboard" };

const compact = (n: number) => (n >= 10_000 ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n) : n.toLocaleString());
const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");

function ago(iso: string | null) {
  if (!iso) return "—";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 2) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

// How Abduct is used, across every account, after Kept's dashboard (ADMIN_EMAILS only; everyone
// else gets a 404).
export default async function AdminPage() {
  await requireAdmin();
  const tz = await getTimeZone();
  const today = localDate(tz);
  const s = await adminStats(tz, today);
  const t = s.totals;

  const tiles = [
    { label: "People", value: s.users.total, note: [s.users.week && `+${s.users.week} this week`, s.users.guests && `${s.users.guests} guests`].filter(Boolean).join(" · ") },
    { label: "Active this week", value: s.active.week },
    { label: "Active this month", value: s.active.month },
    { label: "Titles added", value: t.added ?? 0, note: t.added_week ? `+${compact(t.added_week)} this week` : undefined },
    { label: "UFO picks", value: t.picks ?? 0, note: t.picks ? `${percent(t.accepted ?? 0, t.picks)} said yes` : undefined },
    { label: "Visits, 7 days", value: t.visits ?? 0, note: t.views ? `${compact(t.views)} screens opened` : undefined },
  ];
  const more = [
    ["Watched", t.watched],
    ["Lists", t.lists],
    ["Public lists", t.public_lists],
    ["List likes", t.likes],
    ["Ratings", t.ratings],
    ["Comments", t.comments],
    ["Public comments", t.public_comments],
    ["Titles on Abduct", t.titles],
  ] as const;
  const byKind = new Map(s.kinds.map((k) => [k.kind, k]));

  return (
    <Screen back={{ href: "/settings", label: "Settings" }} title="Dashboard" subtitle={`Abduct ${APP_VERSION} · ${tz}`}>
      <section aria-label="Active today" className="rounded-2xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">Active today</p>
        <p className="mt-1 font-sans text-5xl font-semibold tracking-tight">{s.active.today.toLocaleString()}</p>
        <div className="mt-5">
          <ColumnChart data={s.activeByDay} unit={["person", "people"]} label="People active per day, last 30 days" />
        </div>
      </section>

      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-2xl border bg-card px-4 py-3.5">
            <dt className="text-sm text-muted-foreground">{x.label}</dt>
            <dd className="mt-0.5 text-2xl font-semibold tracking-tight">{compact(x.value)}</dd>
            {x.note && <dd className="text-xs text-muted-foreground">{x.note}</dd>}
          </div>
        ))}
      </dl>

      <Section title="Sign-ups, last 30 days">
        <div className="rounded-2xl border bg-card p-4">
          <ColumnChart data={s.signupsByDay} unit={["sign-up", "sign-ups"]} label="Sign-ups per day, last 30 days" />
        </div>
      </Section>

      <Section title="What people add">
        <Table
          head={["Kind", "Added", "Watched", "People"]}
          rows={KINDS.map((k) => {
            const x = byKind.get(k) ?? { added: 0, watched: 0, people: 0 };
            return [KIND_PLURAL[k], x.added.toLocaleString(), percent(x.watched, x.added), x.people.toLocaleString()];
          })}
        />
      </Section>

      <Section title="Screens opened, last 7 days">
        {s.pages.length ? (
          <Table head={["Screen", "People", "Opened"]} rows={s.pages.map((p) => [p.path, p.people.toLocaleString(), p.views.toLocaleString()])} mono />
        ) : (
          <Empty>No screens recorded yet.</Empty>
        )}
      </Section>

      <Section title="Most added">
        {s.mostAdded.length ? (
          <Table head={["Title", "People"]} rows={s.mostAdded.map((m) => [`${m.name} · ${KIND_LABEL[m.kind]}`, m.people.toLocaleString()])} />
        ) : (
          <Empty>Nothing added yet.</Empty>
        )}
      </Section>

      <Section title="What the UFO picked, last 30 days">
        {s.mostPicked.length ? (
          <Table
            head={["Title", "Picked", "Said yes"]}
            rows={s.mostPicked.map((m) => [`${m.name} · ${KIND_LABEL[m.kind]}`, m.picked.toLocaleString(), m.accepted.toLocaleString()])}
          />
        ) : (
          <Empty>No picks yet.</Empty>
        )}
      </Section>

      <Section title="Everything">
        <dl className="grid grid-cols-2 divide-y rounded-2xl border bg-card sm:grid-cols-4 sm:divide-y-0">
          {more.map(([label, n]) => (
            <div key={label} className="px-4 py-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-semibold tabular-nums">{(n ?? 0).toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="People, most recently active">
        <ul className="divide-y rounded-2xl border bg-card">
          {s.recent.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{u.display_name ?? (u.guest ? "Guest" : "No name yet")}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.guest ? "guest" : (u.email ?? "—")}
                  {!u.guest && u.provider && u.provider !== "email" && ` · ${u.provider}`} · joined {ago(u.created_at)} ago
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                <p>
                  {u.added} added · {u.picks} picks
                </p>
                <p>{ago(u.last_active)}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="mt-7">
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

function Table({ head, rows, mono }: { head: string[]; rows: string[][]; mono?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {head.map((h, i) => (
              <th key={h} scope="col" className={i === 0 ? "px-4 py-2 font-medium" : "px-3 py-2 text-right font-medium"}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, i) => (
                <td key={i} className={i === 0 ? `max-w-0 truncate px-4 py-2 ${mono ? "font-mono text-[0.8rem]" : ""}` : "w-20 px-3 py-2 text-right tabular-nums"}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
