/* Vision service worker — cache the app shell for slow/offline visits.
   API JSON is cached by the app (localStorage); this SW keeps pages/assets loading. */
const SHELL = "vision-shell-v1";
const ASSETS = ["/", "/dashboard", "/login", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(ASSETS).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Never cache API or auth through the SW — the app handles that itself.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        if (fresh.ok && url.origin === self.location.origin) {
          const copy = fresh.clone();
          caches.open(SHELL).then((cache) => cache.put(req, copy)).catch(() => undefined);
        }
        return fresh;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const fallback = await caches.match("/dashboard");
          if (fallback) return fallback;
        }
        throw new Error("offline");
      }
    })(),
  );
});
