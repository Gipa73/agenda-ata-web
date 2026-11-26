// Agenda ATA web: funziona anche senza rete. Per pubblicare una nuova versione cambia VERSIONE_CACHE (e VERSIONE in js/config.js).
const VERSIONE_CACHE = 'agenda-ata-web-2.8.0';
const FILE = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png',
  'js/app.js', 'js/config.js', 'js/util.js', 'js/model.js', 'js/festivi.js', 'js/calc.js', 'js/turni.js', 'js/contratti.js', 'js/evento.js', 'js/attestati.js',
  'js/appuntamenti.js', 'js/crypto.js', 'js/importer.js', 'js/store.js', 'js/ui.js', 'js/nav.js', 'js/flow.js', 'js/views-home.js', 'js/views-agenda.js',
  'js/views-ferie.js', 'js/views-report.js', 'js/views-profilo.js', 'js/views-extra.js', 'js/turnidoc.js', 'js/pdfjs.js', 'js/ocr.js', 'vendor/pdf.min.js', 'vendor/pdf.worker.min.js'];
// il riconoscimento del testo (vendor/tess, ~11 MB) si scarica la prima volta che serve e poi resta in cache
// i file si scaricano sempre freschi (niente cache HTTP vecchia di GitHub Pages); niente skipWaiting: l'utente sceglie quando aggiornare
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSIONE_CACHE).then(c => Promise.all(FILE.map(f => c.add(new Request(f, { cache: 'reload' })))))); });
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n.startsWith('agenda-ata-web-') && n !== VERSIONE_CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;   // le richieste esterne (statistiche, link) non passano dalla cache
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    if (res.ok) { const copia = res.clone(); caches.open(VERSIONE_CACHE).then(c => c.put(e.request, copia)); }
    return res;
  }).catch(() => e.request.mode === 'navigate' ? caches.match('index.html') : undefined)));
});
