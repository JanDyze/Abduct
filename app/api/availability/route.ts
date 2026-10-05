import { z } from "zod";
import { getUser } from "@/lib/auth";
import { viewerCountry } from "@/lib/country";
import { myServices } from "@/lib/my-services";
import { availabilityOfMany } from "@/lib/titles/availability";

// Which of some titles you can play right now: free in your country, or on a service you have
// (lib/titles/availability.ts). For Pick for me's "Can play now" and "Free" filters.
export const maxDuration = 60;

const Body = z.object({ titles: z.array(z.object({ source: z.enum(["tmdb", "anilist", "manual"]), sourceId: z.string().min(1).max(60) })).max(60) });

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Send some titles." }, { status: 400 });
  const [country, mine] = await Promise.all([viewerCountry(), myServices()]);
  return Response.json({ availability: await availabilityOfMany(body.data.titles, country.code, new Set(mine)) });
}
