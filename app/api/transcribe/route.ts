import { canTranscribe, transcribe } from "@/lib/assemblyai";
import { getUser } from "@/lib/auth";

// A shared video's words, for working out which movie it's about (app/share): the phone sends just
// its audio, already shrunk to 16 kHz mono (components/shared-media.tsx), and AssemblyAI writes
// down what's said (lib/assemblyai.ts).
export const maxDuration = 120;

const MAX_BYTES = 4_200_000; // under Vercel's 4.5 MB request limit; about two minutes of audio

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  if (!canTranscribe()) return Response.json({ error: "Listening to videos isn't set up." }, { status: 503 });
  if (!(request.headers.get("content-type") ?? "").startsWith("audio/")) return Response.json({ error: "Send the clip's audio." }, { status: 415 });
  const audio = await request.arrayBuffer();
  if (audio.byteLength < 1000) return Response.json({ error: "That clip has no sound." }, { status: 400 });
  if (audio.byteLength > MAX_BYTES) return Response.json({ error: "That clip is too long." }, { status: 413 });
  try {
    return Response.json(await transcribe(audio));
  } catch (e) {
    console.error("Transcribing a shared clip failed:", e);
    return Response.json({ error: "Couldn't listen to that clip just now." }, { status: 502 });
  }
}
