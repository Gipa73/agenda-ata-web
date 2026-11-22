// Utilità comuni: date (sempre a mezzogiorno locale per evitare problemi di ora legale), formati, testo.
export const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
export const GG = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
export const pad = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const mk = (y, m, d) => new Date(y, m - 1, d, 12);               // m = 1..12
export const addDays = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };
export const dow = d => (d.getDay() === 0 ? 7 : d.getDay());            // 1 = lunedì ... 7 = domenica
export const daysInMonth = (y, m) => new Date(y, m, 0).getDate();      // m = 1..12
export const oggi = () => { const n = new Date(); return mk(n.getFullYear(), n.getMonth() + 1, n.getDate()); };
export const stessoGiorno = (a, b) => iso(a) === iso(b);
export const diffGiorni = (a, b) => Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
export function plusMonths(d, n) {
  const t = d.getFullYear() * 12 + d.getMonth() + n, y = Math.floor(t / 12), m = t % 12;
  return mk(y, m + 1, Math.min(d.getDate(), daysInMonth(y, m + 1)));
}
export const plusYears = (d, n) => plusMonths(d, n * 12);
/** Come java.time.Period.between(a, b) per b >= a. */
export function periodBetween(a, b) {
  let mesi = (b.getFullYear() * 12 + b.getMonth()) - (a.getFullYear() * 12 + a.getMonth());
  let giorni = b.getDate() - a.getDate();
  if (mesi > 0 && giorni < 0) { mesi--; giorni = diffGiorni(plusMonths(a, mesi), b); }
  return { years: Math.floor(mesi / 12), months: mesi % 12, days: giorni };
}
export const fmtData = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
export function parseData(s) {                                          // gg/mm/aaaa, gg-mm-aaaa, gg.mm.aaaa
  const v = String(s || '').trim().split(/[\/\-.]/).map(Number);
  if (v.length < 3 || v.some(isNaN)) return null;
  const d = mk(v[2], v[1], v[0]);
  return d.getFullYear() === v[2] && d.getMonth() === v[1] - 1 && d.getDate() === v[0] ? d : null;
}
export const sec = s => { const p = String(s).split(':').map(Number); return p[0] * 3600 + p[1] * 60 + (p[2] || 0); };
export const orario = s => { const x = ((s % 86400) + 86400) % 86400; return `${pad(Math.floor(x / 3600))}:${pad(Math.floor(x % 3600 / 60))}:${pad(x % 60)}`; };
export const hms = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
export const hm = s => String(s || '').slice(0, 5);
export const nt = s => { const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(s || '').trim()); return m ? `${pad(+m[1])}:${m[2]}:${m[3] || '00'}` : ''; };
/** Tutti i valori orari dell'app sono in SECONDI. */
export function fmt(s) { const sg = s < 0 ? '−' : s > 0 ? '+' : ''; const a = Math.abs(s); return `${sg}${Math.floor(a / 3600)}h ${pad(Math.floor(a % 3600 / 60))}m ${pad(a % 60)}s`; }
export function fmtC(s) { const sg = s < 0 ? '−' : s > 0 ? '+' : ''; const a = Math.floor((Math.abs(s) + 30) / 60); return `${sg}${Math.floor(a / 60)}h${pad(a % 60)}m`; }
export const fh = s => `${Math.floor(s / 3600)}h ${pad(Math.floor(s % 3600 / 60))}m ${pad(s % 60)}s`;
export const num = x => (Math.abs(x - Math.round(x)) < 0.001 ? String(Math.round(x)) : x.toFixed(1).replace('.', ','));
export const giorniStr = x => String(Math.ceil(x - 0.5 - 0.0001));
export const dec = x => String(x).replace('.', ',');
export const parseNum = s => { const v = parseFloat(String(s ?? '').trim().replace(',', '.')); return isNaN(v) ? null : v; };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
export const round = x => Math.round(x);
