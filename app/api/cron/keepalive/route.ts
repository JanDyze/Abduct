import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Daily Vercel cron: one tiny query so the free Supabase project isn't paused for inactivity.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  await db.execute(sql`select 1`);
  return Response.json({ ok: true, at: new Date().toISOString() });
}
