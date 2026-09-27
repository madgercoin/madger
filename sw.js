const CACHE = "madger-burrow-v3";
const APP_SHELL = [
  "/app", "/app.css", "/app.js", "/verified-contributions.json", "/game", "/game.css", "/game.js", "/game-core.js",
  "/reclaim", "/reclaim.css", "/reclaim-game.js", "/reclaim-core.js",
  "/assets/madger_official_logo_transparent_192.png",
  "/assets/madger_v6_community_welcome_640.webp",
  "/assets/madger_official_contest_pose_card.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === "navigate") return caches.match("/app");
      return Response.error();
    }
  })());
});
