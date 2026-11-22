import { S, setP, importaGiornate, resetGiornate, salvaE, salvaP } from './store.js';
import { iso, oggi, parseNum, nt, hms, dec, pad, GG } from './util.js';
import { profiloVuoto } from './model.js';
import { h, on, opts, val, chk, modal, toast, conferma, chiediPassword, scarica, apri, applicaTema, TEMI, dialogo } from './ui.js';
import { N } from './nav.js';
import * as C from './calc.js';
import * as IM from './importer.js';
import { cifra } from './crypto.js';
import { VERSIONE, EMAIL, COPYRIGHT, TESTO_PRIVACY, statAttive, STAT } from './config.js';

const RUOLI = ['Collaboratore Scolastico', 'Assistente Amministrativo', 'Assistente Tecnico', 'Cuoco', 'Guardarobiere', 'Infermiere', 'Addetto Azienda Agraria', 'Altro'];
const hv = x => h(x ?? '');
const campo = (id, et, v, extra = '') => `<label for="${id}">${et}</label><input id="${id}" value="${hv(v)}" ${extra}>`;
const num = (id, et, v) => campo(id, et, v === '' ? '' : String(v).replace('.', ','), 'inputmode="decimal"');
const sw = (id, et, v) => `<label class="ck"><input type="checkbox" id="${id}"${v ? ' checked' : ''}>${et}</label>`;
const gset = s => new Set(String(s || '').split(',').map(x => parseInt(x)).filter(x => x > 0));

