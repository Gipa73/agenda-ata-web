import { dow, iso, parseIso, sec, mk, daysInMonth, periodBetween, plusMonths, parseData, fmt, fh, orario, oggi as oggiD, addDays } from './util.js';
import { nome as nomeFesta } from './festivi.js';
import { intervalli, LAVORO, ORE_SERVIZIO } from './model.js';
import { intervalliGiorno } from './turni.js';

export { fmt, fh, orario, parseData };
export const giorniSet = p => {
  const s = new Set(String(p.giorniLav || '').split(',').map(x => parseInt(x.trim())).filter(x => x >= 1 && x <= 6));
  return s.size ? s : new Set([1, 2, 3, 4, 5]);
};
const fl = v => { const x = parseFloat(String(v).trim().replace(',', '.')); return isNaN(x) ? null : x; };

/** Secondi attesi nel giorno: 0 la domenica, nelle festività nazionali (e il sabato in settimana corta). */
export function attesi(p, d) {
  if (dow(d) === 7 || nomeFesta(d)) return 0;
  const w = dow(d);
  if (p.tipoOrario === 'pers') return Math.round((fl(String(p.oreGiorno || '').split(',')[w - 1] ?? '') ?? 0) * 3600);
  if (p.tipoOrario === 'vert') { const gs = giorniSet(p); return gs.has(w) ? Math.round(p.ore * 3600 / gs.size) : 0; }
  if (p.giorni === 5 && w === 6) return 0;
  return Math.round(p.ore * 3600 / p.giorni);
}
export const lavorati = g => intervalli(g).reduce((a, [x, y]) => a + (x && y ? Math.max(0, sec(y) - sec(x)) : 0), 0);

/** Saldo giornaliero in secondi (null = nessun dato). Dipende dalla causale: lavoro, permessi a ore, assenze. */
export function saldo(p, d, g) {
  if (!g) return null;
  const t = g.tipo, ore = Math.round((g.ore104 || 0) * 3600), ints = intervalli(g);
  if (LAVORO.has(t)) return (ints.length === 0 && ore <= 0) ? null : lavorati(g) + ore - attesi(p, d);
  if (t === 'ASSEMBLEA' && g.figlio === 'FUORI') return ints.length === 0 ? 0 : lavorati(g) - attesi(p, d);
  if (t === 'PBREVE') return ints.length === 0 ? null : lavorati(g) - attesi(p, d);
  if (t === 'P104H') return ints.length === 0 ? null : lavorati(g) + ore - attesi(p, d);
  if (ORE_SERVIZIO.has(t)) return (ints.length === 0 && ore <= 0) ? 0 : lavorati(g) + ore - attesi(p, d);
  if (t === 'RECUPERO') return -attesi(p, d);
  return 0;
}
/** escludiOggi = true: il saldo resta quello di ieri finché la giornata di oggi non è conclusa. */
export function saldoMese(p, m, y, mese, escludiOggi = false) {
  let s = 0; const o = iso(oggiD());
  for (let i = 1; i <= daysInMonth(y, mese); i++) {
    const d = mk(y, mese, i);
    if (escludiOggi && iso(d) === o) continue;
    s += saldo(p, d, m[iso(d)]) ?? 0;
  }
  return s;
}
export function saldoTotale(p, m, escludiOggi = false) {
  let s = 0; const o = iso(oggiD());
  for (const g of Object.values(m)) { if (escludiOggi && g.data === o) continue; s += saldo(p, parseIso(g.data), g) ?? 0; }
  return s;
}
export const bancaOre = (p, m, escludiOggi = false) => saldoTotale(p, m, escludiOggi) + Math.round((p.oreResidue || 0) * 3600);
/** Oggi la giornata è iniziata ma non conclusa: ingresso senza uscita, oppure rientro previsto non ancora timbrato. */
export function giornataInCorso(p, m, oggi, piano) {
  const g = m[iso(oggi)];
  if (!g || !LAVORO.has(g.tipo)) return false;
  const ints = intervalli(g);
  if (!ints.length) return false;
  if (!ints[ints.length - 1][1]) return true;
  return attesi(p, oggi) > 0 && ints.length < intervalliGiorno(p, piano, oggi).length;
}

