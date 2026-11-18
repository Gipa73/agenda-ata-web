import { S, setP, allegatoSalva, allegatoLeggi, allegatoElimina } from './store.js';
import { iso, oggi, fmtData, parseIso, parseNum, GG, uid, parseData, diffGiorni, fh } from './util.js';
import * as TU from './turni.js';
import * as AP from './appuntamenti.js';
import * as AT from './attestati.js';
import * as CT from './contratti.js';
import { h, on, opts, val, chk, modal, toast, conferma, apri } from './ui.js';
import { N } from './nav.js';

const back = '<button class="link back" data-a="indietro">‹ Indietro</button>';
// ---------------------------------------------------------------- TURNI
const piano = () => TU.carica(S.p.turni);
const salvaPiano = p => setP({ turni: TU.serializza(p) });
export function turni() {
  const pi = piano();
  return `${back}<h1>🗓️ Turni di lavoro</h1>
  <div class="card"><h2>Settimana tipo</h2><p class="mu sm">Il turno che si ripete ogni settimana. Dove scegli “Orario standard” vale l’orario ingresso/uscita del Profilo.</p>
    ${[1, 2, 3, 4, 5, 6].map(i => `<div class="row"><span>${GG[i - 1]}</span><select class="t-sett" data-g="${i}" style="width:62%">${opts([['', 'Orario standard'], ['-', 'Libero'], ...pi.modelli.map(x => [x.id, `${x.nome} (${x.sigla})`])], pi.settimana[i] ?? '')}</select></div>`).join('')}</div>
  <div class="card"><h2>Modelli di turno</h2><div class="lista">${pi.modelli.map(x => `<div class="click" data-a="modTurno" data-id="${h(x.id)}"><span><b>${h(x.sigla)}</b> · ${h(x.nome)}<div class="mu sm">${TU.testo(x)}</div></span><b>›</b></div>`).join('')}</div>
    <div class="sp"></div><button class="sec" data-a="modTurno" data-id="">+ Nuovo turno</button></div>
  <div class="card"><h2>Eccezioni per data</h2>${Object.keys(pi.eccezioni).sort().length ? `<div class="lista">${Object.keys(pi.eccezioni).sort().map(k => {
    const x = pi.eccezioni[k], mo = pi.modelli.find(q => q.id === x);
    return `<div><span>${fmtData(parseIso(k))} · ${x === '-' ? 'Libero' : mo ? h(mo.nome) : h(x)}</span><button class="link" data-a="delEcc" data-k="${k}" style="color:var(--ko)">🗑</button></div>`;
  }).join('')}</div>` : '<div class="mu">Nessuna eccezione</div>'}
    <div class="sp"></div><button class="sec" data-a="addEcc">+ Aggiungi eccezione</button></div>
  <div class="card"><h2>Importa i turni del mese</h2><p class="mu sm">Righe tipo “11/11/2026;tardo”: data e turno (id, sigla o nome; “libero” per nessun turno).</p>
    <textarea id="t-csv" placeholder="02/11/2026;std&#10;06/11/2026;v1"></textarea><input type="file" id="t-file" accept=".csv,.txt" style="padding:8px">
    <button data-a="impTurni">Importa</button></div>`;
}
document.addEventListener('change', async e => {
  if (e.target.classList && e.target.classList.contains('t-sett')) {
    const pi = piano(), v = e.target.value; if (v === '') delete pi.settimana[e.target.dataset.g]; else pi.settimana[e.target.dataset.g] = v; salvaPiano(pi); toast('Salvato');
  }
  if (e.target.id === 't-file' && e.target.files[0]) { document.getElementById('t-csv').value = await e.target.files[0].text(); }
});
on('modTurno', el => {
  const pi = piano(), t = pi.modelli.find(x => x.id === el.dataset.id) || { id: '', nome: '', sigla: '', intervalli: '07:45-14:57' };
  const m = modal(`<h2>${t.id ? 'Modifica turno' : 'Nuovo turno'}</h2>
    <label>Nome</label><input id="m-nome" value="${h(t.nome)}"><label>Sigla (1-3 lettere)</label><input id="m-sigla" maxlength="3" value="${h(t.sigla)}">
    <label>Orari (es. 07:45-14:57 oppure 07:45-14:45;15:15-16:45)</label><input id="m-int" value="${h(t.intervalli)}">
    <button id="m-ok">Salva</button><div class="sp"></div>${t.id ? '<button class="del" id="m-del">Elimina turno</button><div class="sp"></div>' : ''}<button class="sec" id="m-no">Annulla</button>`);
  m.$('#m-no').onclick = m.close;
  m.$('#m-ok').onclick = () => {
    const ints = m.$('#m-int').value.trim(), nome = m.$('#m-nome').value.trim(), sigla = m.$('#m-sigla').value.trim();
    if (!nome || !sigla || !TU.valido(ints)) { toast('Controlla nome, sigla e orari (hh:mm-hh:mm)'); return; }
    const n = { id: t.id || uid().slice(0, 8), nome, sigla, intervalli: ints };
    pi.modelli = t.id ? pi.modelli.map(x => x.id === t.id ? n : x) : [...pi.modelli, n]; salvaPiano(pi); m.close(); N.render();
  };
  if (m.$('#m-del')) m.$('#m-del').onclick = () => { pi.modelli = pi.modelli.filter(x => x.id !== t.id); salvaPiano(pi); m.close(); N.render(); };
});
on('delEcc', el => { const pi = piano(); delete pi.eccezioni[el.dataset.k]; salvaPiano(pi); N.render(); });
on('addEcc', () => {
  const pi = piano();
  const m = modal(`<h2>Eccezione per data</h2><label>Data</label><input type="date" id="e-d" value="${iso(oggi())}"><label>Turno</label>
    <select id="e-t">${opts([['-', 'Libero'], ...pi.modelli.map(x => [x.id, `${x.nome} (${x.sigla})`])], '')}</select><button id="e-ok">Aggiungi</button><div class="sp"></div><button class="sec" id="e-no">Annulla</button>`);
  m.$('#e-no').onclick = m.close;
  m.$('#e-ok').onclick = () => { const d = m.$('#e-d').value; if (!d) return; pi.eccezioni[d] = m.$('#e-t').value; salvaPiano(pi); m.close(); N.render(); };
});
on('impTurni', () => {
  const [pi, n] = TU.importa(val('t-csv'), piano());
  if (!n) { toast('Nessun turno riconosciuto: servono righe con data e turno'); return; }
  salvaPiano(pi); toast(`Importati ${n} turni`); N.render();
});