export function profilo(primo = false) {
  const p = S.p, gl = gset(p.giorniLav), gr = gset(p.giorniRientro), og = String(p.oreGiorno || '').split(',');
  return `
  ${primo ? '<h1>👋 Il tuo profilo</h1><p class="mu">Bastano pochi dati: puoi cambiarli quando vuoi.</p>' : '<h1>⚙️ Profilo</h1>'}
  <div class="card"><h2>Anagrafica</h2>
    ${campo('f-nome', 'Nome', p.nome, 'autocomplete="given-name"')}${campo('f-cognome', 'Cognome', p.cognome, 'autocomplete="family-name"')}
    <label>Profilo professionale</label><select id="f-ruolo">${opts(RUOLI.map(x => [x, x]), p.ruolo)}</select>
    ${campo('f-scuola', 'Scuola', p.scuola)}${campo('f-plesso', 'Plesso (facoltativo)', p.plesso)}
    ${primo ? '' : campo('f-email', 'E-mail della segreteria (per inviare il cartellino)', p.emailSegreteria, 'type="email" inputmode="email"')}</div>
  <div class="card"><h2>Orario di lavoro</h2>
    <label>Tipo di orario</label><select id="f-tipo">${opts([['pieno', 'Tempo pieno'], ['orizz', 'Part-time orizzontale'], ['vert', 'Part-time verticale'], ['pers', 'Personalizzato']], p.tipoOrario)}</select>
    ${num('f-ore', 'Ore settimanali', p.ore)}
    <label>Giorni di lavoro in settimana (tempo pieno / orizzontale)</label><select id="f-giorni">${opts([[5, '5 giorni (settimana corta)'], [6, '6 giorni']], p.giorni)}</select>
    <label>Giorni lavorati (part-time verticale)</label><div class="chips">${[1, 2, 3, 4, 5, 6].map(i => `<label><input type="checkbox" class="f-gl" value="${i}"${gl.has(i) ? ' checked' : ''}>${GG[i - 1]}</label>`).join('')}</div><div class="sp"></div>
    <label>Ore per giorno (personalizzato, da lunedì a sabato)</label><div class="chips">${[0, 1, 2, 3, 4, 5].map(i => `<input class="f-og" style="width:64px" inputmode="decimal" placeholder="${GG[i]}" value="${hv(og[i] || '')}">`).join('')}</div></div>
  <div class="card"><h2>Ferie e contratto</h2>
    ${sw('f-meno3', 'Meno di 3 anni di servizio (30 giorni di ferie invece di 32)', p.menoDi3Anni)}
    ${sw('f-det', 'Contratto a tempo determinato', p.determinato)}
    ${campo('f-inizioc', 'Inizio contratto (gg/mm/aaaa)', p.inizioContratto, 'inputmode="numeric" placeholder="15/09/2026"')}
    <label>Scadenza del contratto</label><select id="f-scadc">${opts([['30giu', '30 giugno'], ['31ago', '31 agosto'], ['altra', 'Altra data']], p.scadenzaContratto)}</select>
    ${campo('f-finec', 'Fine contratto, se altra data (gg/mm/aaaa)', p.fineContratto, 'inputmode="numeric"')}
    ${num('f-ferieman', 'Ferie spettanti manuali (vuoto = calcolo automatico)', p.ferieManuali >= 0 ? p.ferieManuali : '')}
    ${num('f-festsopp', 'Giorni di festività soppresse (CCNL: 4)', p.festSoppresse)}</div>
  <div class="card"><h2>Residui dell’anno precedente</h2>
    ${num('f-residue', 'Ferie residue anno precedente (giorni, mostrati come +N)', p.residue)}
    ${num('f-oreres', 'Ore residue anno precedente (banca ore, es. 12,5)', p.oreResidue || '')}
    ${campo('f-scadres', 'Scadenza ferie residue (gg/mm)', p.scadResidue)}
    ${num('f-bancamesi', 'Validità dei crediti orari in mesi (0 = senza scadenza)', p.bancaMesi)}</div>
  ${primo ? '' : `
  <div class="card"><h2>Permessi e familiari</h2>
    ${sw('f-fam', 'Ferie per motivi familiari/personali (6 giorni)', p.fam)}${num('f-fammax', 'Giorni massimi', p.famMax)}
    ${num('f-permmax', 'Permessi personali retribuiti (giorni all’anno scolastico)', p.permMax)}
    ${sw('f-104', 'Permessi L. 104', p.f104)}${sw('f-cong', 'Congedo parentale', p.cong)}${num('f-congmax', 'Giorni di congedo per figlio', p.congMax)}
    ${campo('f-figli', 'Figli (nomi separati da virgola)', p.figli)}</div>
  <div class="card"><h2>Avvisi nell’app</h2><p class="mu sm">Su iPhone un sito installato non può inviare notifiche ad app chiusa: gli avvisi compaiono in Home quando apri l’app.</p>
    ${sw('f-rem', 'Mostra gli avvisi di ingresso e uscita', p.rem)}
    <div class="grid2"><div><label>Ingresso</label><input id="f-remin" type="time" step="1" value="${hv(p.remIn)}"></div><div><label>Uscita</label><input id="f-remout" type="time" step="1" value="${hv(p.remOut)}"></div></div>
    <label>Giorni con rientro pomeridiano</label><div class="chips">${[1, 2, 3, 4, 5].map(i => `<label><input type="checkbox" class="f-gr" value="${i}"${gr.has(i) ? ' checked' : ''}>${GG[i - 1]}</label>`).join('')}</div><div class="sp"></div>
    <div class="grid2"><div><label>Rientro</label><input id="f-rin" type="time" step="1" value="${hv(p.rientroIn)}"></div><div><label>Uscita finale</label><input id="f-rout" type="time" step="1" value="${hv(p.rientroOut)}"></div></div></div>
  <div class="card"><h2>Aspetto</h2><label>Colori</label><select id="f-tema">${opts(Object.keys(TEMI).map(x => [x, x[0].toUpperCase() + x.slice(1)]), p.tema)}</select>
    <label>Modalità</label><select id="f-modo">${opts([['auto', 'Automatica'], ['chiaro', 'Chiara'], ['scuro', 'Scura']], p.modoScuro)}</select></div>`}
  <button class="cta" data-a="salvaProfilo" data-primo="${primo ? 1 : 0}">${primo ? 'Inizia' : 'Salva'}</button>
  ${primo ? '' : `<div class="sp"></div><div class="card"><h2>Strumenti</h2><div class="lista">
    <div class="click" data-a="vai" data-v="turni" data-push="1"><span>🗓️ Turni di lavoro</span><b>›</b></div>
    <div class="click" data-a="vai" data-v="appuntamenti" data-push="1"><span>📌 Appuntamenti</span><b>›</b></div>
    <div class="click" data-a="vai" data-v="attestati" data-push="1"><span>🎓 Attestati e formazione</span><b>›</b></div>
    <div class="click" data-a="vai" data-v="contratti" data-push="1"><span>🏅 Contratti e punteggio</span><b>›</b></div>
    <div class="click" data-a="vai" data-v="import" data-push="1"><span>📂 Importa timbrature e backup</span><b>›</b></div>
    <div class="click" data-a="vai" data-v="info" data-push="1"><span>ℹ️ Informazioni</span><b>›</b></div></div></div>`}`;
}
on('salvaProfilo', el => {
  const primo = el.dataset.primo === '1', n = (id, d) => { const v = parseNum(val(id)); return v == null ? d : v; };
  if (primo && !val('f-nome').trim()) { toast('Inserisci almeno il nome'); return; }
  const patch = {
    nome: val('f-nome').trim(), cognome: val('f-cognome').trim(), ruolo: val('f-ruolo'), scuola: val('f-scuola').trim(), plesso: val('f-plesso').trim(),
    tipoOrario: val('f-tipo'), ore: Math.max(1, n('f-ore', 36)), giorni: +val('f-giorni') || 5,
    giorniLav: [...document.querySelectorAll('.f-gl:checked')].map(x => x.value).join(',') || '1,2,3,4,5',
    oreGiorno: [...document.querySelectorAll('.f-og')].map(x => x.value.trim().replace(',', '.')).join(','),
    menoDi3Anni: chk('f-meno3'), determinato: chk('f-det'), inizioContratto: val('f-inizioc').trim(), scadenzaContratto: val('f-scadc'), fineContratto: val('f-finec').trim(),
    ferieManuali: val('f-ferieman').trim() === '' ? -1 : Math.max(0, n('f-ferieman', -1)), festSoppresse: Math.max(0, Math.round(n('f-festsopp', 4))),
    residue: Math.max(0, Math.round(n('f-residue', 0))), oreResidue: n('f-oreres', 0), scadResidue: val('f-scadres').trim() || '30/04', bancaMesi: Math.max(0, Math.round(n('f-bancamesi', 0)))
  };
  if (!primo) Object.assign(patch, {
    emailSegreteria: val('f-email').trim(), fam: chk('f-fam'), famMax: n('f-fammax', 6), permMax: n('f-permmax', 3), f104: chk('f-104'), cong: chk('f-cong'), congMax: n('f-congmax', 10),
    figli: val('f-figli').trim(), rem: chk('f-rem'), remIn: nt(val('f-remin')) || '07:30:00', remOut: nt(val('f-remout')) || '14:00:00',
    giorniRientro: [...document.querySelectorAll('.f-gr:checked')].map(x => x.value).join(','), rientroIn: nt(val('f-rin')) || '14:30:00', rientroOut: nt(val('f-rout')) || '17:00:00',
    tema: val('f-tema'), modoScuro: val('f-modo')
  });
  setP(patch); applicaTema(S.p); toast('Profilo salvato'); N.render();
});

