import { profiloVuoto, intervalli, serializza } from './model.js';
import { parse as parseCsv } from './importer.js';
import { iso, oggi, diffGiorni, parseIso } from './util.js';
import { VERSIONE, GIORNI_PRIMO_INVITO, GIORNI_TRA_INVITI } from './config.js';

const KP = 'ata2.profilo', KE = 'ata2.giornate';
const mem = {};
const ls = {
  get: k => { try { const v = localStorage.getItem(k); return v === null ? (mem[k] ?? null) : v; } catch (e) { return mem[k] ?? null; } },
  set: (k, v) => { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) { } },
  del: k => { delete mem[k]; try { localStorage.removeItem(k); } catch (e) { } }
};
export const S = { p: profiloVuoto(), m: {}, migrato: false };

export function carica() {
  try { S.p = { ...profiloVuoto(), ...JSON.parse(ls.get(KP) || '{}') }; } catch (e) { S.p = profiloVuoto(); }
  try { S.m = JSON.parse(ls.get(KE) || '{}') || {}; } catch (e) { S.m = {}; }
  if (ls.get(KP) === null && ls.get(KE) === null) migraVersioneVecchia();
  if (!S.p.primoAvvio) { S.p.primoAvvio = iso(oggi()); salvaP(); }
  S.p.ultimaData = iso(oggi());
  if (S.p.festSoppresse === 3 && !ls.get('ata2.mig4')) { S.p.festSoppresse = 4; ls.set('ata2.mig4', '1'); }
  salvaP();
}
export const salvaP = () => ls.set(KP, JSON.stringify(S.p));
export const salvaE = () => ls.set(KE, JSON.stringify(S.m));
export function setP(patch) { Object.assign(S.p, patch); salvaP(); }
export function salvaGiornata(g) { S.m[g.data] = g; salvaE(); }
export function eliminaGiornata(d) { delete S.m[d]; salvaE(); }
export function resetGiornate() { S.m = {}; salvaE(); }

/** Importando timbrature o backup non si perdono le note già scritte (né il figlio scelto per i congedi). */
export function importaGiornate(lista) {
  for (const g of lista) {
    const e = S.m[g.data];
    let n = { ...g };
    if (e) {
      const nota = (!e.nota || e.nota === g.nota) ? g.nota : (!g.nota ? e.nota : e.nota + ' · ' + g.nota);
      n = { ...g, nota, figlio: (!g.figlio && e.tipo === g.tipo) ? e.figlio : g.figlio };
    }
    S.m[g.data] = n;
  }
  salvaE();
}
export function timbra() {
  const t = new Date(), k = iso(oggi()), h = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`;
  const g = S.m[k] ? { ...S.m[k] } : { data: k, tipo: 'PRESENZA', timbrature: '', ore104: 0, nota: '', figlio: '' };
  const ints = intervalli(g);
  if (ints.length && !ints[ints.length - 1][1]) ints[ints.length - 1][1] = h; else ints.push([h, '']);
  g.timbrature = serializza(ints);
  salvaGiornata(g);
  return h;
}
/** Dati della versione web 1.5 (stesso sito): giornate e profilo di base vengono ripresi una volta sola. */
function migraVersioneVecchia() {
  try {
    const E = JSON.parse(localStorage.getItem('ata_e') || 'null'), P = JSON.parse(localStorage.getItem('ata_p') || 'null');
    if (!E && !P) return;
    if (E) { delete E._tmp; for (const g of parseCsv(JSON.stringify({ v: 1, p: {}, e: E }))) S.m[g.data] = g; }
    if (P) {
      const n = (x, d) => (x === undefined || x === null || x === '' || isNaN(+x)) ? d : +x;
      Object.assign(S.p, {
        nome: P.nome || '', cognome: P.cognome || '', scuola: P.scuola || '', plesso: P.plesso || '', ruolo: P.profilo || S.p.ruolo,
        ore: n(P.ore, 36), giorni: n(P.giorni, 5), tipoOrario: ['pieno', 'orizz', 'vert', 'pers'].includes(P.tipoOrario) ? P.tipoOrario : 'pieno',
        giorniLav: Array.isArray(P.giorniLav) && P.giorniLav.length ? P.giorniLav.join(',') : '1,2,3,4,5',
        oreGiorno: Array.isArray(P.oreGiorno) ? P.oreGiorno.join(',') : '', residue: n(P.res, 0), festSoppresse: 4,
        fam: !!+P.fam, f104: !!+P.f104, cong: !!+P.cong, famMax: n(P.famMax, 6), permMax: n(P.permMax, 3), congMax: n(P.congMax, 10),
        scadResidue: P.scadRes || '30/04', bancaMesi: n(P.bancaMesi, 0), figli: P.figli || '', emailSegreteria: P.email || P.emailSegreteria || '',
        tema: P.tema || 'viola', modoScuro: P.modo || 'auto', guida: true
      });
    }
    S.migrato = true; salvaE();
  } catch (e) { }
}

// ---- invito "caffè o pizza": 7 giorni dopo il primo avvio, poi ogni 5; e una volta a ogni nuova versione
export function invitoDovuto(p = S.p) {
  if (p.contributoFatto) return false;
  if (p.invitoVersione !== VERSIONE) return true;
  const primo = !p.ultimoInvito, base = parseIso(primo ? p.primoAvvio : p.ultimoInvito);
  return !isNaN(base) && diffGiorni(base, oggi()) >= (primo ? GIORNI_PRIMO_INVITO : GIORNI_TRA_INVITI);
}
export const invitoMostrato = () => setP({ ultimoInvito: iso(oggi()), invitoVersione: VERSIONE });

// ---- allegati dei contratti (IndexedDB)
let dbp = null;
const db = () => dbp || (dbp = new Promise((ok, ko) => {
  const r = indexedDB.open('ata2', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('allegati', { keyPath: 'id' });
  r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
}));
const tx = async (modo, f) => { const d = await db(); return new Promise((ok, ko) => { const t = d.transaction('allegati', modo), q = f(t.objectStore('allegati')); t.oncomplete = () => ok(q && q.result); t.onerror = () => ko(t.error); }); };
export const allegatoSalva = (id, file) => tx('readwrite', s => s.put({ id, nome: file.name, mime: file.type || 'application/octet-stream', blob: file }));
export const allegatoLeggi = id => tx('readonly', s => s.get(id));
export const allegatoElimina = id => tx('readwrite', s => s.delete(id));
export async function chiediPersistenza() { try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { } }
