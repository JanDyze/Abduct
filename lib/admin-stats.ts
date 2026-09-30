import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { addDays } from "@/lib/day";
import type { Kind } from "@/lib/titles/kinds";

// Numbers for the admin dashboard, across every account, after Kept's. "Active" means anything a
// person did: opened a screen (app_events, from 0.8.0), added, watched, rated or commented on a
// title, let the UFO pick, made or liked a list, so days before screens were recorded still count.

const ACTIVITY = sql`
  select user_id, created_at as ts from app_events
  union all select user_id, added_at from list_items
  union all select user_id, watched_at from list_items where watched_at is not null
  union all select user_id, created_at from picks
  union all select user_id, updated_at from ratings
  union all select user_id, created_at from comments
  union all select user_id, created_at from lists
  union all select user_id, created_at from list_likes`;

const DAYS = 30;

export type DayCount = { day: string; value: number };

function fillDays(rows: { day: string; n: number }[], today: string, days = DAYS): DayCount[] {
  const byDay = new Map(rows.map((r) => [r.day, Number(r.n)]));
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i - days + 1);
    return { day, value: byDay.get(day) ?? 0 };
  });
}

export async function adminStats(tz: string, today: string) {
  const since = addDays(today, -DAYS + 1);
  const [active, activeByDay, users, signupsByDay, totals, kinds, pages, mostAdded, mostPicked, recent] = await Promise.all([
    db.execute<{ today: number; week: number; month: number }>(sql`
      with act as (${ACTIVITY})
      select
        count(distinct user_id) filter (where (ts at time zone ${tz})::date = ${today}::date)::int as today,
        count(distinct user_id) filter (where ts >= now() - interval '7 days')::int as week,
        count(distinct user_id) filter (where ts >= now() - interval '30 days')::int as month
      from act where ts >= now() - interval '31 days'`),
    db.execute<{ day: string; n: number }>(sql`
      with act as (${ACTIVITY})
      select (ts at time zone ${tz})::date::text as day, count(distinct user_id)::int as n
      from act where (ts at time zone ${tz})::date >= ${since}::date
      group by 1`),
    db.execute<{ total: number; week: number; guests: number }>(sql`
      select count(*)::int as total,
        count(*) filter (where created_at >= now() - interval '7 days')::int as week,
        count(*) filter (where is_anonymous)::int as guests
      from auth.users`),
    db.execute<{ day: string; n: number }>(sql`
      select (created_at at time zone ${tz})::date::text as day, count(*)::int as n
      from auth.users where (created_at at time zone ${tz})::date >= ${since}::date
      group by 1`),
    db.execute<Record<string, number>>(sql`
      select
        (select count(*) from list_items)::int as added,
        (select count(*) from list_items where added_at >= now() - interval '7 days')::int as added_week,
        (select count(*) from list_items where watched_at is not null)::int as watched,
        (select count(*) from lists)::int as lists,
        (select count(*) from lists where is_public)::int as public_lists,
        (select count(*) from picks)::int as picks,
        (select count(*) from picks where accepted)::int as accepted,
        (select count(*) from ratings)::int as ratings,
        (select count(*) from comments)::int as comments,
        (select count(*) from comments where is_public)::int as public_comments,
        (select count(*) from list_likes)::int as likes,
        (select count(*) from titles)::int as titles,
        (select count(*) from app_events where kind = 'view' and created_at >= now() - interval '7 days')::int as views,
        -- A visit is opening Abduct: a person's first screen after 30 minutes without one. Views
        -- alone count every screen change, so going back and forth looked like a crowd.
        (select count(*) filter (where gap is null or gap > interval '30 minutes') from (
          select created_at - lag(created_at) over (partition by user_id order by created_at) as gap
          from app_events where kind = 'view' and created_at >= now() - interval '7 days') v)::int as visits`),
    db.execute<{ kind: Kind; added: number; watched: number; people: number }>(sql`
      select t.kind, count(*)::int as added, count(i.watched_at)::int as watched, count(distinct i.user_id)::int as people
      from list_items i join titles t on t.id = i.title_id
      group by t.kind`),
    db.execute<{ path: string; views: number; people: number }>(sql`
      select path, count(*)::int as views, count(distinct user_id)::int as people
      from app_events where kind = 'view' and created_at >= now() - interval '7 days'
      group by path order by people desc, views desc limit 12`),
    db.execute<{ name: string; kind: Kind; people: number }>(sql`
      select t.name, t.kind, count(distinct i.user_id)::int as people
      from list_items i join titles t on t.id = i.title_id
      group by t.id, t.name, t.kind
      order by people desc, t.name limit 8`),
    db.execute<{ name: string; kind: Kind; picked: number; accepted: number }>(sql`
      select t.name, t.kind, count(*)::int as picked, count(*) filter (where p.accepted)::int as accepted
      from picks p join titles t on t.id = p.title_id
      where p.created_at >= now() - interval '30 days'
      group by t.id, t.name, t.kind
      order by accepted desc, picked desc, t.name limit 8`),
    db.execute<{
      id: string;
      email: string | null;
      created_at: string;
      display_name: string | null;
      last_active: string | null;
      guest: boolean;
      provider: string | null;
      added: number;
      picks: number;
    }>(sql`
      with act as (${ACTIVITY}),
      seen as (select user_id, max(ts) as ts from act group by user_id)
      select u.id, u.email, u.created_at::text, p.display_name, seen.ts::text as last_active,
        coalesce(u.is_anonymous, false) as guest,
        u.raw_app_meta_data->>'provider' as provider,
        (select count(*) from list_items i where i.user_id = u.id)::int as added,
        (select count(*) from picks k where k.user_id = u.id)::int as picks
      from auth.users u
      left join profiles p on p.user_id = u.id
      left join seen on seen.user_id = u.id
      order by coalesce(seen.ts, u.created_at) desc
      limit 30`),
  ]);

  return {
    active: active[0] ?? { today: 0, week: 0, month: 0 },
    activeByDay: fillDays(activeByDay, today),
    users: users[0] ?? { total: 0, week: 0, guests: 0 },
    signupsByDay: fillDays(signupsByDay, today),
    totals: totals[0] ?? {},
    kinds,
    pages,
    mostAdded,
    mostPicked,
    recent,
  };
}
