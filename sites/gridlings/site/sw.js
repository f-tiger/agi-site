/* Gridlings service worker — offline-capable daily puzzles.
   HTML: network-first (never serve a stale page when online).
   Static assets + puzzle JSON: stale-while-revalidate (dailies are pre-baked,
   so yesterday's cache still contains today's board).
   Bump VERSION on breaking asset changes. */
const VERSION = "gl-v1";
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname === "/e" || url.pathname === "/sub") return;
  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isHTML) {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const c = await caches.open(VERSION);
        c.put(req, net.clone());
        return net;
      } catch (err) {
        const hit = await caches.match(req);
        return hit || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(req);
    const refresh = fetch(req).then((net) => { c.put(req, net.clone()); return net; }).catch(() => null);
    return hit || (await refresh) || Response.error();
  })());
});
