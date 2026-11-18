import { S, timbra } from './store.js';
import { iso, oggi, mk, sec, orario, fh, fmt, fmtC, giorniStr, fmtData, num, pad, parseIso, dec } from './util.js';
import * as C from './calc.js';
import * as TU from './turni.js';
import * as EV from './evento.js';
import * as AP from './appuntamenti.js';
import * as AT from './attestati.js';
import * as CT from './contratti.js';
import { intervalli } from './model.js';
import { h, on, toast } from './ui.js';
import { N } from './nav.js';

const R = 70, CIRC = 2 * Math.PI * R;
/** Secondi lavorati oggi, compreso l'intervallo ancora aperto (ora corrente). */
function lavoratiLive(g) {
  const n = new Date(), adesso = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds();
  return intervalli(g).reduce((a, [x, y]) => a + (x ? Math.max(0, (y ? sec(y) : adesso) - sec(x)) : 0), 0);
}
function statoOggi(p, g, att) {
  const ints = intervalli(g), aperto = ints.length && !ints[ints.length - 1][1], lav = g ? lavoratiLive(g) : 0;
  let testo, uscita = '';
  if (!g || !ints.length) testo = att === 0 ? 'giorno libero' : 'non hai ancora timbrato';
  else if (aperto) {
    const prima = ints.slice(0, -1).reduce((a, [x, y]) => a + (y ? sec(y) - sec(x) : 0), 0);
    testo = 'in servizio';
    if (att > 0) uscita = `Uscita prevista ${orario(sec(ints[ints.length - 1][0]) + Math.max(0, att - prima))}`;
  } else testo = (att > 0 && lav >= att) ? 'giornata completata 🎉' : (att > 0 ? `mancano ${fh(Math.max(0, att - lav))}` : 'giornata registrata');
  return { lav, testo, uscita, aperto: !!aperto, frac: att > 0 ? Math.min(1, lav / att) : (lav > 0 ? 1 : 0) };
}
/** Aggiorna ogni secondo anello e ore (solo se la schermata Home è aperta). */
export function tickHome() {
  const el = document.getElementById('oreOggi'); if (!el) return;
  const od = oggi(), g = S.m[iso(od)], att = C.attesi(S.p, od), st = statoOggi(S.p, g, att);
  el.textContent = fh(st.lav);
  document.getElementById('statoOggi').textContent = st.testo;
  document.getElementById('uscitaPrev').textContent = st.uscita;
  const a = document.getElementById('anello'); if (a) a.setAttribute('stroke-dasharray', `${st.frac * CIRC} ${CIRC}`);
}
export function confetti() {
  const col = ['#ff7ab8', '#7c5cff', '#16a870', '#f5a524', '#3b8cf0'];
  for (let i = 0; i < 46; i++) {
    const c = document.createElement('i'); c.className = 'conf';
    c.style.cssText = `left:${Math.random() * 100}vw;background:${col[i % 5]};animation-delay:${Math.random() * .5}s;border-radius:${i % 2 ? 50 : 2}px`;
    document.body.appendChild(c); setTimeout(() => c.remove(), 2600);
  }
}
on('timbra', () => {
  const od = oggi(), prima = S.m[iso(od)], apertoPrima = prima && intervalli(prima).some(i => !i[1]);
  const hh = timbra(); toast(`Timbrato alle ${hh}`);
  const g = S.m[iso(od)], att = C.attesi(S.p, od);
  if (apertoPrima && att > 0 && lavoratiLive(g) >= att) confetti();
  N.render();
});
on('vai', el => N.vai(el.dataset.v, el.dataset.push === '1'));

