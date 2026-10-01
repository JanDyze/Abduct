import { z } from "zod";
import { canTranscribe, transcribe } from "@/lib/assemblyai";
import { getUser } from "@/lib/auth";
import { reelAudio } from "@/lib/share/media";

// A shared reel's words, straight from its link: the server fetches the video's sound
// (lib/share/media.ts) and AssemblyAI writes down what's said, so the share page can work out the
// title without the video being saved first. Best effort: the apps may refuse, and then it says so.
export const maxDuration = 120;

const Body = z.object({ url: z.url().max(2000) });

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  if (!canTranscribe()) return Response.json({ error: "Listening to videos isn't set up." }, { status: 503 });
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Send the reel's link." }, { status: 400 });

  let audio;
  try {
    audio = await reelAudio(body.data.url);
  } catch (e) {
    console.error("Fetching a shared reel's video failed:", e);
    return Response.json({ error: "The app wouldn't hand over this video." }, { status: 502 });
  }
  try {
    return Response.json({ ...(await transcribe(audio.data)), site: audio.site });
  } catch (e) {
    console.error("Transcribing a shared reel failed:", e);
    return Response.json({ error: "Couldn't listen to that reel just now." }, { status: 502 });
  }
}
