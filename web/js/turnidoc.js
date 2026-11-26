// Turni dal documento della scuola ("TURNI COLLABORATORI SCOLASTICI – MESE ANNO"): il testo (letto dal PDF o ottenuto con l'OCR
// da una scansione) viene trasformato in turni per data. Stesso algoritmo dell'app Android.
import { mk, addDays, iso, dow, pad, fmtData } from './util.js';

const MESI = { gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6, luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12 };
export const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9/:,.]+/g, ' ').replace(/\s+/g, ' ').trim();
const PER = /^(?:a partire da|da) luned\w* (\d{1,2}) ([a-z]+) e fino (?:al|a) (?:venerd\w* )?(\d{1,2})\/(\d{1,2})\/(\d{4})/;
const GIORNO = [['mercoled', /^mercoled\w* (\d{1,2})\/(\d{1,2})\/(\d{2,4})/], ['venerd', /^venerd\w* (\d{1,2})\/(\d{1,2})\/(\d{2,4})/], ['domenic', /^domenic\w* (\d{1,2})\/(\d{1,2})\/(\d{2,4})/]];
const STOP = /^(luned|marted|mercoled|gioved|venerd|sabato|domenic|a partire da|da luned|n b |collaboratori scolastici piano)/;
const anno = a => (a < 100 ? a + 2000 : a);
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * righe: righe di testo del documento. cognome: come scritto nel documento. festivo(Date) -> bool (giorni senza servizio).
 * Restituisce { eccezioni: {'aaaa-mm-gg': 'std'|'tardo'|'v1'|'v2'|'elez'}, avvisi: [] }.
 */
export function parse(righe, cognome, festivo = () => false) {
  const L = righe.filter(x => !/registro ufficiale/i.test(x) && !String(x).startsWith('---')).map(norm).filter(Boolean);
  const cog = norm(cognome), avvisi = [];
  const parole = cog.split(' ').filter(w => w.length > 2);
  const haNome = b => !!cog && (new RegExp('(^| )' + escRe(cog) + '( |$)').test(b)
    || (parole.length > 0 && parole.every(w => new RegExp('(^| )' + escRe(w) + '( |$)').test(b))));    // cognomi a più parole spezzati dall'OCR
  const periodi = [], blocchi = [];
  for (let i = 0; i < L.length; i++) {
    let m = PER.exec(L[i]);
    if (m) {
      const fine = mk(+m[5], +m[4], +m[3]), mese = MESI[m[2]];
      let inizio = addDays(fine, -4);
      if (mese) { const a = mese <= fine.getMonth() + 1 ? fine.getFullYear() : fine.getFullYear() - 1, d = mk(a, mese, +m[1]); if (d.getMonth() + 1 === mese) inizio = d; }
      periodi.push([inizio, fine]); continue;
    }
    for (const [tipo, rx] of GIORNO) {
      m = rx.exec(L[i]);
      if (!m) continue;
      const d = mk(anno(+m[3]), +m[2], +m[1]), blocco = [L[i]];
      let j = i + 1;
      while (j < L.length && !STOP.test(L[j])) blocco.push(L[j++]);
      blocchi.push({ tipo, d, testo: blocco.join(' '), testa: blocco.slice(0, 2).join(' ') });
      i = j - 1; break;
    }
  }
  if (!periodi.length) return { eccezioni: {}, avvisi: ['Non ho trovato i periodi “A partire da lunedì … e fino al …” nel documento.'] };
  const exc = {};
  const inPeriodo = d => periodi.some(([a, b]) => d >= a && d <= b);
  for (const [ini, fin] of periodi) for (let d = ini; d <= fin; d = addDays(d, 1)) if (dow(d) <= 4 && !festivo(d)) exc[iso(d)] = 'std';
  const venerdi = {};
  for (const b of blocchi) {
    if (b.tipo === 'mercoled') { if (inPeriodo(b.d)) exc[iso(b.d)] = haNome(b.testo) ? 'tardo' : 'std'; }
    else if (b.tipo === 'domenic') { if (haNome(b.testo)) exc[iso(b.d)] = 'elez'; }
    else (venerdi[iso(b.d)] = venerdi[iso(b.d)] || []).push(b);
  }
  for (const [ini, fin] of periodi) for (let d = ini; d <= fin; d = addDays(d, 1)) {
    if (dow(d) !== 5 || festivo(d)) continue;
    const et = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, bl = venerdi[iso(d)];
    if (!bl) { avvisi.push(`${et}: non trovo i gruppi del venerdì`); continue; }
    const trov = bl.filter(b => haNome(b.testo)).map(b => (/(^| )2 gruppo/.test(b.testa) ? 2 : 1));
    if (!trov.length) { avvisi.push(`${et}: non trovo il cognome “${cognome}” nei gruppi del venerdì`); continue; }
    exc[iso(d)] = trov[0] === 1 ? 'v1' : 'v2';
    if (new Set(trov).size > 1) avvisi.push(`${et}: il cognome compare in entrambi i gruppi, ho scelto il ${trov[0]}°`);
  }
  const ord = {}; Object.keys(exc).sort().forEach(k => { ord[k] = exc[k]; });
  return { eccezioni: ord, avvisi };
}
/** Righe "gg/mm/aaaa;turno", importabili anche a mano (Turni → Importa). */
export const csv = exc => 'Data;Turno\r\n' + Object.keys(exc).sort().map(k => { const [y, m, d] = k.split('-'); return `${d}/${m}/${y};${exc[k]}`; }).join('\r\n');
