import "server-only";
import { allowed, resolve, siteOf } from "@/lib/share/resolve";

// A shared reel's sound, fetched from its link, so it can be listened to for the title
// (app/api/listen-link) without saving the video first. Best effort, site by site: these apps
// don't offer it, change their pages often and may turn away servers, so any step failing just
// means "couldn't listen to this one". Only the sites' own video servers are downloaded from.
const CDNS = ["googlevideo.com", "tiktokcdn.com", "tiktokcdn-us.com", "tiktokv.com", "tiktokv.us", "ibyteimg.com", "byteoversea.com", "fbcdn.net", "cdninstagram.com"];
const MAX_BYTES = 30_000_000;
const YT_BYTES = 3_000_000; // YouTube's audio-only stream: about three minutes is plenty
const YT_CHUNK = 1_000_000;
const TIMEOUT = 20_000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type ReelAudio = { data: ArrayBuffer; type: string; site: string };

const fromCdn = (raw: string) => {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    return u.protocol === "https:" && CDNS.some((h) => host === h || host.endsWith(`.${h}`)) ? u : null;
  } catch {
    return null;
  }
};

async function download(raw: string, headers: Record<string, string> = {}, max = MAX_BYTES): Promise<{ data: ArrayBuffer; type: string }> {
  const u = fromCdn(raw);
  if (!u) throw new Error(`not a video server: ${raw.slice(0, 60)}`);
  const res = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT), headers: { "User-Agent": UA, ...headers } });
  if (res.status >= 300 && res.status < 400) {
    const next = res.headers.get("location");
    if (!next) throw new Error(`download ${res.status}`);
    return download(new URL(next, u).toString(), headers, max);
  }
  if (!res.ok || !res.body) throw new Error(`download ${res.status}`);
  if (Number(res.headers.get("content-length") ?? 0) > max) throw new Error("video too big");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    size += chunk.byteLength;
    if (size > max) throw new Error("video too big");
    chunks.push(chunk);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return { data: out.buffer, type: (res.headers.get("content-type") ?? "video/mp4").split(";")[0] };
}

