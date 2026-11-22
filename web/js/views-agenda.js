import { S, salvaGiornata, eliminaGiornata } from './store.js';
import { iso, oggi, mk, dow, daysInMonth, fmtC, MESI, GG, fh, nt, parseNum, fmt, pad, parseIso } from './util.js';
import * as C from './calc.js';
import * as TU from './turni.js';
import * as F from './festivi.js';
import { TIPI, CAUSALI, causaleDi, LAVORO, CON_ORE, CON_TIMBRATURE, coloreTipo, intervalli, serializza, labelTipo } from './model.js';
import { h, on, modal, opts, toast, conferma } from './ui.js';
import { N } from './nav.js';

const coloraPerTipo = g => !(LAVORO.has(g.tipo) || g.tipo === 'PBREVE' || g.tipo === 'RECUPERO') && intervalli(g).length === 0;

export function agenda() {
  const { y, m } = N, p = S.p, piano = TU.carica(p.turni), od = iso(oggi()), prim = dow(mk(y, m, 1));
  let celle = '';
  for (let i = 1; i < prim; i++) celle += '<div class="d vuoto"></div>';
  const feste = [];
  for (let i = 1; i <= daysInMonth(y, m); i++) {
    const d = mk(y, m, i), k = iso(d), g = S.m[k], fest = F.nome(d), tu = F.nome(d) ? null : TU.turnoDelGiorno(piano, d), s = C.saldo(p, d, g);
    let cl = 'd', stile = '', small = '';
    if (fest) { cl += ' f'; feste.push(`${i} ${MESI[m - 1].toLowerCase()} · ${fest}`); }
    else if (g && coloraPerTipo(g)) { cl += ' b'; stile = `--c:${coloreTipo(g.tipo)}`; }
    else if (s != null) cl += s >= 0 ? ' g' : ' r';
    if (k === od) cl += ' t';
    small = tu ? tu.sigla : (s ? fmtC(s).replace('h', ':').replace('m', '') : '');
    celle += `<button class="${cl}" style="${stile}" data-a="giorno" data-d="${k}">${i}${small ? `<small>${h(small)}</small>` : ''}</button>`;
  }
  const tot = C.saldoMese(p, S.m, y, m);
  return `
  <div class="row"><button class="pic sec" data-a="mesePrec">‹</button><h1 style="margin:0">${MESI[m - 1]} ${y}</h1><button class="pic sec" data-a="meseSucc">›</button></div>
  <div class="sp"></div>
  <div class="card"><div class="cal">${GG.map(x => `<div class="hd">${x}</div>`).join('')}${celle}</div>
    <div class="leg"><span><i style="background:#e11d2e"></i>Festività</span><span><i style="background:var(--ok)"></i>Saldo ≥ 0</span><span><i style="background:var(--ko)"></i>Saldo &lt; 0</span>
      <span><i style="background:#2f9bea"></i>Ferie</span><span><i style="background:#14b8a6"></i>Permessi</span><span><i style="background:#f59e0b"></i>Malattia</span></div></div>
  <div class="card"><div class="mu">Saldo del mese</div><div class="big ${tot >= 0 ? 'ok' : 'ko'}">${fmt(tot)}</div></div>
  ${feste.length ? `<div class="card"><h2>🎌 Festività del mese</h2>${feste.map(x => `<div class="ko">${x}</div>`).join('')}</div>` : ''}`;
}
on('mesePrec', () => { if (--N.m < 1) { N.m = 12; N.y--; } N.render(); });
on('meseSucc', () => { if (++N.m > 12) { N.m = 1; N.y++; } N.render(); });
on('giorno', el => apriGiorno(el.dataset.d));

const etichettaOre = t => ({ P104: 'Ore di permesso (vuoto = giornata intera, max 2 ore)', P104H: 'Ore di permesso (vuoto = giornata intera, max 2 ore)',
  ASSEMBLEA: 'Ore di assemblea sindacale (10 ore all’anno)', FORMAZIONE: 'Ore di formazione', RIPOSI: 'Ore di riposo giornaliero (max 2 al giorno)',
  PBREVE: 'Ore di permesso breve (max metà giornata)', VISITE: 'Ore di visita specialistica (18 ore all’anno scolastico)',
  SCIOPERO: 'Ore di sciopero (vuoto = giornata intera)' }[t] || 'Ore di permesso');
