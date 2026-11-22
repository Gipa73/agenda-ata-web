import { carica, S, chiediPersistenza } from './store.js';
import { N } from './nav.js';
import { $, IC, svg, applicaTema, toast, on, modal } from './ui.js';
import { home, tickHome } from './views-home.js';
import { agenda } from './views-agenda.js';
import { ferie } from './views-ferie.js';
import { report } from './views-report.js';
import { profilo, importa, info } from './views-profilo.js';
import { turni, appuntamenti, attestati, contratti } from './views-extra.js';
import { flusso, schermataConsenso, schermataBenvenuto, schermataGuida, controllaInvito, pingStatistiche, bannerInstall, FL } from './flow.js';

const VISTE = { home, agenda, ferie, report, profilo: () => profilo(false), import: importa, info, turni, appuntamenti, attestati, contratti };
const NAV = [['home', 'Home', IC.home], ['agenda', 'Agenda', IC.cal], ['ferie', 'Ferie', IC.sun], ['report', 'Report', IC.doc], ['profilo', 'Profilo', IC.cog]];
const PRINCIPALI = new Set(NAV.map(x => x[0]));

function render() {
  applicaTema(S.p);
  const fl = flusso(), main = $('#app'), nav = $('#nav');
  document.body.classList.toggle('nonav', !!fl);
  nav.style.display = fl ? 'none' : '';
  if (fl) {
    main.innerHTML = fl === 'consenso' ? schermataConsenso() : fl === 'benvenuto' ? schermataBenvenuto(false) : fl === 'novita' ? schermataBenvenuto(true)
      : fl === 'onboarding' ? profilo(true) : schermataGuida();
    window.scrollTo(0, 0); return;
  }
  const v = VISTE[N.view] ? N.view : 'home';
  main.innerHTML = (v === 'home' ? bannerInstall() : '') + VISTE[v]();
  nav.innerHTML = NAV.map(([k, t, ic]) => `<button class="${(PRINCIPALI.has(N.view) ? N.view : 'profilo') === k ? 'on' : ''}" data-a="vai" data-v="${k}">${svg(ic)}${t}</button>`).join('');
  setTimeout(controllaInvito, 600);
}
N.render = render;

// ---------------- aggiornamenti dell'app (service worker)
let reg = null, attesa = null;
function mostraAggiornamento(sw) {
  attesa = sw;
  if (document.getElementById('upd')) return;
  const b = document.createElement('div'); b.id = 'upd'; b.className = 'banner'; b.style.cssText = 'position:fixed;left:12px;right:12px;top:calc(10px + env(safe-area-inset-top,0px));z-index:9000;box-shadow:0 6px 20px #0004';
  b.innerHTML = '<div style="flex:1"><b>🚀 Nuova versione disponibile</b><div class="sm">Aggiorna per avere le ultime novità: i tuoi dati restano al loro posto.</div></div><button class="pic" data-a="aggiornaOra">Aggiorna</button>';
  document.body.appendChild(b);
}
on('aggiornaOra', () => { if (attesa) attesa.postMessage('SKIP_WAITING'); else location.reload(); });
on('aggiorna', async () => {
  if (!reg) { toast('Aggiornamenti non disponibili in questo browser'); return; }
  try { await reg.update(); } catch (e) { }
  setTimeout(() => { if (!attesa) toast('Hai già la versione più recente ✓'); }, 1500);
});
function registraSW() {
  if (!('serviceWorker' in navigator)) return;
  const avevaController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(r => {
    reg = r;
    if (r.waiting && navigator.serviceWorker.controller) mostraAggiornamento(r.waiting);
    r.addEventListener('updatefound', () => {
      const n = r.installing;
      n && n.addEventListener('statechange', () => { if (n.state === 'installed' && navigator.serviceWorker.controller) mostraAggiornamento(n); });
    });
  }).catch(() => { });
  let ricaricato = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!avevaController || ricaricato) return; ricaricato = true; location.reload(); });
}

carica();
chiediPersistenza();
render();
registraSW();
pingStatistiche();
if (S.migrato) toast('Ho ripreso i dati della versione web precedente');
setInterval(() => { if (!flusso() && N.view === 'home') tickHome(); }, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && !flusso() && ['home', 'agenda', 'report'].includes(N.view) && !document.querySelector('.modal')) render(); });
