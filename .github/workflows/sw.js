/* Service worker di Agenda ATA: funziona anche senza rete.
   Per rilasciare una nuova versione cambia VERSIONE qui sotto. */
const VERSIONE = 'agenda-ata-web-1.5';
const FILE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(FILE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(chiavi => Promise.all(chiavi.filter(k => k !== VERSIONE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Pagina: prima la rete (così gli aggiornamenti arrivano), poi la copia salvata. Altri file: prima la copia salvata.
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  const pagina = r.mode === 'navigate' || r.url.endsWith('/index.html');
  if (pagina) {
    e.respondWith(fetch(r).then(res => { const copia = res.clone(); caches.open(VERSIONE).then(c => c.put('./index.html', copia)); return res; })
      .catch(() => caches.match('./index.html')));
  } else {
    e.respondWith(caches.match(r).then(c => c || fetch(r).then(res => { const copia = res.clone(); caches.open(VERSIONE).then(x => x.put(r, copia)); return res; })));
  }
});
