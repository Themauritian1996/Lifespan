/* Lifespan — service worker : fonctionne hors ligne après la première visite. */
const CACHE = 'lifespan-v3';
const ASSETS = ['./', './index.html', './css/styles.css', './js/cloud-config.js', './js/i18n-en.js', './js/i18n.js', './js/cloud.js', './js/sources.js', './js/model.js', './js/engine.js', './js/charts.js', './js/avatar.js', './js/app.js', './manifest.webmanifest', './assets/icon.svg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (/googleapis\.com|firestore|identitytoolkit|securetoken/.test(e.request.url)) return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok && (e.request.url.startsWith(self.location.origin) || e.request.url.includes('fonts.g'))) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) { c.navigate && c.url.indexOf('#quests') < 0 ? c.navigate('./#quests') : null; return c.focus(); } }
    return self.clients.openWindow('./#quests');
  }));
});
