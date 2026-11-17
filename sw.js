// Godziny CH – działanie bez internetu (cache plików aplikacji). Dane użytkownika są w localStorage, nie tutaj.
const WERSJA = 'gch-v1';
const PLIKI = ['./', 'index.html', 'silnik.js', 'app.js', 'manifest.webmanifest', 'ikona-180.png', 'ikona-192.png', 'ikona-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(WERSJA).then(c => c.addAll(PLIKI)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== WERSJA).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
// Najpierw sieć (nowa wersja), przy braku internetu – kopia z cache.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const k = r.clone(); caches.open(WERSJA).then(c => c.put(e.request, k)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