// ---------------- contratto a termine, ferie, festività soppresse
export const inizioContratto = p => p.determinato ? parseData(p.inizioContratto) : null;
export function fineContratto(p) {
  const i = inizioContratto(p); if (!i) return null;
  if (p.scadenzaContratto === '31ago') return mk(i.getMonth() + 1 > 8 ? i.getFullYear() + 1 : i.getFullYear(), 8, 31);
  if (p.scadenzaContratto === 'altra') return parseData(p.fineContratto);
  return mk(i.getMonth() + 1 > 6 ? i.getFullYear() + 1 : i.getFullYear(), 6, 30);
}
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
/** Mesi di servizio: le frazioni superiori a 15 giorni contano come mese intero (art. 13 CCNL). */
export function mesiServizio(p) {
  const i = inizioContratto(p), f = fineContratto(p);
  if (!i || !f || f < i) return clamp(p.mesiAnno | 0 || 12, 1, 12);
  const per = periodBetween(i, addDays(f, 1));
  let mesi = per.years * 12 + per.months;
  if (per.days > 15) mesi++;
  return clamp(mesi, 1, 12);
}
export function finestraFerie(p, anno) {
  const i = inizioContratto(p), f = fineContratto(p);
  return (i && f) ? [iso(i), iso(f)] : [`${anno}-01-01`, `${anno}-12-31`];
}
export function contaFerie(p, m, anno) {
  const w = finestraFerie(p, anno);
  return Object.values(m).filter(g => g.tipo === 'FERIE' && g.data >= w[0] && g.data <= w[1]).length;
}
/** Quota di giorni spettanti: pieno e orizzontale = 1; verticale/personalizzato = giorni lavorati su 6. */
function quota(p) {
  if (p.tipoOrario === 'vert') return giorniSet(p).size / 6;
  if (p.tipoOrario === 'pers') return clamp(String(p.oreGiorno || '').split(',').filter(x => (fl(x) ?? 0) > 0).length, 1, 6) / 6;
  return 1;
}
/** Ferie: 32 giorni dopo 3 anni di servizio, 30 nei primi 3; dodicesimi nell'anno di assunzione/cessazione. */
export function ferieSpettanti(p) {
  if (p.ferieManuali >= 0) return p.ferieManuali;
  const base = p.menoDi3Anni ? 30 : 32;
  return Math.round(base * quota(p) * mesiServizio(p) / 12);
}
export const festSoppresse = p => Math.round((p.festSoppresse ?? 4) * quota(p));
/** Con la settimana articolata su 5 giorni il sesto giorno è lavorativo: ogni giorno di ferie vale 1,2. */
export const fattoreFerie = p => ((p.tipoOrario === 'pieno' || p.tipoOrario === 'orizz') && p.giorni === 5) ? 1.2 : 1;
export const abilitato = (p, t) => t === 'FAM' ? p.fam : (t === 'P104' || t === 'P104H') ? p.f104 : t === 'CONG' ? p.cong : true;
export const contaFestSoppresse = (m, anno) => Object.values(m).filter(g => g.tipo === 'FEST' && g.data.startsWith(anno + '-') && !nomeFesta(parseIso(g.data))).length;
export function conta(m, t, anno, mese = null) {
  const pre = mese == null ? `${anno}-` : `${anno}-${String(mese).padStart(2, '0')}-`;
  return Object.values(m).filter(g => g.tipo === t && g.data.startsWith(pre)).length;
}
export const contaTotale = (m, t) => Object.values(m).filter(g => g.tipo === t).length;

/** Congedi e permessi familiari tracciati: [tipo, limite in giorni (0 = nessuno), conta nell'anno scolastico]. */
export const CONGEDI_FAMILIARI = [['MATERNITA', 0, false], ['PATERNITA', 10, false], ['MALFIGLIO', 0, true], ['ADOZIONE', 0, false],
  ['LUTTO', 0, true], ['MATRIMONIO', 15, false], ['CONCORSI', 8, true], ['VIOLENZA', 120, false], ['BIENNALE', 730, false],
  ['ASPETTATIVA', 0, false], ['DONAZIONE', 0, false]];
