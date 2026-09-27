/* Lifespan — service worker : réseau d'abord (toujours la dernière version), cache en secours hors ligne. */
const CACHE = 'lifespan-v4';
const ASSETS = ['./', './index.html', './css/styles.css', './js/cloud-config.js', './js/i18n-en.js', './js/i18n.js', './js/cloud.js', './js/sources.js', './js/model.js', './js/engine.js', './js/charts.js', './js/avatar.js', './js/app.js', './manifest.webmanifest', './assets/icon.svg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (/googleapis\.com|firestore|identitytoolkit|securetoken/.test(req.url)) return;
  e.respondWith(fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok && (req.url.startsWith(self.location.origin) || req.url.includes('fonts.g'))) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./#quests');
  }));
});
