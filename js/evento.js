import { dow, iso } from './util.js';
import { nome as festa, comeFestivo } from './festivi.js';
import { LAVORO, TIPI } from './model.js';
import { attesi } from './calc.js';
import { turnoDelGiorno } from './turni.js';

/** Frase dell'"evento del giorno" in Home, in base a timbrature, calendario e turni. */
export function testo(p, m, d, piano) {
  const g = m[iso(d)], t = g && g.tipo;
  if (t && !LAVORO.has(t) && comeFestivo(d, g) == null) return `Oggi: ${TIPI[t] || t}`;
  const f = festa(d);
  if (f) return `Buona festa! Oggi è ${f} 🎉`;
  if (dow(d) === 7) return 'Buona domenica! ☀️';
  if (attesi(p, d) === 0) return dow(d) === 6 ? 'Buon sabato! Oggi non lavori 😊' : 'Giorno libero: buon riposo! 😊';
  const tu = turnoDelGiorno(piano, d);
  if (tu) return `Oggi: ${tu.nome}`;
  return 'Buona giornata di lavoro! 💪';
}
