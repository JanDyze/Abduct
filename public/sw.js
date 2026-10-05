// Abduct's service worker, after Kept's. It keeps the app's own files (logo, ship, icons, the
// offline page and the build's versioned scripts and styles) so the app opens quickly, and shows a
// "you're offline" page instead of the browser's error when there's no network. Pages themselves
// (your lists, picks, comments) are never stored: they always come fresh from the server.
// Bump VERSION when what's kept here changes; the old copies are cleared on the next visit.
const VERSION = "abduct-v5";
// A video shared to Abduct waits here until the share page has listened to it (app/share).
const SHARE_CACHE = "abduct-share";
const OFFLINE_URL = "/offline.html";
const LAUNCH_URL = "/launch.html";
const PRECACHE = [OFFLINE_URL, LAUNCH_URL, "/logo.svg", "/ship.svg", "/list-icons.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== SHARE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// From the cache when it's there, else the network (keeping a copy of what comes back).
function cacheFirst(request) {
  return caches.match(request).then(
    (hit) =>
      hit ||
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      }),
  );
}

// Something shared to Abduct from the phone's share sheet (the manifest's share_target). A video is
// kept on the phone, for the share page to listen to; the text and link go along in the address.
async function receiveShare(request) {
  const q = new URLSearchParams();
  try {
    const form = await request.formData();
    for (const k of ["title", "text", "url"]) {
      const v = form.get(k);
      if (typeof v === "string" && v) q.set(k, v.slice(0, 2000));
    }
    const media = form.get("media");
    if (media && typeof media !== "string" && media.size > 0) {
      const cache = await caches.open(SHARE_CACHE);
      await cache.put("/shared-media", new Response(media, { headers: { "Content-Type": media.type || "video/mp4" } }));
      q.set("media", "1");
    }
  } catch {}
  return Response.redirect(`/share${q.size ? `?${q}` : ""}`, 303);
}

// A launch is opening the app cold: no Abduct window open yet (from its icon, a bookmark, a typed
// address), or a load nothing on the web started (Sec-Fetch-Site: none). Sign-in links, the API and
// the launch screen's own request for the real page go straight to the network, and the same
// address is never answered with the launch screen twice in a few seconds, so it can't loop.
const launched = new Map();
async function isLaunch(request, url) {
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/") || url.pathname === LAUNCH_URL) return false;
  const last = launched.get(url.href);
  if (last && Date.now() - last < 5000) return false;
  const site = request.headers.get("Sec-Fetch-Site");
  if (site !== "none") {
    if (site === "cross-site") return false;
    const open = await self.clients.matchAll({ type: "window" });
    if (open.length > 0) return false;
  }
  launched.set(url.href, Date.now());
  if (launched.size > 20) launched.delete(launched.keys().next().value);
  return true;
}

// The launch screen from the cache, or the real page when it isn't there yet.
async function launchOrPage(request, url) {
  if (await isLaunch(request, url)) {
    const hit = await caches.match(LAUNCH_URL);
    if (hit) return hit;
  }
  return fetch(request).catch(() => caches.match(OFFLINE_URL));
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.method === "POST" && url.pathname === "/share/receive") {
    event.respondWith(receiveShare(request));
    return;
  }
  if (request.method !== "GET") return;

  // Opening the app (from its icon, or typing the address): the launch screen at once, from the
  // cache, which then asks for the real page; the browser keeps it animating until that arrives.
  // Otherwise page loads always come from the network; the offline page when there is none.
  if (request.mode === "navigate") {
    event.respondWith(launchOrPage(request, url));
    return;
  }

  // Build files have content-hashed names and never change; the brand files change only with a
  // new VERSION. Keep them once fetched.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || PRECACHE.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
