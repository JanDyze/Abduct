import "server-only";

// What's said in a clip, written down by AssemblyAI in whatever language it's in. Used for videos
// shared to Abduct (app/api/transcribe) and for a shared reel's audio fetched from its link
// (app/api/listen-link). Needs ASSEMBLYAI_API_KEY.
const API = "https://api.assemblyai.com/v2";
const GIVE_UP = 90_000;

export const canTranscribe = () => Boolean(process.env.ASSEMBLYAI_API_KEY);

export async function transcribe(audio: ArrayBuffer): Promise<{ text: string; language: string | null }> {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new Error("ASSEMBLYAI_API_KEY isn't set");
  const headers = { authorization: key };
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
    if (t.status === "completed") return { text: t.text ?? "", language: t.language_code ?? null };
    if (t.status === "error") throw new Error(t.error ?? "transcription failed");
  }
  throw new Error("transcription took too long");
}
