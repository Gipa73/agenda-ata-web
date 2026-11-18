import { TIPI, tipoValido, LAVORO, ORE_SERVIZIO, serializza, intervalli } from './model.js';
import { pad, sec, parseIso, fh, mk } from './util.js';
import { nome as festa } from './festivi.js';
import { lavorati } from './calc.js';
import { cifrato, decifra } from './crypto.js';

export const LIMITE_FILE = 25_000_000, LIMITE_PAGINE_PDF = 60;
const reDmy = /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/, reIso = /\d{4}-\d{2}-\d{2}/, reOra = /\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\b/g;
const validaData = d => { const x = parseIso(d); return !isNaN(x) && `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}` === d; };
const ora = s => { const p = s.split(':'); return `${pad(+p[0])}:${p[1]}:${p[2] || '00'}`; };
const tipoDa = s => Object.keys(TIPI).find(k => k.toLowerCase() === String(s || '').toLowerCase()) || 'PRESENZA';
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const riconosce = (testo, etichetta) => { const l = etichetta.toLowerCase().split(' (')[0]; return l.length <= 4 ? new RegExp('\\b' + escRe(l) + '\\b').test(testo) : testo.includes(l); };
const G = (data, tipo, timbrature = '', ore104 = 0, nota = '', figlio = '') => ({ data, tipo, timbrature, ore104, nota, figlio });

/** Legge vecchie timbrature da CSV/TXT (una o più righe per giorno) o da backup JSON. */
export function parse(testo) {
  const t = String(testo).replace(/^\uFEFF/, '').trim();
  if (t.startsWith('[') || t.startsWith('{')) return parseJson(t);
  const tipi = new Map(), orari = new Map();
  for (const l of t.split(/\r?\n/)) {
    const m = reDmy.exec(l); let d, resto;
    if (m) { d = `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`; resto = l.replace(m[0], ''); }
    else { const i = reIso.exec(l); if (!i) continue; d = i[0]; resto = l.replace(i[0], ''); }
    if (!validaData(d)) continue;
    const low = resto.toLowerCase();
    let tipo = 'PRESENZA';
    for (const [k, label] of Object.entries(TIPI)) if (k !== 'PRESENZA' && riconosce(low, label)) tipo = k;
    if (tipo !== 'PRESENZA' || !tipi.has(d)) tipi.set(d, tipo);
    if (!orari.has(d)) orari.set(d, []);
    orari.get(d).push(...(resto.match(reOra) || []).map(ora));
  }
  const out = [];
  for (const [d, tipo] of tipi) {
    const ts = orari.get(d) || [], ints = [];
    if (tipo === 'PRESENZA' || tipo === 'P104H') for (let i = 0; i < ts.length; i += 2) ints.push([ts[i], ts[i + 1] || '']);
    if (tipo === 'PRESENZA' && ints.length === 0) continue;
    out.push(G(d, tipo, serializza(ints)));
  }
  return out;
}
function parseJson(t) {
  const res = [];
  try {
    const o = JSON.parse(t);
    const arr = Array.isArray(o) ? o : (Array.isArray(o.giornate) ? o.giornate : null);
    if (arr) {
      for (const x of arr) if (x && validaData(x.data)) res.push(G(x.data, tipoDa(x.tipo), x.timbrature || '', Number(x.ore104) || 0, x.nota || '', x.figlio || ''));
    } else if (o && o.e) {                                  // vecchio backup della versione web 1.5: {v, p, e}
      for (const k of Object.keys(o.e)) {
        if (!reIso.test(k) || !validaData(k)) continue;
        const x = o.e[k], ints = (x.p || []).filter(a => a && a[0]).map(a => [a[0], a[1] || '']);
        res.push(G(k, tipoDa(x.t), serializza(ints), Number(x.hr) || 0, x.n || ''));
      }
    }
  } catch (e) { }
  return res;
}
/** Backup completo della versione web: { ata:2, profilo, giornate }. */
export function backupCompleto(testo) {
  try { const o = JSON.parse(String(testo).replace(/^\uFEFF/, '').trim()); return (o && !Array.isArray(o) && o.ata && o.profilo) ? o : null; } catch (e) { return null; }
}

