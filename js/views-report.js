import { S } from './store.js';
import { iso, oggi, mk, daysInMonth, MESI, GG, dow, fmt, fh, fmtC, pad, hm, parseIso, fmtData, dec } from './util.js';
import * as C from './calc.js';
import * as F from './festivi.js';
import { intervalli, labelTipo, LAVORO } from './model.js';
import { sede } from './model.js';
import { h, on, scarica, toast } from './ui.js';
import { N } from './nav.js';

const sicuroCsv = s => (s && '=+-@\t\r'.includes(s[0])) ? "'" + s : s;
/** Una riga per giorno con dati (o festivo): le festività nazionali sono sempre "Giorno festivo", mai assenze. */
export function righe(p, m, y, mese) {
  const out = [];
  for (let i = 1; i <= daysInMonth(y, mese); i++) {
    const d = mk(y, mese, i), g = m[iso(d)], festa = F.comeFestivo(d, g), data = `${pad(i)}/${pad(mese)}/${y}`, gg = GG[dow(d) - 1];
    if (festa) { out.push({ k: iso(d), cells: [data, gg, 'Giorno festivo', '', '', '', '', festa], fest: true }); continue; }
    if (!g) continue;
    const s = C.saldo(p, d, g);
    out.push({ k: iso(d), fest: false, cells: [data, gg, labelTipo(g.tipo), intervalli(g).map(x => `${hm(x[0])} - ${x[1] ? hm(x[1]) : '…'}`).join('; '),
      C.lavorati(g) ? fh(C.lavorati(g)) : '', fh(C.attesi(p, d)), s == null ? '' : fmt(s), g.nota || ''] });
  }
  return out;
}
const intestazione = (p, y, mese) => `${[p.nome, p.cognome].filter(Boolean).join(' ')}${sede(p) ? ' · ' + sede(p) : ''} — ${MESI[mese - 1]} ${y}`;
function csv(p, m, y, mese) {
  const head = ['Data', 'Giorno', 'Causale', 'Timbrature', 'Lavorato', 'Previsto', 'Saldo', 'Nota'];
  const tutte = [[sicuroCsv(intestazione(p, y, mese))], head, ...righe(p, m, y, mese).map(r => r.cells.map((c, i) => i === 7 ? sicuroCsv(c) : c)), ['Saldo mese', fmt(C.saldoMese(p, m, y, mese))]];
  return '\uFEFF' + tutte.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
}
const tabella = rr => `<div class="sc"><table><tr><th>Data</th><th>Causale</th><th>Orari</th><th>Saldo</th></tr>${rr.map(r => r.fest
  ? `<tr class="fest"><td class="n">${r.cells[0].slice(0, 5)} ${r.cells[1]}</td><td colspan="3">🔴 Giorno festivo · ${h(r.cells[7])}</td></tr>`
  : `<tr><td class="n">${r.cells[0].slice(0, 5)} ${r.cells[1]}</td><td>${h(r.cells[2])}${r.cells[7] ? `<div class="mu sm">${h(r.cells[7])}</div>` : ''}</td><td>${h(r.cells[3])}</td><td class="n ${r.cells[6].startsWith('−') ? 'ko' : 'ok'}">${r.cells[6]}</td></tr>`).join('')}</table></div>`;