export function home() {
  const p = S.p, m = S.m, od = oggi(), k = iso(od), g = m[k], hr = new Date().getHours();
  const piano = TU.carica(p.turni), inCorso = C.giornataInCorso(p, m, od, piano);
  const sm = C.saldoMese(p, m, od.getFullYear(), od.getMonth() + 1, inCorso), banca = C.bancaOre(p, m, inCorso);
  const att = C.attesi(p, od), st = statoOggi(p, g, att), ints = intervalli(g);
  const saluto = hr < 12 ? 'Buongiorno' : hr < 18 ? 'Buon pomeriggio' : 'Buonasera', em = hr < 12 ? '☀️' : hr < 18 ? '🌤️' : '🌙';
  const msg = sm > 0 ? `Questo mese sei in credito di ${fmtC(sm)} 🎉` : sm < 0 ? `Questo mese ti mancano ${fmtC(-sm)}: recuperi con calma 💪` : 'Sei in perfetto equilibrio ✨';
  const tu = TU.turnoDelGiorno(piano, od);
  // avvisi dentro l'app (iPhone non consente notifiche ad app chiusa)
  let avviso = '';
  if (p.rem && att > 0) {
    const prev = TU.intervalliGiorno(p, piano, od), n = new Date(), ora = n.getHours() * 3600 + n.getMinutes() * 60;
    if (!ints.length && prev.length && ora >= sec(prev[0][0] + ':00') && ora < sec(prev[0][0] + ':00') + 5400) avviso = `⏰ Ingresso previsto alle ${prev[0][0]}: ricordati di timbrare.`;
    else if (st.aperto && prev[ints.length - 1] && ora >= sec(prev[ints.length - 1][1] + ':00')) avviso = `🏁 Puoi timbrare l’uscita (prevista alle ${prev[ints.length - 1][1]}).`;
  }
  const ora0 = new Date(), promemoria = AP.carica(p.appuntamenti).filter(a => { const q = AP.quandoAvviso(a), i = AP.istante(a); return q && i && q <= ora0 && i >= new Date(ora0.getTime() - 3600000); });
  const appt = AP.carica(p.appuntamenti).filter(a => { const i = AP.istante(a); return i && i >= new Date() && i < new Date(Date.now() + 14 * 86400000); }).slice(0, 3);
  const attL = AT.carica(p.attestati), sc = attL.filter(a => AT.stato(a) === 'SCADUTO').length, ins = attL.filter(a => AT.stato(a) === 'IN_SCADENZA').length;
  const fat = C.fattoreFerie(p), legali = C.ferieSpettanti(p) - C.contaFerie(p, m, od.getFullYear()) * fat, rim = giorniStr(legali / fat);
  const ptContr = CT.carica(p.contratti), pt = CT.calcola(ptContr, od).totale;
  const btn = st.aperto ? '🏁 Timbra uscita' : (ints.length ? '🔁 Timbra rientro' : '☀️ Timbra ingresso');
  return `
  <div class="hero"><div class="em">${em}</div><div><div class="hi">${saluto}${p.nome ? ', ' + h(p.nome) : ''}!</div>
    <div class="mu2" style="font-weight:700">${h(EV.testo(p, m, od, piano))}</div><div class="mu2" style="font-size:12px">${msg}</div></div></div>
  ${avviso ? `<div class="banner warn">${avviso}</div>` : ''}
  ${promemoria.map(a => `<div class="banner warn">🔔 <b>${h(a.titolo)}</b>&nbsp;· ${fmtData(parseIso(a.data))}${a.ora ? ' alle ' + a.ora : ''}${a.luogo ? ' · ' + h(a.luogo) : ''}</div>`).join('')}
  <div class="card"><div class="mu">Oggi · ${od.getDate()} ${['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'][od.getMonth()]} ${od.getFullYear()}</div>
    <div class="ringw"><svg width="170" height="170" viewBox="0 0 170 170"><circle cx="85" cy="85" r="${R}" fill="none" stroke="var(--bd)" stroke-width="14"/>
      <circle id="anello" cx="85" cy="85" r="${R}" fill="none" stroke="var(--pr)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${st.frac * CIRC} ${CIRC}"/></svg>
      <div class="c"><b id="oreOggi">${fh(st.lav)}</b><small id="statoOggi">${st.testo}</small><small>Previsto ${fh(att)}</small></div></div>
    <div class="mu" id="uscitaPrev" style="text-align:center;min-height:18px">${st.uscita}</div>
    ${ints.length ? `<div class="mu" style="margin:6px 0">${ints.map(i => `${i[0]} → ${i[1] || '…'}`).join(' · ')}</div>` : '<div class="mu" style="margin:6px 0">Nessuna timbratura</div>'}
    <button class="cta" data-a="timbra">${btn}</button></div>
  <div class="grid2">
    <div class="card"><div class="mu">⏱️ Saldo mese</div><div class="big ${sm >= 0 ? 'ok' : 'ko'}">${fmt(sm)}</div>${inCorso ? '<div class="mu sm">si aggiorna a fine giornata</div>' : ''}</div>
    <div class="card"><div class="mu">🏦 Banca ore</div><div class="big ${banca >= 0 ? 'ok' : 'ko'}">${fmt(banca)}</div>
      ${p.oreResidue ? `<div class="mu sm">incl. residuo anno prec.: ${fmt(Math.round(p.oreResidue * 3600))}</div>` : ''}${inCorso ? '<div class="mu sm">si aggiorna a fine giornata</div>' : ''}</div></div>
  ${tu ? `<div class="card click" data-a="vai" data-v="turni" data-push="1"><div class="mu">🗓️ Turno di oggi</div><b>${h(tu.nome)}</b><div class="mu">${TU.testo(tu)}</div></div>` : ''}
  <div class="card click" data-a="vai" data-v="appuntamenti" data-push="1"><div class="mu">📌 Appuntamenti</div>${appt.length
    ? appt.map(a => `<div><b>${h(a.titolo)}</b> <span class="mu">${fmtData(parseIso(a.data))}${a.ora ? ' · ' + a.ora : ''}</span></div>`).join('') : '<b>Nessuno: tocca per aggiungerne uno</b>'}</div>
  <div class="card click" data-a="vai" data-v="contratti" data-push="1"><div class="mu">🏅 Punteggio di servizio</div>${ptContr.length
    ? `<b>${CT.formato(pt)} punti maturati a oggi</b>` : '<b>Carica i tuoi contratti per calcolare il punteggio</b>'}</div>
  ${p.contributoFatto ? '' : `<div class="card caffe" data-a="caffe"><div style="font-size:30px">☕🍕</div><div><b>Offrimi un caffè o una pizza</b><span class="sm">È gratuita e lo resterà. Se ti è utile, un caffè (2 €) o una pizza (5 €) la tengono viva.</span></div></div>`}
  <div class="card click" data-a="vai" data-v="attestati" data-push="1"><div class="mu">🎓 Attestati e formazione</div>
    <b class="${sc ? 'ko' : ins ? '' : 'ok'}">${sc} scaduti · ${ins} in scadenza</b></div>
  <div class="card click" data-a="vai" data-v="ferie"><div class="mu">🏖️ Ferie rimanenti ${od.getFullYear()}</div>
    <div class="row" style="justify-content:flex-start;gap:12px;align-items:baseline"><span class="big">${rim} giorni</span>${p.residue ? `<span class="big pr">+${p.residue}</span>` : ''}</div>
    ${p.residue ? `<div class="mu sm">+${p.residue} = ferie dell’anno precedente, come inserite in Profilo</div>` : ''}
    ${fat > 1 ? `<div class="mu sm">monte ferie: ${num(legali)} (ogni giorno scala 1,2)</div>` : ''}</div>`;
}
