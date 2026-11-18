import { parseIso, mk, uid } from './util.js';
export const OPZIONI_AVVISO = [[-1, 'Nessun avviso'], [0, 'All’ora dell’appuntamento'], [10, '10 minuti prima'], [30, '30 minuti prima'],
  [60, '1 ora prima'], [120, '2 ore prima'], [1440, '1 giorno prima'], [2880, '2 giorni prima']];
export function carica(json) {
  try {
    return JSON.parse(json && String(json).trim() ? json : '[]')
      .map(o => ({ id: o.id, titolo: o.t || '', data: o.d || '', ora: o.o || '', luogo: o.l || '', avvisoMin: o.a ?? -1 }))
      .sort((a, b) => (a.data + ' ' + (a.ora || '00:00')).localeCompare(b.data + ' ' + (b.ora || '00:00')));
  } catch (e) { return []; }
}
export const serializza = l => JSON.stringify(l.map(a => ({ id: a.id, t: a.titolo, d: a.data, o: a.ora, l: a.luogo, a: a.avvisoMin })));
export function istante(a) {
  const d = parseIso(a.data || ''); if (isNaN(d)) return null;
  const [h, m] = a.ora ? a.ora.slice(0, 5).split(':').map(Number) : [8, 0];
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0);
}
export const quandoAvviso = a => { const i = istante(a); return (a.avvisoMin < 0 || !i) ? null : new Date(i.getTime() - a.avvisoMin * 60000); };
export const descrizioneAvviso = min => (OPZIONI_AVVISO.find(o => o[0] === min) || [0, `${min} minuti prima`])[1];
export const nuovoId = uid;