const maxOre = (t, att) => ['P104', 'P104H', 'RIPOSI'].includes(t) ? 2 : t === 'ASSEMBLEA' ? 10 : t === 'PBREVE' ? Math.max(0.5, att / 7200) : 24;
const suggerimento = t => ({
  ASSEMBLEA: 'In servizio vale come servizio (nessun recupero); fuori orario la partecipazione è libera e non dà recupero.',
  FORMAZIONE: 'In orario di servizio nessun debito o credito; fuori orario le ore sono lavoro effettivo e spetta il recupero. Se hai timbrato tutta la giornata, non inserire le ore in orario: sono già contate.',
  DONAZIONE: 'Giornata intera di permesso retribuito il giorno della donazione (L. 219/2005, art. 8). Conserva il certificato del centro trasfusionale.',
  PBREVE: 'Massimo metà dell’orario giornaliero e 36 ore nell’anno scolastico; da recuperare di norma entro due mesi, d’accordo con il DSGA.',
  SCIOPERO: 'Nessun debito orario per le ore o il giorno di sciopero. L’eventuale trattenuta in busta paga la calcola la scuola.',
  FERIE_PREC: 'Solo annotazione: le ferie residue inserite in Profilo (+N) non cambiano da sole. Se vuoi aggiornarle, correggi il numero in Profilo.',
  CHIUSURA: 'Questa giornata era stata inserita come chiusura prefestiva, voce non più disponibile: scegli un’altra causale per cambiarla.'
}[t] || '');

