import { getUser } from "@/lib/auth";
import { playerUrl } from "@/lib/titles/player";

// Sends the movie player (components/play-movie.tsx) on to the real player, so its address stays
// in MOVIE_PLAYER_URL on the server instead of in the page. Signed-in people only.
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const url = playerUrl(new URL(request.url).searchParams.get("id") ?? "");
  if (!url) return Response.json({ error: "Can't play that." }, { status: 404 });
  return new Response(null, { status: 302, headers: { location: url, "cache-control": "private, no-store" } });
}