// ---------------- PDF "Cronologia timbrature" del portale presenze
const riga = /^\s*(?:\d+\s+)?(\d{2})-(\d{2})-(\d{4})\s+(?:Lun|Mar|Mer|Gio|Ven|Sab|Dom)\s+(\d{1,2}:\d{2}:\d{2})\s+(.*)$/;
const rePon = /\bpon\b/;
/** Associa la causale del portale presenze (testo della riga) al tipo dell'app. */
export function tipoAssenza(low) {
  const c = x => low.includes(x);
  if (c('ferie anno precedente')) return 'FERIE_PREC';
  if (c('ferie')) return 'FERIE';
  if (c('104')) return 'P104';
  if (c('assemblea')) return 'ASSEMBLEA';
  if (c('studio') && c('diritto')) return 'DIRITTO_STUDIO';
  if (c('breve')) return 'PBREVE';
  if (c('per servizio')) return 'PERM_SERVIZIO';
  if (c('visite specialistiche')) return 'VISITE';
  if (c('ata visite')) return 'PERM_VISITE';
  if (c('per progetti')) return 'PERM_PROGETTI';
  if (c('programmazione')) return 'PERM_PROGRAMMAZIONE';
  if (c('formazione') || c('corsi')) return 'FORMAZIONE';
  if (c('motivi personali')) return 'PERMESSO';
  if (c('esami') || c('concors')) return 'CONCORSI';
  if (c('esenzione')) return 'ESENZIONE';
  if (c('sciopero')) return 'SCIOPERO';
  if (c('straordinario')) return 'STRAORDINARIO';
  if (c('sostituzione assistente')) return 'SOST_AT';
  if (c('sostituzione collaboratore')) return 'SOST_CS';
  if (c('pnrr')) return 'PNRR';
  if (rePon.test(low)) return 'PON';
  if (c('progetti')) return 'PROGETTI';
  if (c('malattia') && c('figlio')) return 'MALFIGLIO';
  if (c('malattia')) return 'MALATTIA';
  if (c('sangue') || c('donazion')) return 'DONAZIONE';
  if (c('maternit')) return 'MATERNITA';
  if (c('paternit')) return 'PATERNITA';
  if (c('lutto')) return 'LUTTO';
  if (c('matrimon')) return 'MATRIMONIO';
  if (c('allattamento') || c('riposi')) return 'RIPOSI';
  if (c('riposo compens') || c('recupero')) return 'RECUPERO';
  if (c('festivit')) return 'FEST';
  if (c('congedo') || c('congedi')) return 'CONG';
  return 'ASSENZA';
}
const reOre = /(\d+)h\s*(\d{1,2})\D{0,3}\s*(\d{1,2})/;
function oreDa(testo, chiave) {
  for (const l of testo.split(/\r?\n/)) { if (!l.includes(chiave)) continue; const m = reOre.exec(l); if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3]; }
  return null;
}
/** attesi(Date) -> secondi attesi nel giorno. */
export function parsePortale(testo, attesi) {
  const avvisi = [], giorni = new Map(), descr = {};
  for (const l of String(testo).split(/\r?\n/)) {
    if (l.toLowerCase().includes('report timbrature errate')) break;
    const m = riga.exec(l.trim()); if (!m) continue;
    const d = `${m[3]}-${m[2]}-${m[1]}`, t = m[4].split(':'), o = `${pad(+t[0])}:${t[1]}:${t[2]}`, resto = m[5].trim(), low = resto.toLowerCase();
    if (!giorni.has(d)) giorni.set(d, { punti: [], assenza: null, durata: 0 });
    const g = giorni.get(d);
    if (low.startsWith('entrata')) g.punti.push([o, true]);
    else if (low.startsWith('uscita')) g.punti.push([o, false]);
    else { g.assenza = tipoAssenza(low); g.durata = sec(o); descr[d] = resto; }
  }
  const out = [];
  for (const d of [...giorni.keys()].sort()) {
    const g = giorni.get(d), data = parseIso(d); if (isNaN(data)) continue;
    const et = `${pad(data.getDate())}/${pad(data.getMonth() + 1)}`, ints = [];
    for (const [o, entrata] of [...g.punti].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (entrata) ints.push([o, '']);
      else if (ints.length && !ints[ints.length - 1][1]) ints[ints.length - 1][1] = o;
      else avvisi.push(`${et}: uscita alle ${o} senza entrata (giorno non importato, aggiungilo a mano)`);
    }
    if (ints.some(i => !i[1])) avvisi.push(`${et}: entrata senza uscita`);
    const ass = g.assenza;
    if (ass) {
      let tipo = ass, ore = 0;
      if (festa(data) && ints.length === 0 && (ass === 'ASSENZA' || ass === 'FEST')) tipo = 'FESTIVO';   // festività nazionale: non assenza
      const att = attesi(data);
      if (ass === 'P104' && att > 0 && g.durata < att - 60) { tipo = 'P104H'; ore = g.durata / 3600; }
      if (ORE_SERVIZIO.has(ass) || LAVORO.has(ass) || ass === 'PBREVE') ore = g.durata / 3600;
      out.push(G(d, tipo, serializza(ints), ore, ass === 'PERMESSO' ? (descr[d] || '').slice(0, 60) : ''));
    } else if (ints.length) out.push(G(d, 'PRESENZA', serializza(ints)));
  }
  const confronto = [], p104 = oreDa(testo, 'Permessi L. 104');
  if (p104 !== null) {
    const app = out.reduce((s, g) => s + (g.tipo === 'P104' ? attesi(parseIso(g.data)) : g.tipo === 'P104H' ? Math.trunc(g.ore104 * 3600) : 0), 0);
    confronto.push(Math.abs(app - p104) <= 60 ? `✅ Permessi L. 104: ${fh(app)}, come il portale` : `⚠️ Permessi L. 104: il portale indica ${fh(p104)}, importati ${fh(app)}`);
  }
  const lavP = oreDa(testo, 'Entrate/Uscite');
  if (lavP !== null) {
    const app = out.reduce((s, g) => s + lavorati(g), 0);
    const inaff = String(testo).toLowerCase().includes('non attendibile') || lavP > 2000 * 3600;
    confronto.push(inaff ? `ℹ️ Il portale segnala timbrature errate: il suo totale ore non è confrontabile (importate ${fh(app)})`
      : Math.abs(app - lavP) <= 60 ? `✅ Ore lavorate: ${fh(app)}, come il portale` : `⚠️ Ore lavorate: il portale indica ${fh(lavP)}, importate ${fh(app)}`);
  }
  return { giornate: out, avvisi, confronto };
}

