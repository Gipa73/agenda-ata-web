import { parseIso, mk, diffGiorni, uid } from './util.js';

/** Contratto: { id, inizio, fine (aaaa-mm-gg), profilo:'stesso'|'altro', statale, scuola, puntiMese, maxAnno, file, nomeFile, mime } */
export function carica(json) {
  try {
    return JSON.parse(json && String(json).trim() ? json : '[]').map(o => ({
      id: o.id, inizio: o.i || '', fine: o.f || '', profilo: o.p || 'stesso', statale: o.s !== false, scuola: o.n || '',
      puntiMese: o.m ?? 0.5, maxAnno: o.x ?? 6, file: o.file || '', nomeFile: o.nf || '', mime: o.mime || ''
    })).sort((a, b) => a.inizio.localeCompare(b.inizio));
  } catch (e) { return []; }
}
export const serializza = l => JSON.stringify(l.map(c => ({ id: c.id, i: c.inizio, f: c.fine, p: c.profilo, s: c.statale, n: c.scuola,
  m: c.puntiMese, x: c.maxAnno, file: c.file, nf: c.nomeFile, mime: c.mime })));

const reDmy = /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/g;
/** Righe tipo "15/09/2025;30/06/2026;stesso;statale;Nome scuola": due date e, se serve, "altro" / "non statale". */
export function importa(testo) {
  const out = []; let n = 0;
  for (const l of String(testo).split(/\r?\n/)) {
    const date = [...l.matchAll(reDmy)];
    if (date.length < 2) continue;
    const isoD = m => `${m[3]}-${String(+m[2]).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`;
    const i = isoD(date[0]), f = isoD(date[1]);
    if (isNaN(parseIso(i)) || isNaN(parseIso(f))) continue;
    const low = l.toLowerCase();
    const profilo = low.includes('altro') ? 'altro' : 'stesso';
    const statale = !(low.includes('non statale') || low.includes('nonstatale') || low.includes('paritaria'));
    const scuola = l.replace(date[0][0], '').replace(date[1][0], '').split(/[;\t]/).map(x => x.trim())
      .filter(x => x && !['stesso', 'altro', 'statale', 'non statale', 'nonstatale', 'paritaria'].includes(x.toLowerCase())).join(' ');
    const [ppm, max] = preset(profilo, statale);
    out.push({ id: 'i' + Date.now() + '_' + (n++), inizio: i, fine: f, profilo, statale, scuola, puntiMese: ppm, maxAnno: max, file: '', nomeFile: '', mime: '' });
  }
  return out;
}
/** Punti per mese e massimo per anno scolastico, in base al tipo di servizio (valori indicativi, modificabili). */
export function preset(profilo, statale) {
  if (profilo === 'stesso' && statale) return [0.5, 6];
  if (profilo === 'stesso') return [0.25, 3];
  return statale ? [0.15, 1.8] : [0.075, 0.9];
}
/** 30 giorni = 1 mese; la frazione superiore a 15 giorni vale un altro mese. */
export const mesiDaGiorni = g => Math.floor(g / 30) + (g % 30 > 15 ? 1 : 0);
const dt = s => { const d = parseIso(s || ''); return isNaN(d) ? null : d; };
/** Giorni di servizio del contratto fino alla data indicata (estremi compresi). */
export function giorni(c, finoA) {
  const i = dt(c.inizio), f = dt(c.fine); if (!i || !f) return 0;
  const fe = f > finoA ? finoA : f;
  return fe < i ? 0 : diffGiorni(i, fe) + 1;
}
export const formato = x => (Math.round(x * 100) / 100).toFixed(2).replace('.', ',');
/** Punteggio maturato alla data indicata: giorni per anno scolastico e tipo di servizio, mesi, punti con il massimo annuo. */
export function calcola(contratti, finoA) {
  const gg = {}, par = {};
  for (const c of contratti) {
    const i = dt(c.inizio), f = dt(c.fine); if (!i || !f) continue;
    const fe = f > finoA ? finoA : f; if (fe < i) continue;
    let anno = i.getMonth() + 1 >= 9 ? i.getFullYear() : i.getFullYear() - 1;
    for (;;) {
      const a0 = mk(anno, 9, 1), a1 = mk(anno + 1, 8, 31);
      if (a0 > fe) break;
      const da = i > a0 ? i : a0, a = fe < a1 ? fe : a1;
      if (a >= da) { const k = `${anno}|${c.profilo}|${c.statale}`; gg[k] = (gg[k] || 0) + diffGiorni(da, a) + 1; if (!par[k]) par[k] = [c.puntiMese, c.maxAnno]; }
      anno++;
    }
  }
  const perAnno = {};
  for (const [k, g] of Object.entries(gg)) {
    const anno = +k.split('|')[0], [ppm, max] = par[k], mesi = Math.min(12, mesiDaGiorni(g)), punti = Math.min(max, mesi * ppm);
    const p = perAnno[anno] || (perAnno[anno] = { giorni: 0, mesi: 0, punti: 0 });
    p.giorni += g; p.mesi += mesi; p.punti += punti;
  }
  const anni = Object.keys(perAnno).map(Number).sort().map(a => ({ anno: `${a}/${String((a + 1) % 100).padStart(2, '0')}`, ...perAnno[a] }));
  return { totale: anni.reduce((s, a) => s + a.punti, 0), anni };
}
