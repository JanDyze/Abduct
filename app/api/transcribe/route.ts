import { getUser } from "@/lib/auth";

// A shared reel's words, for working out which movie it's about (app/share): the phone sends just
// its audio, already shrunk to 16 kHz mono (components/shared-media.tsx), and AssemblyAI writes
// down what's said, in whatever language. Needs ASSEMBLYAI_API_KEY.
export const maxDuration = 120;

const API = "https://api.assemblyai.com/v2";
const MAX_BYTES = 4_200_000; // under Vercel's 4.5 MB request limit; about two minutes of audio
const GIVE_UP = 90_000;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) return Response.json({ error: "Listening to videos isn't set up." }, { status: 503 });
  if (!(request.headers.get("content-type") ?? "").startsWith("audio/")) return Response.json({ error: "Send the clip's audio." }, { status: 415 });
  const audio = await request.arrayBuffer();
  if (audio.byteLength < 1000) return Response.json({ error: "That clip has no sound." }, { status: 400 });
  if (audio.byteLength > MAX_BYTES) return Response.json({ error: "That clip is too long." }, { status: 413 });

  const headers = { authorization: key };
  try {
    const upload = await fetch(`${API}/upload`, { method: "POST", headers: { ...headers, "content-type": "application/octet-stream" }, body: audio });
    if (!upload.ok) throw new Error(`upload ${upload.status}`);
    const { upload_url } = (await upload.json()) as { upload_url: string };

    const created = await fetch(`${API}/transcript`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ audio_url: upload_url, language_detection: true }),
    });
    if (!created.ok) throw new Error(`transcript ${created.status}`);
    const { id } = (await created.json()) as { id: string };

    // short clips are usually done in a few seconds
    const started = Date.now();
    while (Date.now() - started < GIVE_UP) {
      await new Promise((r) => setTimeout(r, 1500));
      const res = await fetch(`${API}/transcript/${id}`, { headers });
      const t = (await res.json()) as { status: string; text?: string | null; language_code?: string; error?: string };
      if (t.status === "completed") return Response.json({ text: t.text ?? "", language: t.language_code ?? null });
      if (t.status === "error") throw new Error(t.error ?? "transcription failed");
    }
    return Response.json({ error: "Listening took too long. Try again." }, { status: 504 });
  } catch (e) {
    console.error("Transcribing a shared clip failed:", e);
    return Response.json({ error: "Couldn't listen to that clip just now." }, { status: 502 });
  }
}
