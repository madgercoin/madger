const CACHE = "madger-burrow-v1";
const CORE = ["/app", "/app.css", "/app.js", "/assets/madger_official_logo_transparent_192.png", "/assets/madger_v6_community_welcome_640.webp", "/assets/madger_official_contest_pose_card.svg"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(() => caches.match(event.request).then(response => response || (event.request.mode === "navigate" ? caches.match("/app") : Response.error()))));
});
