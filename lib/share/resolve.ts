import "server-only";

// What a shared link says about itself: the reel's caption and who posted it. Only links to the
// video apps people share from are fetched, over https, and each redirect is checked the same way,
// so a shared link can't point the server anywhere else. Best effort: some sites hide captions
// from anyone not signed in, and then the share's own text is all there is.
const HOSTS = ["tiktok.com", "facebook.com", "fb.watch", "fb.com", "instagram.com", "youtube.com", "youtu.be", "x.com", "twitter.com", "threads.net"];
const TIMEOUT = 6000;
const MAX_HTML = 400_000;

export type Shared = { caption: string | null; author: string | null; site: string | null };

export function allowed(raw: string) {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    return u.protocol === "https:" && HOSTS.some((h) => host === h || host.endsWith(`.${h}`)) ? u : null;
  } catch {
    return null;
  }
}

export const siteOf = (u: URL) => {
  const h = u.hostname.replace(/^(www|m|vm|vt|web)\./, "");
  if (h.includes("tiktok")) return "TikTok";
  if (h.includes("facebook") || h.includes("fb.")) return "Facebook";
  if (h.includes("instagram")) return "Instagram";
  if (h.includes("youtu")) return "YouTube";
  if (h.includes("threads")) return "Threads";
  return "X";
};

// Follows short links (vm.tiktok.com, fb.watch) one hop at a time, only to allowed hosts.
export async function resolve(u: URL): Promise<URL> {
  let current = u;
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(current, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(TIMEOUT), headers: { "User-Agent": "Mozilla/5.0" } }).catch(() => null);
    const next = res && res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!next) return current;
    const target = allowed(new URL(next, current).toString());
    if (!target) return current;
    current = target;
  }
  return current;
}

async function oembed(endpoint: string): Promise<Shared | null> {
  const res = await fetch(endpoint, { signal: AbortSignal.timeout(TIMEOUT), next: { revalidate: 3600 } }).catch(() => null);
  if (!res?.ok) return null;
  const j = (await res.json().catch(() => null)) as { title?: string; author_name?: string } | null;
  return j?.title ? { caption: j.title, author: j.author_name ?? null, site: null } : null;
}

const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

// The page's own preview (og:description / og:title), as its link preview would show it.
async function preview(u: URL): Promise<Shared | null> {
  const res = await fetch(u, {
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT),
    // sites give their link-preview tags to preview crawlers
    headers: { "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)", Accept: "text/html" },
  }).catch(() => null);
  if (!res?.ok) return null;
  const html = (await res.text()).slice(0, MAX_HTML);
  const meta = (prop: string) => new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i").exec(html)?.[1] ?? new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, "i").exec(html)?.[1];
  const caption = [meta("og:description"), meta("og:title"), /<title>([^<]*)<\/title>/i.exec(html)?.[1]].map((s) => (s ? decode(s).trim() : "")).filter(Boolean).join("\n");
  return caption ? { caption, author: null, site: null } : null;
}

export async function sharedLink(raw: string): Promise<Shared | null> {
  const start = allowed(raw);
  if (!start) return null;
  try {
    const u = await resolve(start);
    const site = siteOf(u);
    const got =
      site === "TikTok"
        ? await oembed(`https://www.tiktok.com/oembed?url=${encodeURIComponent(u.toString())}`)
        : site === "YouTube"
          ? await oembed(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u.toString())}`)
          : null;
    const found = got ?? (await preview(u));
    return { caption: found?.caption ?? null, author: found?.author ?? null, site };
  } catch (e) {
    console.error("Reading a shared link failed:", e);
    return null;
  }
}