export function apriGiorno(k) {
  const p = S.p, d = parseIso(k), g0 = S.m[k], piano = TU.carica(p.turni), turno = TU.turnoDelGiorno(piano, d), att = C.attesi(p, d);
  const st = { tipo: g0 && TIPI[g0.tipo] ? g0.tipo : 'PRESENZA', ints: intervalli(g0).map(i => [i[0], i[1]]), ore: g0 && g0.ore104 > 0 ? String(g0.ore104).replace('.', ',') : '',
    nota: g0 ? g0.nota : '', figlio: g0 ? g0.figlio : '' };
  const mo = modal('');
  const sheet = mo.el.querySelector('.sheet');
  const leggi = () => {
    const q = id => mo.el.querySelector('#' + id);
    if (q('g-ore')) st.ore = q('g-ore').value;
    if (q('g-nota')) st.nota = q('g-nota').value;
    if (q('g-fig')) st.figlio = q('g-fig').value;
    if (q('g-fuori')) st.figlio = q('g-fuori').checked ? 'FUORI' : 'SERVIZIO';
    st.ints = [...mo.el.querySelectorAll('.pt')].map(r => [nt(r.querySelector('.pa').value), nt(r.querySelector('.pb').value)]);
  };
  const disegna = () => {
    const c = causaleDi(st.tipo), sotto = c.tipi.filter(t => t !== 'P104H'), conOre = CON_ORE.has(st.tipo), conTimb = CON_TIMBRATURE.has(st.tipo);
    const nomi = (p.figli || '').split(',').map(x => x.trim()).filter(Boolean), fest = F.nome(d);
    const idxC = CAUSALI.findIndex(x => x === c);
    sheet.innerHTML = `
    <h2>${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}</h2>
    <div class="mu">Previsto: ${fh(att)}</div>
    ${fest ? `<div class="ko" style="font-size:13px;margin-top:4px">🎌 Giorno festivo: ${h(fest)}. È già segnato come festività: non serve inserire nulla.</div>` : ''}
    ${turno ? `<div class="mu" style="margin:6px 0">🗓️ Turno previsto: ${h(turno.nome)} (${TU.testo(turno)})</div>
      ${st.tipo === 'PRESENZA' && !st.ints.length ? '<button class="sec pic" id="g-turno">Compila dal turno</button>' : ''}` : ''}
    <label>Causale</label>
    <select id="g-caus">${CAUSALI.map((x, i) => `<option value="${i}"${i === idxC ? ' selected' : ''}>${h(x.nome)}</option>`).join('')}</select>
    ${sotto.length > 1 ? `<label>Tipo</label><select id="g-sub">${sotto.map(t => `<option value="${t}"${t === st.tipo ? ' selected' : ''}>${h(TIPI[t])}</option>`).join('')}</select>` : ''}
    ${conOre ? `<label>${etichettaOre(st.tipo)}</label><input id="g-ore" inputmode="decimal" value="${h(st.ore)}">` : ''}
    ${st.tipo === 'ASSEMBLEA' || st.tipo === 'FORMAZIONE' ? `<label class="ck"><input type="checkbox" id="g-fuori"${st.figlio === 'FUORI' ? ' checked' : ''}>Svolta fuori dall’orario di servizio</label>` : ''}
    ${suggerimento(st.tipo) ? `<div class="mu sm" style="margin-bottom:8px">${suggerimento(st.tipo)}</div>` : ''}
    ${conTimb ? `${st.ints.map((r, i) => `<div class="pt"><input class="pa" type="time" step="1" value="${h(r[0])}"><input class="pb" type="time" step="1" value="${h(r[1])}">
      <button class="link" data-del="${i}" style="color:var(--ko)">🗑</button></div>`).join('')}
      <button class="sec" id="g-add">+ Aggiungi orario</button><div class="sp"></div>` : ''}
    ${['CONG', 'MALFIGLIO', 'ADOZIONE'].includes(st.tipo) && nomi.length ? `<label>Figlio</label><select id="g-fig"><option value="">Scegli il figlio</option>${nomi.map(n => `<option${n === st.figlio ? ' selected' : ''}>${h(n)}</option>`).join('')}</select>` : ''}
    <label>Nota (facoltativa)</label><textarea id="g-nota">${h(st.nota)}</textarea>
    <button id="g-salva">Salva</button><div class="sp"></div>
    <div class="grid2"><button class="del" id="g-canc">Cancella</button><button class="sec" id="g-ann">Annulla</button></div>`;
    const q = id => sheet.querySelector('#' + id);
    q('g-caus').onchange = e => { leggi(); const cc = CAUSALI[+e.target.value]; if (!cc.tipi.includes(st.tipo)) st.tipo = cc.tipi[0]; disegna(); };
    if (q('g-sub')) q('g-sub').onchange = e => { leggi(); st.tipo = e.target.value; disegna(); };
    if (q('g-turno')) q('g-turno').onclick = () => { leggi(); st.ints = TU.intervalliTurno(turno).map(x => [x[0] + ':00', x[1] + ':00']); disegna(); };
    if (q('g-add')) q('g-add').onclick = () => { leggi(); st.ints.push(['', '']); disegna(); };
    sheet.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { leggi(); st.ints.splice(+b.dataset.del, 1); disegna(); });
    q('g-ann').onclick = mo.close;
    q('g-canc').onclick = async () => { if (!g0 || await conferma('Cancellare?', 'Vuoi cancellare questa giornata?', 'Cancella')) { eliminaGiornata(k); mo.close(); N.render(); } };
    q('g-salva').onclick = () => {
      leggi();
      const ore = Math.min(maxOre(st.tipo, att), Math.max(0, parseNum(st.ore) || 0)), gruppo104 = c.tipi.includes('P104');
      const tipoF = gruppo104 ? (ore > 0 ? 'P104H' : 'P104') : st.tipo;
      const timbr = serializza(st.ints.filter(i => i[0]));
      const figlio = ['CONG', 'MALFIGLIO', 'ADOZIONE'].includes(st.tipo) ? st.figlio : (st.tipo === 'ASSEMBLEA' || st.tipo === 'FORMAZIONE') ? (st.figlio === 'FUORI' ? 'FUORI' : 'SERVIZIO') : '';
      if (tipoF === 'PRESENZA' && !timbr && !st.nota.trim()) eliminaGiornata(k);
      else salvaGiornata({ data: k, tipo: tipoF, timbrature: CON_TIMBRATURE.has(st.tipo) ? timbr : '', ore104: CON_ORE.has(st.tipo) ? ore : 0, nota: st.nota.trim(), figlio });
      mo.close(); toast('Salvato'); N.render();
    };
  };
  disegna();
}