export function report() {
  const { y, m } = N, p = S.p, rr = righe(p, S.m, y, m), anomalie = C.anomalie(p, S.m, y, m);
  // statistiche dell'anno
  const od = oggi(), cont = {}; let festivi = 0;
  for (let mm = 1; mm <= 12; mm++) for (let i = 1; i <= daysInMonth(y, mm); i++) {
    const d = mk(y, mm, i); if (d > od) break;
    const g = S.m[iso(d)];
    if (F.comeFestivo(d, g)) festivi++;
    else if (g && g.tipo !== 'PRESENZA') cont[labelTipo(g.tipo)] = (cont[labelTipo(g.tipo)] || 0) + 1;
  }
  const mesi = [...Array(12)].map((_, i) => C.saldoMese(p, S.m, y, i + 1)), mx = Math.max(3600, ...mesi.map(Math.abs));
  const grafico = `<svg viewBox="0 0 300 120" width="100%" role="img" aria-label="Saldo per mese">${mesi.map((s, i) => {
    const alt = Math.round(Math.abs(s) / mx * 44), x = 8 + i * 24;
    return `<rect x="${x}" y="${s >= 0 ? 55 - alt : 55}" width="16" height="${Math.max(alt, s ? 1 : 0)}" rx="3" fill="${s >= 0 ? 'var(--ok)' : 'var(--ko)'}"/><text x="${x + 8}" y="116" font-size="8" text-anchor="middle" fill="var(--mu)">${MESI[i].slice(0, 3)}</text>`;
  }).join('')}<line x1="4" x2="296" y1="55" y2="55" stroke="var(--bd)"/></svg>`;
  const tot = mesi.reduce((a, b) => a + b, 0);
  return `
  <div class="row"><button class="pic sec" data-a="mesePrec">‹</button><h1 style="margin:0">Report ${MESI[m - 1]} ${y}</h1><button class="pic sec" data-a="meseSucc">›</button></div><div class="sp"></div>
  <div class="card"><div class="mu">Saldo del mese</div><div class="big ${C.saldoMese(p, S.m, y, m) >= 0 ? 'ok' : 'ko'}">${fmt(C.saldoMese(p, S.m, y, m))}</div>
    ${rr.length ? tabella(rr) : '<div class="mu" style="margin-top:8px">Nessun dato per questo mese</div>'}</div>
  ${anomalie.length ? `<div class="card"><h2>⚠️ Da controllare</h2>${anomalie.map(a => `<div class="mu">${h(a)}</div>`).join('')}</div>` : ''}
  <div class="grid2"><button data-a="csv">📄 CSV</button><button class="sec" data-a="stampa">🖨️ PDF / Stampa</button></div><div class="sp"></div>
  <button class="sec" data-a="mailSegreteria">✉️ Scrivi alla segreteria</button><div class="sp"></div>
  <div class="card"><h2>📊 Saldo per mese · ${y}</h2>${grafico}<div class="mu">Totale anno: <b class="${tot >= 0 ? 'ok' : 'ko'}">${fmt(tot)}</b></div></div>
  <div class="card"><h2>Statistiche ${y}</h2><div class="lista">${festivi ? `<div><span>Giorni festivi</span><b>${festivi}</b></div>` : ''}${Object.entries(cont).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div><span>${h(k)}</span><b>${v}</b></div>`).join('') || (festivi ? '' : '<div class="mu">Nessuna assenza registrata</div>')}</div></div>
  <div id="stampa"><h2>${h(intestazione(p, y, m))}</h2>${tabella(rr)}<p><b>Saldo mese: ${fmt(C.saldoMese(p, S.m, y, m))}</b></p></div>`;
}
on('csv', () => { scarica(`ata_${N.y}-${pad(N.m)}.csv`, csv(S.p, S.m, N.y, N.m), 'text/csv'); });
on('stampa', () => window.print());
on('mailSegreteria', () => {
  const p = S.p, mm = encodeURIComponent(`Cartellino ${MESI[N.m - 1]} ${N.y} - ${[p.nome, p.cognome].filter(Boolean).join(' ')}`);
  const corpo = encodeURIComponent(`${intestazione(p, N.y, N.m)}\nSaldo del mese: ${fmt(C.saldoMese(p, S.m, N.y, N.m))}\n\n${righe(p, S.m, N.y, N.m).map(r => r.cells.slice(0, 4).join(' | ') + ' | ' + r.cells[6]).join('\n')}`);
  location.href = `mailto:${p.emailSegreteria || ''}?subject=${mm}&body=${corpo}`;
});
