import { parseData, plusYears, diffGiorni, oggi as oggiD, fmtData } from './util.js';

const SIC = 'Sicurezza sul lavoro (D.Lgs. 81/08)', NORM = 'Normativa e pubblica amministrazione', TIT = 'Titoli e certificazioni';
const A = (id, nome, categoria, descrizione, anni) => ({ id, nome, categoria, descrizione, anni, ok: false, data: '', personalizzato: false });
export const CATALOGO = [
  A('gen', 'Formazione generale (4 ore)', SIC, 'Non scade.', 0),
  A('spec', 'Formazione specifica, rischio medio (8 ore)', SIC, 'Aggiornamento di 6 ore ogni 5 anni.', 5),
  A('antinc', 'Addetto antincendio e gestione emergenze', SIC, '8 o 12 ore; aggiornamento ogni 3 anni (5 ore).', 3),
  A('ps', 'Addetto al primo soccorso', SIC, '12 o 16 ore; aggiornamento ogni 3 anni (4 ore di parte pratica).', 3),
  A('prep', 'Preposto per la sicurezza', SIC, 'Aggiornamento ogni 2 anni (6 ore).', 2),
  A('haccp', 'HACCP (igiene alimentare)', SIC, 'Per chi gestisce o serve i pasti in mensa; validità variabile da regione a regione, mediamente 2-3 anni.', 3),
  A('gdpr', 'GDPR e privacy a scuola', NORM, 'Trattamento dei dati personali di alunni e famiglie.', 0),
  A('antic', 'Trasparenza e anticorruzione (L. 190/2012)', NORM, 'Formazione periodica sui doveri dei dipendenti pubblici.', 0),
  A('incl', 'Inclusione e assistenza alunni con disabilità / igiene personale', NORM, 'Per collaboratori scolastici e operatori scolastici.', 0),
  A('ciad', 'CIAD (alfabetizzazione digitale, DigComp 2.2)', TIT, 'Requisito d’accesso per tutti i profili ATA tranne il collaboratore scolastico.', 0),
  A('inf', 'Certificazione informatica aggiuntiva (Pekit, EIPASS, ICDL/ECDL, Cisco)', TIT, 'Dà punteggio nelle graduatorie di III fascia e 24 mesi.', 0),
  A('dattil', 'Attestato di dattilografia', TIT, 'Per assistente amministrativo (+1 punto).', 0),
  A('osa', 'Attestati professionali OSA / OSS / ASACOM', TIT, 'Qualifiche socio-assistenziali per operatore scolastico e servizi socio-educativi.', 0)
];
export function carica(json) {
  let stato = {}, custom = [];
  try { for (const o of JSON.parse(json && String(json).trim() ? json : '[]')) { stato[o.id] = o; if (o.c) custom.push(o); } } catch (e) { }
  const base = CATALOGO.map(v => { const o = stato[v.id]; return o ? { ...v, ok: !!o.ok, data: o.d || '', anni: o.a !== undefined ? o.a : v.anni } : { ...v }; });
  const extra = custom.map(o => ({ id: o.id, nome: o.n || '', categoria: 'Altri attestati', descrizione: 'Attestato personalizzato', anni: o.a || 0, ok: !!o.ok, data: o.d || '', personalizzato: true }));
  return [...base, ...extra];
}
export const serializza = l => JSON.stringify(l.filter(x => {
  const v = CATALOGO.find(c => c.id === x.id);
  return x.personalizzato || x.ok || x.data || (v && x.anni !== v.anni);
}).map(x => ({ id: x.id, ok: x.ok, d: x.data, a: x.anni, c: x.personalizzato, n: x.nome })));
export function scadenza(a) { if (!a.ok || a.anni <= 0) return null; const d = parseData(a.data); return d ? plusYears(d, a.anni) : null; }
export function stato(a, oggi = oggiD()) {
  if (!a.ok) return 'DA_FARE';
  if (a.anni <= 0) return 'NON_SCADE';
  const s = scadenza(a); if (!s) return 'DATA_MANCANTE';
  const gg = diffGiorni(oggi, s);
  return gg < 0 ? 'SCADUTO' : gg <= 90 ? 'IN_SCADENZA' : 'VALIDO';
}
export function testoStato(a) {
  const s = scadenza(a), f = s ? fmtData(s) : '';
  return { DA_FARE: 'Da conseguire', DATA_MANCANTE: 'Inserisci la data di conseguimento', NON_SCADE: 'Posseduto, non scade',
    VALIDO: `Valido fino al ${f}`, IN_SCADENZA: `In scadenza il ${f}`, SCADUTO: `Scaduto il ${f}` }[stato(a)];
}