// ---------------------------------------------------------------- APPUNTAMENTI
const salvaAp = l => setP({ appuntamenti: AP.serializza(l) });
export function appuntamenti() {
  const l = AP.carica(S.p.appuntamenti), ora = new Date();
  const riga = a => { const i = AP.istante(a); return `<div class="click" data-a="modAp" data-id="${h(a.id)}"><span><b>${h(a.titolo)}</b><div class="mu sm">${fmtData(parseIso(a.data))}${a.ora ? ' · ' + a.ora : ''}${a.luogo ? ' · ' + h(a.luogo) : ''}${a.avvisoMin >= 0 ? ' · 🔔 ' + AP.descrizioneAvviso(a.avvisoMin) : ''}</div></span><b>›</b></div>`; };
  const futuri = l.filter(a => { const i = AP.istante(a); return !i || i >= ora; }), passati = l.filter(a => { const i = AP.istante(a); return i && i < ora; });
  return `${back}<h1>📌 Appuntamenti</h1>
  <div class="banner">I promemoria compaiono dentro l’app quando la apri (su iPhone un sito installato non può notificare ad app chiusa).</div>
  <button data-a="modAp" data-id="">+ Nuovo appuntamento</button><div class="sp"></div>
  <div class="card"><h2>Prossimi</h2>${futuri.length ? `<div class="lista">${futuri.map(riga).join('')}</div>` : '<div class="mu">Nessun appuntamento</div>'}</div>
  ${passati.length ? `<div class="card"><h2>Passati</h2><div class="lista">${passati.slice(-10).reverse().map(riga).join('')}</div></div>` : ''}`;
}
on('modAp', el => {
  const l = AP.carica(S.p.appuntamenti), a = l.find(x => x.id === el.dataset.id) || { id: '', titolo: '', data: iso(oggi()), ora: '', luogo: '', avvisoMin: 60 };
  const m = modal(`<h2>${a.id ? 'Modifica appuntamento' : 'Nuovo appuntamento'}</h2>
    <label>Titolo</label><input id="a-t" value="${h(a.titolo)}"><label>Data</label><input type="date" id="a-d" value="${h(a.data)}">
    <label>Ora (facoltativa)</label><input type="time" id="a-o" value="${h(a.ora)}"><label>Luogo (facoltativo)</label><input id="a-l" value="${h(a.luogo)}">
    <label>Avviso</label><select id="a-a">${opts(AP.OPZIONI_AVVISO, a.avvisoMin)}</select>
    <button id="a-ok">Salva</button><div class="sp"></div>${a.id ? '<button class="del" id="a-del">Elimina</button><div class="sp"></div>' : ''}<button class="sec" id="a-no">Annulla</button>`);
  m.$('#a-no').onclick = m.close;
  m.$('#a-ok').onclick = () => {
    const n = { id: a.id || AP.nuovoId(), titolo: m.$('#a-t').value.trim(), data: m.$('#a-d').value, ora: m.$('#a-o').value, luogo: m.$('#a-l').value.trim(), avvisoMin: +m.$('#a-a').value };
    if (!n.titolo || !n.data) { toast('Inserisci titolo e data'); return; }
    salvaAp(a.id ? l.map(x => x.id === a.id ? n : x) : [...l, n]); m.close(); N.render();
  };
  if (m.$('#a-del')) m.$('#a-del').onclick = () => { salvaAp(l.filter(x => x.id !== a.id)); m.close(); N.render(); };
});

