import { mk, addDays, iso, parseIso } from './util.js';
import { intervalli } from './model.js';

const FISSI = { '1-1': 'Capodanno', '6-1': 'Epifania', '25-4': 'Festa della Liberazione', '1-5': 'Festa del Lavoro',
  '2-6': 'Festa della Repubblica', '15-8': 'Ferragosto', '1-11': 'Ognissanti', '8-12': 'Immacolata Concezione',
  '25-12': 'Natale', '26-12': 'Santo Stefano' };

export function pasqua(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mese = Math.floor((h + l - 7 * m + 114) / 31), giorno = (h + l - 7 * m + 114) % 31 + 1;
  return mk(y, mese, giorno);
}
/** Festività nazionali italiane (orario atteso = 0). Il Santo Patrono locale non è incluso. */
export function nome(d) {
  const p = pasqua(d.getFullYear()), k = iso(d);
  if (k === iso(p)) return 'Pasqua';
  if (k === iso(addDays(p, 1))) return 'Lunedì dell’Angelo';
  if (d.getFullYear() >= 2026 && d.getMonth() === 9 && d.getDate() === 4) return 'San Francesco d’Assisi';
  return FISSI[`${d.getDate()}-${d.getMonth() + 1}`] || null;
}
/** Festività nazionale non lavorata: va indicata come "giorno festivo" e non come assenza. */
export function comeFestivo(d, g) {
  const n = nome(d);
  if (!n) return null;
  if (!g) return n;
  return (['ASSENZA', 'FEST', 'FESTIVO'].includes(g.tipo) && intervalli(g).length === 0) ? n : null;
}