// ---------------- importa e backup
let pend = null;
async function caricaPdfjs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'vendor/pdf.min.js'; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  return window.pdfjsLib;
}
export function importa() {
  return `
  <button class="link back" data-a="indietro">‹ Indietro</button><h1>📂 Importa e backup</h1>
  <div class="card"><h2>Importa timbrature</h2>
    <p class="mu sm">Scegli il PDF “Cronologia timbrature” del portale presenze, un file CSV/TXT oppure un backup (.json o .ata). Le note già scritte restano.</p>
    <input type="file" id="i-file" style="padding:8px">
    <div id="i-esito" class="mu"></div></div>
  <div class="card"><h2>Crea un backup</h2>
    <p class="mu sm">Il backup contiene le tue timbrature e assenze. Proteggilo con una password: senza, chiunque abbia il file può leggerlo. Se dimentichi la password non si può recuperare.</p>
    ${sw('b-tutto', 'Includi profilo, turni, appuntamenti, contratti e attestati (solo per questa app)', true)}
    <label for="b-pw">Password (facoltativa, almeno 6 caratteri)</label><input type="password" id="b-pw" autocomplete="new-password">
    <button data-a="backup">💾 Crea backup</button></div>
  <div class="card"><h2>Cancella</h2><button class="del" data-a="resetE">Cancella tutte le timbrature</button><div class="sp"></div><button class="del" data-a="resetTutto">Cancella tutti i dati dell’app</button></div>`;
}
export async function leggiScelto(file, password = null) {
  const esito = document.getElementById('i-esito');
  esito.textContent = 'Lettura del file…';
  try {
    const pdfjs = (new Uint8Array(await file.slice(0, 4).arrayBuffer())).join(',') === '37,80,68,70' ? await caricaPdfjs() : null;
    const r = await IM.leggiFile(file, { attesi: d => C.attesi(S.p, d), pdfjs, password });
    const completo = r.testo ? IM.backupCompleto(r.testo) : null;
    if (!r.giornate.length && !completo) { esito.textContent = r.avvisi[0] || 'Non ho trovato giornate nel file: serve il PDF del portale presenze oppure righe con data e orari.'; return; }
    esito.textContent = '';
    mostraAnteprima(r, completo);
  } catch (e) {
    if (e && e.codice) {
      const pw = await chiediPassword('Backup protetto', e.codice === 'ERRATA' ? 'Password errata: riprova.' : 'Questo backup è protetto: inserisci la password.', 'Apri');
      if (pw) return leggiScelto(file, pw);
      esito.textContent = ''; return;
    }
    esito.textContent = 'Non sono riuscito a leggere il file.';
  }
}
function mostraAnteprima(r, completo) {
  const g = r.giornate, giorni = g.map(x => x.data).sort();
  const m = modal(`<h2>Importare ${g.length} giornate?</h2>
    <p class="mu">${g.length ? `Dal ${giorni[0].split('-').reverse().join('/')} al ${giorni[giorni.length - 1].split('-').reverse().join('/')}.` : ''} Le giornate già presenti negli stessi giorni vengono aggiornate; le note restano.</p>
    ${r.confronto.map(c => `<div class="sm">${h(c)}</div>`).join('')}
    ${r.avvisi.length ? `<div class="mu sm" style="margin-top:6px">${r.avvisi.slice(0, 6).map(a => '⚠️ ' + h(a)).join('<br>')}</div>` : ''}
    ${completo ? '<label class="ck"><input type="checkbox" id="i-prof" checked>Ripristina anche profilo, turni, appuntamenti, contratti e attestati</label>' : ''}
    <div class="sp"></div><button id="i-ok">Importa</button><div class="sp"></div><button class="sec" id="i-no">Annulla</button>`);
  m.$('#i-no').onclick = m.close;
  m.$('#i-ok').onclick = () => {
    if (completo && m.$('#i-prof') && m.$('#i-prof').checked) {
      const { idInstallazione, consensoStatistiche, ultimoPing, primoAvvio, ...resto } = completo.profilo;
      setP(resto);
    }
    importaGiornate(g); m.close(); toast(`Importate ${g.length} giornate`); applicaTema(S.p); N.render();
  };
}
on('backup', async () => {
  const pw = val('b-pw');
  if (pw && pw.length < 6) { toast('La password deve avere almeno 6 caratteri'); return; }
  const g = Object.values(S.m).sort((a, b) => a.data.localeCompare(b.data));
  const { idInstallazione, consensoStatistiche, ultimoPing, ...profilo } = S.p;
  const testo = chk('b-tutto') ? JSON.stringify({ ata: 2, versione: VERSIONE, profilo, giornate: g }) : JSON.stringify(g);
  const dt = iso(oggi());
  if (pw) scarica(`ata_backup_${dt}.ata`, await cifra(testo, pw), 'application/octet-stream');
  else scarica(`ata_backup_${dt}.json`, testo, 'application/json');
});
on('resetE', async () => { if (await conferma('Cancellare le timbrature?', 'Verranno cancellate tutte le giornate registrate. Il profilo resta. Non si può annullare.', 'Cancella')) { resetGiornate(); toast('Timbrature cancellate'); N.render(); } });
on('resetTutto', async () => {
  if (await conferma('Cancellare tutto?', 'Verranno cancellati profilo, timbrature, turni, appuntamenti e contratti. Non si può annullare.', 'Cancella tutto')) {
    const mantieni = { idInstallazione: S.p.idInstallazione, consensoStatistiche: S.p.consensoStatistiche };
    S.m = {}; salvaE(); S.p = { ...profiloVuoto(), ...mantieni, primoAvvio: iso(oggi()) }; salvaP(); location.reload();
  }
});
document.addEventListener('change', e => { if (e.target && e.target.id === 'i-file' && e.target.files[0]) { leggiScelto(e.target.files[0]); e.target.value = ''; } });

