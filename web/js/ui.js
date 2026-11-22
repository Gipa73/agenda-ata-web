import { esc } from './util.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const h = esc;
export const ACT = {};
export const on = (nome, fn) => { ACT[nome] = fn; };
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el) return;
  const f = ACT[el.dataset.a];
  if (f) f(el, e);
});

export const IC = {
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  cal: 'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V9h14v11z',
  sun: 'M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
  cog: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'
};
export const svg = (d, s = 24) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;

export const TEMI = { viola: ['#7c5cff', '#ff7ab8'], blu: ['#2f7be0', '#38bdf8'], verde: ['#16a870', '#a3e635'], arancio: ['#f28c28', '#f5c542'], rosa: ['#e0457b', '#ff9ac1'] };
export function applicaTema(p) {
  const r = document.documentElement, t = TEMI[p.tema] || TEMI.viola;
  r.style.setProperty('--pr', t[0]); r.style.setProperty('--gr', `linear-gradient(135deg,${t[0]},${t[1]})`); r.style.setProperty('--acc2', t[1]);
  if (p.modoScuro === 'scuro') r.dataset.theme = 'dark'; else if (p.modoScuro === 'chiaro') r.dataset.theme = 'light'; else delete r.dataset.theme;
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t[0];
}

// ---------------- finestre
let z = 20;
export function modal(contenuto, { centro = false, chiudiFuori = true } = {}) {
  const ov = document.createElement('div');
  ov.className = 'modal' + (centro ? ' centro' : '');
  ov.style.zIndex = ++z;
  ov.innerHTML = `<div class="sheet">${contenuto}</div>`;
  document.body.appendChild(ov);
  const close = () => { ov.remove(); };
  if (chiudiFuori) ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  return { el: ov, close, $: s => ov.querySelector(s), $$: s => [...ov.querySelectorAll(s)] };
}
export function dialogo({ titolo = '', corpo = '', bottoni = [{ t: 'OK', v: true }] }) {
  return new Promise(ok => {
    const m = modal(`<h2>${titolo}</h2><div class="dlg-corpo">${corpo}</div><div class="dlg-bt">${bottoni.map((b, i) =>
      `<button class="${b.cls || ''}" data-i="${i}">${b.t}</button>`).join('')}</div>`, { centro: true, chiudiFuori: false });
    m.$$('.dlg-bt button').forEach(b => b.onclick = () => { const x = bottoni[+b.dataset.i]; const v = typeof x.v === 'function' ? x.v(m) : x.v; m.close(); ok(v); });
  });
}
export const conferma = (titolo, testo, si = 'OK', no = 'Annulla') =>
  dialogo({ titolo, corpo: `<p>${testo}</p>`, bottoni: [{ t: si, v: true }, { t: no, v: false, cls: 'sec' }] });
export const chiediPassword = (titolo, testo, si = 'Continua') =>
  dialogo({ titolo, corpo: `<p class="mu">${testo}</p><input type="password" id="dpw" autocomplete="off" autocapitalize="off" autocorrect="off">`,
    bottoni: [{ t: si, v: m => m.$('#dpw').value }, { t: 'Annulla', v: null, cls: 'sec' }] });
export function toast(msg, ms = 2600) {
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; t.style.zIndex = 9999;
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}
export function scarica(nome, contenuto, mime) {
  const blob = contenuto instanceof Blob ? contenuto : new Blob([contenuto], { type: mime });
  const file = new File([blob], nome, { type: mime });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: nome }).catch(() => { }); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
export const apri = url => { window.open(url, '_blank', 'noopener'); };
export const val = (id, r = document) => { const e = r.querySelector('#' + id); return e ? e.value : ''; };
export const chk = (id, r = document) => { const e = r.querySelector('#' + id); return !!(e && e.checked); };
export const opts = (lista, sel) => lista.map(([v, t]) => `<option value="${h(String(v))}"${String(v) === String(sel) ? ' selected' : ''}>${h(t)}</option>`).join('');
export const barra = (a, b) => `<div class="bar"><i style="width:${Math.min(100, a / Math.max(b, 1) * 100)}%"></i></div>`;
