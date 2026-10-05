import Anthropic from "@anthropic-ai/sdk";
import { getUser } from "@/lib/auth";
import { canReadScreenshots, readScreenshot, type ImageType } from "@/lib/share/read-screenshot";

// The titles written in a screenshot (lib/share/read-screenshot.ts). The phone shrinks the image
// first (components/screenshot-button.tsx), so it's well under Vercel's request limit.
export const maxDuration = 30;

const MAX_BYTES = 4_000_000;
const TYPES: ImageType[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  if (!canReadScreenshots()) return Response.json({ error: "Reading screenshots isn't set up." }, { status: 503 });
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim() as ImageType;
  if (!TYPES.includes(type)) return Response.json({ error: "Send a picture." }, { status: 415 });
  const image = await request.arrayBuffer();
  if (image.byteLength < 100) return Response.json({ error: "That picture is empty." }, { status: 400 });
  if (image.byteLength > MAX_BYTES) return Response.json({ error: "That picture is too big." }, { status: 413 });
  try {
    return Response.json({ titles: await readScreenshot(image, type) });
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error(`Reading a screenshot failed (${e.status}):`, e.message);
    else console.error("Reading a screenshot failed:", e);
    return Response.json({ error: "Couldn't read that screenshot just now." }, { status: 502 });
  }
}
