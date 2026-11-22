import { iso, dow, sec as s2 } from './util.js';

export const LIBERO = '-';
export const PREDEFINITI = [
  { id: 'std', nome: 'Standard (antimeridiano)', sigla: 'S', intervalli: '07:45-14:57' },
  { id: 'tardo', nome: 'Mercoledì tardo', sigla: 'T', intervalli: '09:18-16:30' },
  { id: 'v1', nome: 'Venerdì 1° gruppo', sigla: 'V1', intervalli: '07:45-14:45;15:15-16:45' },
  { id: 'v2', nome: 'Venerdì 2° gruppo', sigla: 'V2', intervalli: '08:00-14:00;14:30-17:00' },
  { id: 'elez', nome: 'Elezioni (domenica)', sigla: 'E', intervalli: '08:00-12:30' }
];
const reValido = /^\d{2}:\d{2}-\d{2}:\d{2}(;\d{2}:\d{2}-\d{2}:\d{2})*$/;
export const valido = t => reValido.test(String(t).trim());

/** piano = { modelli:[{id,nome,sigla,intervalli}], settimana:{1..6:id}, eccezioni:{'aaaa-mm-gg':id} } (stesso JSON dell'app Android) */
export function carica(json) {
  const vuoto = { modelli: PREDEFINITI.map(x => ({ ...x })), settimana: {}, eccezioni: {} };
  if (!json || !String(json).trim()) return vuoto;
  try {
    const o = JSON.parse(json);
    const modelli = (o.m || []).map(t => ({ id: t.id, nome: t.n || '', sigla: t.s || '', intervalli: t.i || '' }));
    return { modelli: modelli.length ? modelli : vuoto.modelli, settimana: { ...(o.w || {}) }, eccezioni: { ...(o.e || {}) } };
  } catch (e) { return vuoto; }
}
export const serializza = p => JSON.stringify({
  m: p.modelli.map(t => ({ id: t.id, n: t.nome, s: t.sigla, i: t.intervalli })), w: p.settimana, e: p.eccezioni
});
/** Turno del giorno: prima l'eccezione per data, poi la settimana tipo. */
export function turnoDelGiorno(piano, d) {
  const id = piano.eccezioni[iso(d)] ?? piano.settimana[String(dow(d))];
  if (id === undefined || id === LIBERO) return null;
  return piano.modelli.find(m => m.id === id) || null;
}
export const intervalliTurno = t => t.intervalli.split(';').map(x => x.trim().split('-')).filter(p => p.length === 2).map(p => [p[0], p[1]]);
export const testo = t => intervalliTurno(t).map(i => `${i[0]}–${i[1]}`).join(' · ');
export const durata = t => intervalliTurno(t).reduce((a, [x, y]) => a + (s2(y + ':00') - s2(x + ':00')), 0);

const reDmy = /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/, reIso = /\d{4}-\d{2}-\d{2}/;
/** Importa righe "data;turno" (turno = id, sigla o nome; "libero" = nessun turno). */
export function importa(testoCsv, piano) {
  const ecc = { ...piano.eccezioni };
  let n = 0;
  for (const l of String(testoCsv).split(/\r?\n/)) {
    const m = reDmy.exec(l);
    let d, resto;
    if (m) { d = `${m[3]}-${String(+m[2]).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`; resto = l.replace(m[0], ''); }
    else { const i = reIso.exec(l); if (!i) continue; d = i[0]; resto = l.replace(i[0], ''); }
    const dt = new Date(d + 'T12:00:00'); if (isNaN(dt) || iso(dt) !== d) continue;
    const tok = resto.split(/[;,\t ]/).map(x => x.trim().toLowerCase()).filter(Boolean);
    let id;
    if (tok.some(x => ['libero', 'riposo', 'nessuno', '-'].includes(x))) id = LIBERO;
    else id = piano.modelli.find(mo => tok.some(x => x === mo.id.toLowerCase() || x === mo.sigla.toLowerCase()) || resto.toLowerCase().includes(mo.nome.toLowerCase()))?.id;
    if (id === undefined) continue;
    ecc[d] = id; n++;
  }
  return [{ ...piano, eccezioni: ecc }, n];
}
/** Intervalli previsti per il giorno: dal turno, altrimenti dalle impostazioni (con il rientro nei giorni scelti). */
export function intervalliGiorno(p, piano, d) {
  const t = turnoDelGiorno(piano, d);
  if (t) return intervalliTurno(t);
  const base = [[String(p.remIn).slice(0, 5), String(p.remOut).slice(0, 5)]];
  const rientro = String(p.giorniRientro || '').split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
  if (rientro.includes(dow(d))) base.push([String(p.rientroIn).slice(0, 5), String(p.rientroOut).slice(0, 5)]);
  return base;
}