async function page(u: URL, userAgent = UA) {
  const res = await fetch(u, { redirect: "follow", signal: AbortSignal.timeout(TIMEOUT), headers: { "User-Agent": userAgent, "Accept-Language": "en-US,en;q=0.9", Accept: "text/html" } });
  if (!res.ok) throw new Error(`page ${res.status}`);
  // a redirect to a login or consent page would have left the site
  if (!allowed(res.url || u.toString())) throw new Error("page moved off the site");
  return { html: (await res.text()).slice(0, 3_000_000), cookies: res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") };
}

// A URL inside page JSON, escaped once or twice over: "https:\/\/…&…"
const unescape = (s: string) => s.replace(/\\+\//g, "/").replace(/\\+u0026/g, "&").replace(/\\+u002[fF]/g, "/").replace(/\\+u003[dD]/g, "=");
// "key":"https…" in page JSON, also when that JSON sits escaped inside a string
const field = (html: string, keys: string) => new RegExp(`\\\\*"(?:${keys})\\\\*":\\\\*"(https.+?)\\\\*"`).exec(html)?.[1];

function youtubeId(u: URL) {
  if (u.hostname.endsWith("youtu.be")) return u.pathname.slice(1).split("/")[0];
  return u.searchParams.get("v") ?? /^\/(?:shorts|live|embed)\/([\w-]{6,})/.exec(u.pathname)?.[1] ?? null;
}

// YouTube's iPhone app is handed plain stream URLs; the web player's need deciphering.
async function youtube(u: URL) {
  const id = youtubeId(u);
  if (!id || !/^[\w-]{6,20}$/.test(id)) throw new Error("no video id");
  const { Innertube } = await import("youtubei.js");
  const yt = await Innertube.create({ retrieve_player: false, generate_session_locally: true });
  const info = await yt.getBasicInfo(id, { client: "IOS" });
  const f = info.chooseFormat({ type: "audio", quality: "best" });
  if (!f.url) throw new Error("no audio stream");
  // It refuses big requests, so it comes a piece at a time; some videos stop after the first piece
  // (about a minute of sound), which is usually enough to hear a title.
  const want = Math.min(Number(f.content_length) || YT_BYTES, YT_BYTES);
  const parts: ArrayBuffer[] = [];
  for (let at = 0; at < want; at += YT_CHUNK) {
    const part = await download(f.url, { Range: `bytes=${at}-${Math.min(at + YT_CHUNK, want) - 1}` }, YT_CHUNK).catch((e: unknown) => {
      if (parts.length === 0) throw e;
      return null;
    });
    if (!part) break;
    parts.push(part.data);
    if (part.data.byteLength < Math.min(YT_CHUNK, want - at)) break;
  }
  const data = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
  parts.reduce((at, p) => (data.set(new Uint8Array(p), at), at + p.byteLength), 0);
  return { data: data.buffer, type: (f.mime_type ?? "audio/mp4").split(";")[0] };
}

// TikTok's page carries the video's data, with its sound's own address when the sound is the
// clip's original audio (smaller than the video). Its servers want the page's cookies.
async function tiktok(u: URL) {
  // now and then it serves a page without the data; a second try usually has it
  const data = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/;
  let { html, cookies } = await page(u);
  if (!data.test(html)) ({ html, cookies } = await page(u));
  const m = data.exec(html);
  if (!m) throw new Error("no video data on the page");
  const item = JSON.parse(m[1])?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct;
  if (!item) throw new Error("video not found");
  const headers = { Referer: "https://www.tiktok.com/", Cookie: cookies };
  const tries = [item.music?.original ? item.music?.playUrl : null, item.video?.playAddr, item.video?.downloadAddr].filter((s): s is string => typeof s === "string" && s.length > 0);
  let last: unknown = new Error("no video address");
  for (const t of tries) {
    try {
      return await download(t, headers);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

// Instagram's embed page still names the video for logged-out viewers, sometimes.
async function instagram(u: URL) {
  const code = /^\/(?:[\w.]+\/)?(?:reels?|p|tv)\/([\w-]+)/.exec(u.pathname)?.[1];
  if (!code) throw new Error("no post code");
  for (const at of [`https://www.instagram.com/p/${code}/embed/captioned/`, `https://www.instagram.com/reel/${code}/`]) {
    const { html } = await page(new URL(at)).catch(() => ({ html: "" }));
    const found = field(html, "video_url");
    if (found) return download(unescape(found));
    const og = /<meta[^>]+property=["']og:video(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i.exec(html)?.[1];
    if (og) return download(og.replace(/&amp;/g, "&"));
  }
  throw new Error("no video on the page");
}

async function facebook(u: URL) {
  for (const agent of [UA, "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"]) {
    const { html } = await page(u, agent).catch(() => ({ html: "" }));
    const found = field(html, "browser_native_sd_url|playable_url|browser_native_hd_url|playable_url_quality_hd");
    if (found) return download(unescape(found));
    const og = /<meta[^>]+property=["']og:video(?::secure_url|:url)?["'][^>]*content=["']([^"']+)["']/i.exec(html)?.[1];
    if (og) return download(og.replace(/&amp;/g, "&"));
  }
  throw new Error("no video on the page");
}

export async function reelAudio(raw: string): Promise<ReelAudio> {
  const start = allowed(raw);
  if (!start) throw new Error("not a reel link");
  const u = await resolve(start);
  const site = siteOf(u);
  const got = site === "YouTube" ? await youtube(u) : site === "TikTok" ? await tiktok(u) : site === "Instagram" ? await instagram(u) : site === "Facebook" ? await facebook(u) : null;
  if (!got) throw new Error(`can't fetch videos from ${site}`);
  if (got.data.byteLength < 1000) throw new Error("empty video");
  return { ...got, site };
}