// ---------------------------------------------------------------- ATTESTATI
const colStato = s => ({ SCADUTO: 'ko', IN_SCADENZA: 'ko', VALIDO: 'ok', NON_SCADE: 'ok', DA_FARE: 'mu', DATA_MANCANTE: 'mu' }[s]);
export function attestati() {
  const l = AT.carica(S.p.attestati), cats = [...new Set(l.map(a => a.categoria))];
  return `${back}<h1>🎓 Attestati e formazione</h1>
  ${cats.map(c => `<div class="card"><h2>${h(c)}</h2>${l.filter(a => a.categoria === c).map(a => `
    <div style="padding:8px 0;border-bottom:1px solid var(--bd)"><label class="ck"><input type="checkbox" class="at-ok" data-id="${h(a.id)}"${a.ok ? ' checked' : ''}><b>${h(a.nome)}</b></label>
      <div class="mu sm">${h(a.descrizione)}</div>
      ${a.ok ? `<div class="grid2"><div><label>Conseguito il (gg/mm/aaaa)</label><input class="at-d" data-id="${h(a.id)}" value="${h(a.data)}" inputmode="numeric" placeholder="gg/mm/aaaa"></div>
        <div><label>Validità (anni, 0 = non scade)</label><input class="at-a" data-id="${h(a.id)}" value="${a.anni}" inputmode="numeric"></div></div>` : ''}
      <div class="${colStato(AT.stato(a))} sm"><b>${AT.testoStato(a)}</b></div>
      ${a.personalizzato ? `<button class="link" data-a="delAt" data-id="${h(a.id)}" style="color:var(--ko)">Elimina</button>` : ''}</div>`).join('')}</div>`).join('')}
  <button class="sec" data-a="addAt">+ Aggiungi un altro attestato</button>`;
}
function modAt(id, f) { const l = AT.carica(S.p.attestati), a = l.find(x => x.id === id); if (!a) return; f(a); setP({ attestati: AT.serializza(l) }); }
document.addEventListener('change', e => {
  const t = e.target, id = t.dataset && t.dataset.id; if (!id) return;
  if (t.classList.contains('at-ok')) { modAt(id, a => { a.ok = t.checked; }); N.render(); }
  if (t.classList.contains('at-d')) { modAt(id, a => { a.data = t.value.trim(); }); N.render(); }
  if (t.classList.contains('at-a')) { modAt(id, a => { a.anni = Math.max(0, parseInt(t.value) || 0); }); N.render(); }
});
on('addAt', () => {
  const m = modal(`<h2>Nuovo attestato</h2><label>Nome</label><input id="n-n"><label>Validità (anni, 0 = non scade)</label><input id="n-a" value="0" inputmode="numeric"><button id="n-ok">Aggiungi</button><div class="sp"></div><button class="sec" id="n-no">Annulla</button>`);
  m.$('#n-no').onclick = m.close;
  m.$('#n-ok').onclick = () => {
    const n = m.$('#n-n').value.trim(); if (!n) return;
    const l = AT.carica(S.p.attestati); l.push({ id: 'c' + Date.now(), nome: n, categoria: 'Altri attestati', descrizione: 'Attestato personalizzato', anni: parseInt(m.$('#n-a').value) || 0, ok: true, data: '', personalizzato: true });
    setP({ attestati: AT.serializza(l) }); m.close(); N.render();
  };
});
on('delAt', async el => { if (await conferma('Eliminare?', 'Vuoi eliminare questo attestato?', 'Elimina')) { const l = AT.carica(S.p.attestati).filter(x => x.id !== el.dataset.id); setP({ attestati: AT.serializza(l) }); N.render(); } });

