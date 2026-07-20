// Service worker mínimo do Fine — instalável + fallback offline básico.
// Estratégia network-first: sempre tenta a rede (para pegar deploy novo)
// e cai no cache só quando está offline. Não intercepta APIs nem outros hosts.
const CACHE = "fine-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;      // Firebase/Google/Anthropic passam direto
  if (url.pathname.startsWith("/api/")) return;    // não cacheia endpoints

  e.respondWith((async () => {
    try {
      const net = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, net.clone());
      return net;
    } catch {
      const cached = await caches.match(req);
      return cached || caches.match("/index.html");
    }
  })());
});
