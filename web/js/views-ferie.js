import { S } from './store.js';
import { iso, oggi, fmtData, giorniStr, num, plusMonths, fh, fmt, dec, MESI, parseIso, diffGiorni } from './util.js';
import * as C from './calc.js';
import { labelTipo } from './model.js';
import { h, barra } from './ui.js';

export function ferie() {
  const p = S.p, m = S.m, od = oggi(), y = od.getFullYear(), fat = C.fattoreFerie(p), spett = C.ferieSpettanti(p);
  const g = C.contaFerie(p, m, y), w = C.finestraFerie(p, y);
  const prog = Object.values(m).filter(x => x.tipo === 'FERIE' && x.data > iso(od) && x.data >= w[0] && x.data <= w[1]).length;
  const rim = giorniStr((spett - g * fat) / fat), plus = p.residue ? ` <span class="pr">+${p.residue}</span>` : '';
  let sc = '';
  if (p.residue > 0) {
    const s = C.scadenzaResidue(p, y);
    sc = od <= s ? `<div class="banner warn">⏳ Ferie residue (+${p.residue}) da usare entro il ${fmtData(s)}: ${num(C.residueRimaste(p))} giorni</div>`
      : `<div class="mu sm">Le ferie residue (+${p.residue}) andavano usate entro il ${fmtData(s)}.</div>`;
  }
  const fam = C.conta(m, 'FAM', y), perm = C.conta(m, 'PERMESSO', y);
  const brevi = C.permessiBrevi(p, m), oreBrevi = C.oreAnnoScolastico(m, 'PBREVE'), oreAss = C.oreAnnoScolastico(m, 'ASSEMBLEA');
  const cred = p.bancaMesi > 0 ? C.creditiResidui(p, m) : [];
  const nomi = (p.figli || '').split(',').map(x => x.trim()).filter(Boolean);
  const congedi = C.CONGEDI_FAMILIARI.map(([t, lim, anno]) => {
    const n = anno ? C.conta(m, t, y) : C.contaTotale(m, t);
    return n || (t === 'PATERNITA' && p.cong) ? `<div><span>${h(labelTipo(t))}</span><b>${n}${lim ? ' / ' + lim : ''} gg</b></div>` : '';
  }).join('');
  const parentali = p.cong ? (nomi.length ? nomi : ['']).map(nm => {
    const n = Object.values(m).filter(x => x.tipo === 'CONG' && (nm === '' || x.figlio === nm)).length;
    return `<div><span>Congedo parentale${nm ? ' · ' + h(nm) : ''}</span><b>${n} / ${p.congMax} gg</b></div>`;
  }).join('') : '';
  return `
  <h1>🏖️ Ferie e permessi</h1>
  <div class="card"><h2>Ferie ${y}</h2>
    <div class="big">${rim} giorni${plus}</div>
    <div class="mu">Spettanti ${spett}${p.residue ? ` <span class="pr">+${p.residue}</span>` : ''} · Godute ${g - prog} · Programmate ${prog}</div>
    ${p.residue ? `<div class="mu sm">Il +${p.residue} sono le ferie dell’anno precedente, come inserite in Profilo: restano invariate (giorni segnati in Agenda come “Ferie anno precedente”: ${C.contaTotale(m, 'FERIE_PREC')}).</div>` : ''}
    ${barra(g * fat, spett)}
    ${fat > 1 ? `<div class="mu sm">Settimana articolata su 5 giorni: ogni giorno di ferie vale 1,2 (giorni fruibili: ${giorniStr(spett / fat)}).</div>` : ''}
    ${p.determinato ? `<div class="mu sm">Contratto a termine: ${C.mesiServizio(p)} mesi di servizio (le frazioni oltre 15 giorni contano come mese intero), ferie in dodicesimi.</div>` : ''}
  </div>${sc}
  <div class="card"><h2>Festività soppresse</h2><b>${C.festSoppresse(p) - C.contaFestSoppresse(m, y)} rimanenti su ${C.festSoppresse(p)}</b></div>
  <div class="card"><h2>Permessi e assenze ${y}</h2><div class="lista">
    <div><span>Permessi motivi personali/familiari</span><b>${perm}${p.permMax ? ' / ' + p.permMax : ''} gg</b></div>
    <div><span>Malattia</span><b>${C.conta(m, 'MALATTIA', y)} gg</b></div>
    <div><span>Riposi compensativi</span><b>${C.conta(m, 'RECUPERO', y)} gg</b></div>
    ${p.fam ? `<div><span>Ferie per motivi familiari</span><b>${fam} / ${p.famMax} gg</b></div>` : ''}
    ${p.f104 ? `<div><span>Permessi L. 104 (giorni · ore del mese)</span><b>${C.conta(m, 'P104', y)} gg · ${num(C.ore104Mese(m, y, od.getMonth() + 1))} h</b></div>` : ''}
    <div><span>Assemblee sindacali (anno scolastico)</span><b>${num(oreAss)} / 10 h</b></div>
    <div><span>Permessi brevi (anno scolastico)</span><b>${num(oreBrevi)} / 36 h</b></div></div></div>
  ${brevi.length ? `<div class="card"><h2>Permessi brevi da recuperare</h2><div class="lista">${brevi.map(b => {
    const resto = b.dovuto - b.recuperato, scad = b.scadenza < od && resto > 0;
    return `<div><span>${fmtData(b.data)} · ${fh(b.dovuto)}</span><b class="${resto <= 0 ? 'ok' : scad ? 'ko' : ''}">${resto <= 0 ? 'recuperato ✓' : `mancano ${fh(resto)} · entro ${fmtData(b.scadenza)}`}</b></div>`;
  }).join('')}</div></div>` : ''}
  ${(congedi || parentali) ? `<div class="card"><h2>Congedi e permessi familiari</h2><div class="lista">${parentali}${congedi}</div>
    <div class="mu sm">Limiti indicativi (CCNL e D.Lgs. 151/2001): verifica sempre con la segreteria.</div></div>` : ''}
  ${cred.length ? `<div class="card"><h2>Crediti orari da recuperare</h2><div class="mu sm">Validità: ${p.bancaMesi} mesi dalla maturazione.</div><div class="lista">${cred.map(([d, s]) => {
    const sc2 = plusMonths(d, p.bancaMesi), gg = diffGiorni(od, sc2);
    return `<div><span>${fmtData(d)} · ${fh(s)}</span><b class="${gg < 0 ? 'ko' : gg < 30 ? '' : 'ok'}">${gg < 0 ? 'scaduto' : 'entro ' + fmtData(sc2)}</b></div>`;
  }).join('')}</div></div>` : ''}`;
}