// ---------------------------------------------------------------- CONTRATTI E PUNTEGGIO
let dataRif = null;
export function contratti() {
  const l = CT.carica(S.p.contratti), oggiD = oggi(), rif = dataRif || oggiD, ro = CT.calcola(l, oggiD), rd = CT.calcola(l, rif);
  return `${back}<h1>🏅 Contratti e punteggio</h1>
  <p class="mu sm">Carica i contratti di servizio (supplenze): l’app calcola il punteggio maturato alla data che scegli e a oggi. È un calcolo indicativo per le graduatorie ATA: 0,50 punti per mese o frazione superiore a 15 giorni nello stesso profilo, fino a 6 punti per anno scolastico. I valori si possono modificare per ogni contratto.</p>
  <div class="card"><div class="mu">Punteggio maturato</div><div class="big">A oggi: ${CT.formato(ro.totale)} punti</div>
    <label>Alla data</label><input type="date" id="c-rif" value="${iso(rif)}"><b>${CT.formato(rd.totale)} punti alla data scelta</b>
    ${rd.anni.map(a => `<div class="mu sm">• ${a.anno}: ${a.giorni} giorni · ${a.mesi} mesi · ${CT.formato(a.punti)} punti</div>`).join('') || '<div class="mu sm">Nessun servizio maturato a questa data.</div>'}</div>
  <button data-a="modCt" data-id="">+ Carica contratto</button><div class="sp"></div>
  <h2>Contratti caricati</h2>${l.length ? l.map(c => {
    const di = parseIso(c.inizio), df = parseIso(c.fine), pc = CT.calcola([c], rif);
    return `<div class="card click" data-a="modCt" data-id="${h(c.id)}"><b>${isNaN(di) ? h(c.inizio) : fmtData(di)} → ${isNaN(df) ? h(c.fine) : fmtData(df)}</b>
      <div class="mu sm">${c.profilo === 'stesso' ? 'Stesso profilo' : 'Altro servizio'} · ${c.statale ? 'scuola statale' : 'non statale'}${c.scuola ? ' · ' + h(c.scuola) : ''}</div>
      <div class="mu sm">${CT.giorni(c, rif)} giorni alla data scelta · ${CT.formato(pc.totale)} punti</div>
      ${c.file ? `<button class="link" data-a="apriAll" data-id="${h(c.id)}">📎 ${h(c.nomeFile)}</button>` : ''}</div>`;
  }).join('') : '<div class="mu">Nessun contratto: premi “Carica contratto”.</div>'}
  <div class="card"><h2>Importa contratti da file</h2><p class="mu sm">Un file CSV con una riga per contratto, per esempio 15/09/2025;30/06/2026;stesso;statale;Nome scuola (aggiungi “altro” per altro servizio o “non statale”).</p>
    <input type="file" id="c-file" accept=".csv,.txt" style="padding:8px"><div id="c-msg" class="mu sm"></div></div>`;
}
document.addEventListener('change', async e => {
  if (e.target.id === 'c-rif') { dataRif = e.target.value ? parseIso(e.target.value) : null; N.render(); }
  if (e.target.id === 'c-file' && e.target.files[0]) {
    const nuovi = CT.importa(await e.target.files[0].text());
    if (nuovi.length) { setP({ contratti: CT.serializza([...CT.carica(S.p.contratti), ...nuovi]) }); toast(`Importati ${nuovi.length} contratti`); N.render(); }
    else document.getElementById('c-msg').textContent = 'Non ho trovato contratti nel file: servono due date per riga (inizio e fine).';
  }
});
on('apriAll', async el => {
  const c = CT.carica(S.p.contratti).find(x => x.id === el.dataset.id); if (!c) return;
  const r = await allegatoLeggi(c.file);
  if (!r) { toast('Allegato non trovato'); return; }
  const url = URL.createObjectURL(r.blob); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60000);
});
on('modCt', el => {
  const l = CT.carica(S.p.contratti), c0 = l.find(x => x.id === el.dataset.id);
  const c = c0 || { id: 'c' + Date.now(), inizio: iso(oggi()), fine: iso(oggi()), profilo: 'stesso', statale: true, scuola: '', puntiMese: 0.5, maxAnno: 6, file: '', nomeFile: '', mime: '' };
  let file = null;
  const m = modal(`<h2>${c0 ? 'Modifica contratto' : 'Carica contratto'}</h2>
    <label>Inizio</label><input type="date" id="k-i" value="${h(c.inizio)}"><label>Fine</label><input type="date" id="k-f" value="${h(c.fine)}">
    <div id="k-err" class="ko sm"></div>
    <label>Tipo di servizio</label><select id="k-p">${opts([['stesso', 'Stesso profilo'], ['altro', 'Altro servizio']], c.profilo)}</select>
    <label class="ck"><input type="checkbox" id="k-s"${c.statale ? ' checked' : ''}>Scuola statale</label>
    <label>Scuola o ente (facoltativo)</label><input id="k-n" value="${h(c.scuola)}">
    <div class="grid2"><div><label>Punti al mese</label><input id="k-m" inputmode="decimal" value="${String(c.puntiMese).replace('.', ',')}"></div><div><label>Max per anno</label><input id="k-x" inputmode="decimal" value="${String(c.maxAnno).replace('.', ',')}"></div></div>
    <div class="mu sm">I valori proposti sono quelli indicativi per il tipo di servizio: controlla la tabella del bando e correggili se serve.</div><div class="sp"></div>
    <label>Allega il contratto (PDF o foto)</label><input type="file" id="k-file" accept="application/pdf,image/*" style="padding:8px"><div id="k-fn" class="mu sm">${c.file ? '📎 ' + h(c.nomeFile) : ''}</div>
    <button id="k-ok">Salva</button><div class="sp"></div>${c0 ? '<button class="del" id="k-del">Elimina</button><div class="sp"></div>' : ''}<button class="sec" id="k-no">Annulla</button>`);
  const preset = () => { const [a, b] = CT.preset(m.$('#k-p').value, m.$('#k-s').checked); m.$('#k-m').value = String(a).replace('.', ','); m.$('#k-x').value = String(b).replace('.', ','); };
  m.$('#k-p').onchange = preset; m.$('#k-s').onchange = preset;
  m.$('#k-file').onchange = e => { file = e.target.files[0] || null; m.$('#k-fn').textContent = file ? '📎 ' + file.name : ''; };
  m.$('#k-no').onclick = m.close;
  m.$('#k-ok').onclick = async () => {
    const i = m.$('#k-i').value, f = m.$('#k-f').value;
    if (!i || !f || f < i) { m.$('#k-err').textContent = 'La data di fine è prima di quella di inizio.'; return; }
    const n = { ...c, inizio: i, fine: f, profilo: m.$('#k-p').value, statale: m.$('#k-s').checked, scuola: m.$('#k-n').value.trim(),
      puntiMese: parseNum(m.$('#k-m').value) ?? 0.5, maxAnno: parseNum(m.$('#k-x').value) ?? 6 };
    if (file) { try { await allegatoSalva(n.id, file); n.file = n.id; n.nomeFile = file.name; n.mime = file.type; } catch (e) { toast('Allegato non salvato'); } }
    setP({ contratti: CT.serializza(c0 ? l.map(x => x.id === c.id ? n : x) : [...l, n]) }); m.close(); N.render();
  };
  if (m.$('#k-del')) m.$('#k-del').onclick = async () => { if (c.file) { try { await allegatoElimina(c.file); } catch (e) { } } setP({ contratti: CT.serializza(l.filter(x => x.id !== c.id)) }); m.close(); N.render(); };
});
