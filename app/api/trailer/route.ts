import { getUser } from "@/lib/auth";
import { trailerOf } from "@/lib/titles/trailer";

// A title's YouTube trailer id (lib/titles/trailer.ts), asked for when you tap Trailer.
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const source = params.get("source") ?? "";
  const id = (params.get("id") ?? "").slice(0, 40);
  if (!["tmdb", "anilist"].includes(source) || !id) return Response.json({ youtube: null });
  return Response.json({ youtube: await trailerOf(source, id) }, { headers: { "cache-control": "private, max-age=3600" } });
}
