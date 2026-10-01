// Where the phone's share sheet sends things (the manifest's share_target, a POST so videos can come
// too). The service worker (public/sw.js) usually catches it first, keeps a shared video on the
// phone and opens /share. Without it (the app not set up yet), this takes the text and the link and
// opens /share with them; a video can't be kept that way.
export async function POST(request: Request) {
  const q = new URLSearchParams();
  try {
    const form = await request.formData();
    for (const k of ["title", "text", "url"]) {
      const v = form.get(k);
      if (typeof v === "string" && v) q.set(k, v.slice(0, 2000));
    }
    const media = form.get("media");
    if (media && typeof media !== "string" && media.size > 0) q.set("media", "lost");
  } catch {}
  return new Response(null, { status: 303, headers: { Location: `/share${q.size ? `?${q}` : ""}` } });
}

export function GET() {
  return new Response(null, { status: 303, headers: { Location: "/share" } });
}
