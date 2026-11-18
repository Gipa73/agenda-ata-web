// Tipi di giornata e causali: stesso elenco e stessi nomi dell'app Android (i backup sono compatibili).
export const TIPI = {
  PRESENZA: 'Entrate/Uscite', PON: 'PON', PNRR: 'PNRR',
  SOST_AT: 'Sostituzione assistente tecnico per serale', SOST_CS: 'Sostituzione collaboratore scolastico',
  PROGETTI: 'Progetti', STRAORDINARIO: 'Straordinario autorizzato',
  PBREVE: 'Permesso breve', PERM_SERVIZIO: 'Permesso per servizio', PERM_VISITE: 'Permesso ATA visite',
  ASSEMBLEA: 'Permesso assemblea sindacale', DIRITTO_STUDIO: 'Permesso diritto allo studio',
  P104: 'Assenze/Permessi L. 104', P104H: 'Assenze/Permessi L. 104 (a ore)',
  PERM_PROGETTI: 'Permesso per progetti', PERM_PROGRAMMAZIONE: 'Permesso per programmazione',
  FORMAZIONE: 'Permesso per corsi di formazione',
  PERMESSO: 'Permesso motivi personali/familiari', LUTTO: 'Permesso per lutto', MATRIMONIO: 'Congedo matrimoniale',
  CONCORSI: 'Permesso partecipazione esami/concorsi',
  MALATTIA: 'Malattia', DONAZIONE: 'Permesso donazione sangue', ASSENZA: 'Altra assenza',
  ESENZIONE: 'Esenzione dal servizio ex art. 1256 c. 2 c.c.', VISITE: 'Visite specialistiche (art. 33)',
  SCIOPERO: 'Sciopero',
  FERIE: 'Ferie', FAM: 'Ferie per motivi familiari/personali', FERIE_PREC: 'Ferie anno precedente',
  CONG: 'Congedo parentale', MATERNITA: 'Congedo di maternità', PATERNITA: 'Congedo di paternità',
  MALFIGLIO: 'Malattia del figlio', ADOZIONE: 'Congedo adozione / affidamento',
  RIPOSI: 'Riposi giornalieri (allattamento)', VIOLENZA: 'Congedo vittime di violenza',
  BIENNALE: 'Congedo biennale assistenza disabili', ASPETTATIVA: 'Aspettativa motivi familiari (non retribuita)',
  FEST: 'Festività soppressa', CHIUSURA: 'Chiusura prefestiva', RECUPERO: 'Riposo compensativo',
  FESTIVO: 'Giorno festivo'
};
export const tipoValido = t => Object.prototype.hasOwnProperty.call(TIPI, t);
export const labelTipo = t => TIPI[t] || t;

/** Elenco delle causali (come nel portale presenze); alcune raggruppano più tipi (sotto-scelta). */
export const CAUSALI = [
  ['Entrate/Uscite', ['PRESENZA']], ['PON', ['PON']], ['PNRR', ['PNRR']],
  ['Sostituzione assistente tecnico per serale', ['SOST_AT']], ['Sostituzione collaboratore scolastico', ['SOST_CS']],
  ['Progetti', ['PROGETTI']], ['Permesso breve', ['PBREVE']], ['Permesso per servizio', ['PERM_SERVIZIO']],
  ['Permesso ATA visite', ['PERM_VISITE']], ['Permesso assemblea sindacale', ['ASSEMBLEA']],
  ['Permesso diritto allo studio', ['DIRITTO_STUDIO']], ['Assenze/Permessi L. 104', ['P104', 'P104H']],
  ['Permesso per progetti', ['PERM_PROGETTI']], ['Permesso per programmazione', ['PERM_PROGRAMMAZIONE']],
  ['Permesso per corsi di formazione', ['FORMAZIONE']],
  ['Permesso motivi personali/familiari', ['PERMESSO', 'LUTTO', 'MATRIMONIO']],
  ['Straordinario autorizzato', ['STRAORDINARIO']], ['Permesso partecipazione esami/concorsi', ['CONCORSI']],
  ['Assenze', ['MALATTIA', 'ASSENZA']], ['Sciopero', ['SCIOPERO']], ['Donazione sangue', ['DONAZIONE']],
  ['Esenzione dal servizio ex art. 1256 c. 2 c.c.', ['ESENZIONE']], ['Visite specialistiche (art. 33)', ['VISITE']],
  ['Ferie', ['FERIE', 'FAM']], ['Ferie anno precedente', ['FERIE_PREC']],
  ['Congedi', ['CONG', 'MATERNITA', 'PATERNITA', 'MALFIGLIO', 'ADOZIONE', 'RIPOSI', 'VIOLENZA', 'BIENNALE', 'ASPETTATIVA']],
  ['Festività soppresse', ['FEST']], ['Riposo compensativo', ['RECUPERO']]
].map(([nome, tipi]) => ({ nome, tipi }));