// ---------------- informazioni
export function info() {
  return `
  <button class="link back" data-a="indietro">‹ Indietro</button><h1>ℹ️ Informazioni</h1>
  <div class="card"><h2>Agenda ATA · versione web ${VERSIONE}</h2>
    <p class="mu">${COPYRIGHT}</p>
    <p class="sm">Privacy: tutti i dati (timbrature, profilo, contratti, note) restano solo su questo dispositivo e non vengono inviati a nessun server; vengono condivisi solo quando esporti o invii tu un file. ${h(TESTO_PRIVACY)}</p>
    <p class="sm">Un grazie di cuore ai colleghi dell’IISS Majorana di Termoli per l’aiuto nel testare le prime versioni dell’app, e a Gianni e Giovanni per i preziosi consigli.</p>
    <p class="mu sm">Su iPhone i dati sono salvati nel browser: fai ogni tanto un backup (Profilo → Importa e backup). Notifiche a app chiusa, widget e blocco con Face ID non sono disponibili nella versione web: l’app Android li ha.</p></div>
  <div class="card caffe" data-a="caffe"><div style="font-size:30px">☕🍕</div><div><b>Offrimi un caffè o una pizza</b><span class="sm">Agenda ATA è gratuita e lo resterà. Un piccolo gesto la tiene viva.</span></div></div>
  <button class="sec" data-a="segnala">📨 Segnala un problema o un consiglio</button><div class="sp"></div>
  <button class="sec" data-a="guida">📖 Rivedi la guida</button><div class="sp"></div>
  <button class="sec" data-a="aggiorna">🔄 Cerca aggiornamenti</button>`;
}
on('segnala', () => {
  const corpo = encodeURIComponent(`Versione web: ${VERSIONE}\nDispositivo: ${navigator.userAgent}\n\nDescrivi il problema o il consiglio:\n`);
  location.href = `mailto:${EMAIL}?subject=${encodeURIComponent('Agenda ATA web ' + VERSIONE + ' - segnalazione')}&body=${corpo}`;
});
on('indietro', () => N.indietro());