export const inizioAnnoScolastico = o => mk(o.getMonth() + 1 >= 9 ? o.getFullYear() : o.getFullYear() - 1, 9, 1);
/** Ore registrate con una causale a ore (assemblee, permessi brevi...) nell'anno scolastico in corso. */
export function oreAnnoScolastico(m, t, o = oggiD()) {
  const da = inizioAnnoScolastico(o), a = iso(mk(da.getFullYear() + 1, 9, 1));
  return Object.values(m).filter(g => g.tipo === t && g.data >= iso(da) && g.data < a).reduce((s, g) => s + (g.ore104 || 0), 0);
}
/** Permessi brevi (art. 54 CCNL): da recuperare di norma entro 2 mesi; i crediti successivi li coprono in ordine di data. */
export function permessiBrevi(p, m) {
  const debiti = [], tutti = [];
  for (const g of Object.values(m).sort((a, b) => a.data.localeCompare(b.data))) {
    const d = parseIso(g.data);
    if (g.tipo === 'PBREVE' && g.ore104 > 0) {
      const x = { data: d, dovuto: Math.round(g.ore104 * 3600), recuperato: 0, scadenza: plusMonths(d, 2) };
      debiti.push(x); tutti.push(x);
    } else {
      let credito = Math.max(0, saldo(p, d, g) ?? 0);
      while (credito > 0 && debiti.length) {
        const x = debiti[0], uso = Math.min(x.dovuto - x.recuperato, credito);
        x.recuperato += uso; credito -= uso;
        if (x.recuperato >= x.dovuto) debiti.shift();
      }
    }
  }
  return tutti;
}
export function scadenzaResidue(p, anno) {
  const v = String(p.scadResidue || '30/04').split('/').map(Number);
  return (v.length >= 2 && v[0] && v[1]) ? mk(anno, v[1], v[0]) : mk(anno, 4, 30);
}
export const residueRimaste = p => Number(p.residue) || 0;   // nessun calcolo: restano come inserite in Profilo
/** Crediti orari ancora da recuperare, per data di maturazione (i debiti consumano prima i crediti più vecchi). */
export function creditiResidui(p, m) {
  const coda = [];
  for (const g of Object.values(m).sort((a, b) => a.data.localeCompare(b.data))) {
    const d = parseIso(g.data), s = saldo(p, d, g);
    if (s == null) continue;
    if (s > 0) coda.push([d, s]);
    else {
      let debito = -s;
      while (debito > 0 && coda.length) {
        const [dd, c] = coda.shift();
        if (c > debito) { coda.unshift([dd, c - debito]); debito = 0; } else debito -= c;
      }
    }
  }
  return coda;
}
export function ore104Mese(m, anno, mese) {
  const pre = `${anno}-${String(mese).padStart(2, '0')}-`;
  return Object.values(m).filter(g => g.tipo === 'P104H' && g.data.startsWith(pre)).reduce((s, g) => s + (g.ore104 || 0), 0);
}

/** Controlli di coerenza sulle timbrature del mese. */
export function anomalie(p, m, y, mese) {
  const out = [], oggi = oggiD(), primoK = Object.keys(m).sort()[0], primo = primoK ? parseIso(primoK) : null;
  const s = x => x ? sec(x) : 0;
  for (let i = 1; i <= daysInMonth(y, mese); i++) {
    const d = mk(y, mese, i);
    if (d > oggi) break;
    const et = `${String(i).padStart(2, '0')}/${String(mese).padStart(2, '0')}`, g = m[iso(d)];
    if (!g) { if (attesi(p, d) > 0 && primo && d >= primo && iso(d) !== iso(oggi)) out.push(`${et}: nessuna timbratura né assenza`); continue; }
    if (!(LAVORO.has(g.tipo) || ORE_SERVIZIO.has(g.tipo) || g.tipo === 'PBREVE')) continue;
    const ints = intervalli(g);
    if (g.tipo === 'PRESENZA' && ints.length === 0) out.push(`${et}: presenza senza orari`);
    if (ints.some(x => !x[1]) && iso(d) !== iso(oggi)) out.push(`${et}: uscita mancante`);
    if (ints.some(x => x[1] && s(x[1]) <= s(x[0]))) out.push(`${et}: uscita precedente all’entrata`);
    if (lavorati(g) > 12 * 3600) out.push(`${et}: oltre 12 ore lavorate, controlla`);
    for (let k = 1; k < ints.length; k++) if (ints[k - 1][1] && s(ints[k][0]) < s(ints[k - 1][1])) { out.push(`${et}: intervalli sovrapposti`); break; }
  }
  return out;
}