export function causaleDi(t) {
  return CAUSALI.find(c => c.tipi.includes(t))
    || (t === 'CHIUSURA' ? CAUSALI.find(c => c.tipi.includes('FEST')) : null)
    || (t === 'FESTIVO' ? { nome: 'Giorno festivo', tipi: ['FESTIVO'] } : null)
    || CAUSALI[0];
}
export const LAVORO = new Set(['PRESENZA', 'PON', 'PNRR', 'SOST_AT', 'SOST_CS', 'PROGETTI', 'STRAORDINARIO']);
export const ORE_SERVIZIO = new Set(['P104H', 'ASSEMBLEA', 'FORMAZIONE', 'RIPOSI', 'PERM_SERVIZIO', 'PERM_VISITE', 'DIRITTO_STUDIO',
  'PERM_PROGETTI', 'PERM_PROGRAMMAZIONE', 'VISITE', 'SCIOPERO']);
export const A_SALDO = new Set([...LAVORO, ...ORE_SERVIZIO, 'PBREVE']);
export const CON_ORE = new Set([...ORE_SERVIZIO, 'PBREVE', 'P104']);
export const CON_TIMBRATURE = new Set([...A_SALDO, 'P104']);

export const COLORI_TIPO = {
  FERIE: '#2f9bea', FEST: '#0ea5a4', PERMESSO: '#14b8a6', MALATTIA: '#f59e0b', RECUPERO: '#6366f1', CHIUSURA: '#64748b',
  FAM: '#38bdf8', P104: '#a855f7', P104H: '#a855f7', ASSEMBLEA: '#f97316', FORMAZIONE: '#ec4899', PBREVE: '#eab308',
  FERIE_PREC: '#0284c7', SCIOPERO: '#b45309', ESENZIONE: '#475569', ASSENZA: '#64748b', DIRITTO_STUDIO: '#0d9488',
  PERM_SERVIZIO: '#0ea5e9', PERM_VISITE: '#14b8a6', VISITE: '#06b6d4', PERM_PROGETTI: '#6366f1', PERM_PROGRAMMAZIONE: '#8b5cf6',
  FESTIVO: '#e11d2e', CONG: '#fb7185', MATERNITA: '#fb7185', PATERNITA: '#fb7185', MALFIGLIO: '#fb923c', ADOZIONE: '#fb7185',
  RIPOSI: '#fb923c', LUTTO: '#94a3b8', MATRIMONIO: '#f472b6', CONCORSI: '#22c55e', VIOLENZA: '#be123c', BIENNALE: '#7c3aed',
  ASPETTATIVA: '#94a3b8', DONAZIONE: '#9f1239'
};
export const coloreTipo = t => COLORI_TIPO[t] || '#16a870';

// ---- Giornata: { data:'aaaa-mm-gg', tipo, timbrature:'hh:mm:ss-hh:mm:ss;...', ore104, nota, figlio }
export const nuovaGiornata = (data, tipo = 'PRESENZA') => ({ data, tipo, timbrature: '', ore104: 0, nota: '', figlio: '' });
export const intervalli = g => (!g || !String(g.timbrature || '').trim()) ? []
  : g.timbrature.split(';').map(x => { const s = x.split('-'); return [s[0], s[1] || '']; });
export const serializza = ints => ints.map(i => `${i[0]}-${i[1]}`).join(';');

// ---- Profilo (stessi campi dell'app Android)
export const profiloVuoto = () => ({
  nome: '', cognome: '', ruolo: 'Collaboratore Scolastico', scuola: '', determinato: false, ore: 36, giorni: 5, menoDi3Anni: false,
  residue: 0, fam: false, famMax: 6, permMax: 3, f104: false, cong: false, congMax: 10, plesso: '', codScuola: '',
  rem: false, remIn: '07:30:00', remOut: '14:00:00', blocco: false, figli: '', bancaMesi: 0, scadResidue: '30/04',
  emailSegreteria: '', guida: false, tipoOrario: 'pieno', giorniLav: '1,2,3,4,5', oreGiorno: '', ferieManuali: -1,
  tema: 'viola', modoScuro: 'auto', mesiAnno: 12, festSoppresse: 4, scadenzaContratto: '30giu', inizioContratto: '', fineContratto: '',
  attestati: '', primoAvvio: '', ultimaData: '', benvenutoVisto: false, versioneVista: '', appuntamenti: '',
  giorniRientro: '', rientroIn: '14:30:00', rientroOut: '17:00:00', turni: '', contributoFatto: false, ultimoInvito: '',
  oreResidue: 0, contratti: '', consensoStatistiche: '', idInstallazione: '', ultimoPing: '', invitoVersione: ''
});
export const sede = p => [p.scuola, p.plesso].filter(x => x && x.trim()).join(' – ');
