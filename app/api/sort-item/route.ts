import { z } from "zod";
import { getUser } from "@/lib/auth";
import { autoSortItem } from "@/lib/lists/auto-sort";

// Sorts a title just added to your default list into the list it belongs on (lib/lists/auto-sort.ts).
// A plain request rather than a server action, so it runs alongside further adds instead of
// queueing them behind it.
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const itemId = z.uuid().safeParse(body?.itemId);
  if (!itemId.success) return Response.json({ error: "That title can't be found." }, { status: 400 });
  return Response.json(await autoSortItem(user.id, itemId.data));
}