/** Testo del PDF riga per riga (le voci con la stessa quota verticale formano una riga). pdfjs = libreria pdf.js. */
export async function testoDaPdf(pdfjs, data) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data), useSystemFonts: true, isEvalSupported: false }).promise;
  if (doc.numPages > LIMITE_PAGINE_PDF) return null;
  let testo = '';
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent();
    const righe = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const y = it.transform[5], x = it.transform[4];
      let r = righe.find(q => Math.abs(q.y - y) < 3);
      if (!r) { r = { y, v: [] }; righe.push(r); }
      r.v.push([x, it.str]);
    }
    righe.sort((a, b) => b.y - a.y);
    for (const r of righe) testo += r.v.sort((a, b) => a[0] - b[0]).map(v => v[1].trim()).join(' ').replace(/\s+/g, ' ') + '\n';
  }
  return testo;
}
/** Legge un file scelto dall'utente (PDF del portale, CSV/TXT, backup JSON o .ata cifrato). Lancia {codice:'PASSWORD'|'ERRATA'}. */
export async function leggiFile(file, { attesi, pdfjs, password = null }) {
  if (file.size > LIMITE_FILE) return { giornate: [], avvisi: ['File troppo grande (massimo 25 MB).'], confronto: [] };
  const buf = await file.arrayBuffer(), b = new Uint8Array(buf);
  if (b.length > 4 && String.fromCharCode(b[0], b[1], b[2], b[3]) === '%PDF') {
    if (!pdfjs) return { giornate: [], avvisi: ['Lettore PDF non disponibile.'], confronto: [] };
    const testo = await testoDaPdf(pdfjs, buf);
    if (testo === null) return { giornate: [], avvisi: [`Il PDF ha troppe pagine (massimo ${LIMITE_PAGINE_PDF}).`], confronto: [] };
    const r = parsePortale(testo, attesi);
    return r.giornate.length ? r : { giornate: parse(testo), avvisi: [], confronto: [] };
  }
  let t = new TextDecoder('utf-8').decode(b);
  if (cifrato(t)) {
    if (password == null) throw { codice: 'PASSWORD' };
    const chiaro = await decifra(t, password);
    if (chiaro == null) throw { codice: 'ERRATA' };
    t = chiaro;
  }
  return { giornate: parse(t), avvisi: [], confronto: [], testo: t };
}
