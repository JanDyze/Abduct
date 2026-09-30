// Abduct's service worker, after Kept's. It keeps the app's own files (logo, ship, icons, the
// offline page and the build's versioned scripts and styles) so the app opens quickly, and shows a
// "you're offline" page instead of the browser's error when there's no network. Pages themselves
// (your lists, picks, comments) are never stored: they always come fresh from the server.
// Bump VERSION when what's kept here changes; the old copies are cleared on the next visit.
const VERSION = "abduct-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/logo.svg", "/ship.svg", "/list-icons.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

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
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
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

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Page loads: always the network; the offline page when there is none.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Build files have content-hashed names and never change; the brand files change only with a
  // new VERSION. Keep them once fetched.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || PRECACHE.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
