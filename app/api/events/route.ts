import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { appEvents } from "@/lib/db/schema";
import { foldPath } from "@/lib/fold-path";

// Screens opened, for the admin dashboard, sent by ActivityPing. Only signed-in people are
// counted, and the admin pages themselves aren't.
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return new Response(null, { status: 204 });
  let path = "/";
  try {
    const body = (await request.json()) as { path?: unknown };
    if (typeof body.path === "string" && body.path.startsWith("/")) path = body.path;
  } catch {
    return new Response(null, { status: 400 });
  }
  const folded = foldPath(path);
  if (folded.startsWith("/admin") || folded.startsWith("/login")) return new Response(null, { status: 204 });
  await db.insert(appEvents).values({ userId: user.id, kind: "view", path: folded });
  return new Response(null, { status: 204 });
}
