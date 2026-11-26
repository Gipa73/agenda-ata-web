import { S, setP, invitoDovuto, invitoMostrato } from './store.js';
import { uid, iso, oggi } from './util.js';
import { VERSIONE, STAT, statAttive, TESTO_PRIVACY, PAYPAL, REVOLUT, linkPaypal, EMAIL } from './config.js';
import { h, on, modal, toast, apri } from './ui.js';
import { N } from './nav.js';

export const NOVITA = [
  'Turni dal PDF della scuola: scegli il file (anche scansionato) e i tuoi turni si caricano da soli',
  'Versione web completa: stesse causali, calcoli, contratti e punteggio dell’app Android',
  'Importazione del PDF del portale presenze, backup protetti da password compatibili con Android',
  'Giorni festivi in rosso indicati come festività; saldo aggiornato a fine giornata'
];
export const FL = { pag: 0, rifiutato: false, guida: 0, riguarda: false };

/** Quale schermata a tutto schermo mostrare prima dell'app (null = l'app è pronta). */
export function flusso() {
  const p = S.p;
  if (statAttive() && STAT.OBBLIGATORIO && p.consensoStatistiche !== 'si') return 'consenso';
  if (!p.benvenutoVisto) return 'benvenuto';
  if (p.versioneVista !== VERSIONE) return 'novita';
  if (!p.nome) return 'onboarding';
  if (!p.guida || FL.riguarda) return 'guida';
  return null;
}

export function schermataConsenso() {
  return `<div class="full"><div class="em">📊</div><h1 style="font-size:24px">Statistiche anonime d’uso</h1>
    <p>Agenda ATA è gratuita e la sviluppo nel mio tempo libero. Per sapere quante persone la usano e per migliorarla, ricevo in forma anonima: un codice casuale, la versione dell’app e la data di utilizzo.</p>
    <p>Non ricevo il tuo nome, le tue timbrature né altri dati personali: restano solo sul tuo dispositivo.</p>
    <p><b>Per usare l’app è necessario accettare.</b></p>
    ${FL.rifiutato ? `<p class="ko">Senza questa accettazione non posso farti usare l’app. Puoi chiuderla.</p><button class="cta" style="max-width:340px" data-a="accetto">Ho cambiato idea: accetto</button>`
      : `<button class="cta" style="max-width:340px" data-a="accetto">Accetto e continuo</button><button class="link" data-a="nonAccetto">Non accetto</button>`}</div>`;
}
export function schermataBenvenuto(soloNovita) {
  const n = soloNovita ? 2 : FL.pag, ultimo = n === 2;
  const corpo = n === 0 ? `<p style="font-size:20px"><b>Grazie per il tempo che dedichi per testare la mia App</b></p><p class="pr" style="font-style:italic;font-size:19px">Gianpaolo Papa</p>`
    : n === 1 ? `<p style="font-size:17px">Ai colleghi dell’IISS Majorana di Termoli, per l’aiuto nel testare le prime versioni di Agenda ATA.</p><p style="font-size:17px">A Gianni e a Giovanni, per i preziosi consigli.</p><p class="mu" style="font-style:italic">Senza di voi questa app non sarebbe com’è.</p><p class="pr" style="font-style:italic;font-size:18px">Gianpaolo Papa</p>`
    : `<p class="mu"><b>Versione web ${VERSIONE}</b> · Le novità</p>${NOVITA.map(x => `<p style="text-align:left;max-width:340px">• ${h(x)}</p>`).join('')}<p class="mu sm">I tuoi dati restano su questo dispositivo.</p>`;
  const em = n === 0 ? '❤️' : n === 1 ? '🙏' : 'ℹ️';
  return `<div class="full"><div class="em">${em}</div>${n === 1 ? '<h1 style="font-size:26px">Grazie di cuore!</h1>' : ''}${corpo}
    ${soloNovita ? '' : `<div class="mu sm">${n + 1} / 3</div>`}<button class="cta" style="max-width:340px" data-a="bvAvanti">${ultimo ? 'Ho capito' : 'Avanti'}</button></div>`;
}
const SLIDE = [
  ['⏱️', 'Timbra con un tocco', 'In Home tocca “Timbra ingresso” e, a fine giornata, “Timbra uscita”. Il saldo del mese e la banca ore si aggiornano quando concludi la giornata.'],
  ['📅', 'Agenda e causali', 'Tocca un giorno del calendario per inserire timbrature, permessi, ferie, malattia e tutte le causali del portale. Le festività nazionali sono già segnate in rosso.'],
  ['🏖️', 'Ferie, permessi e report', 'In “Ferie” trovi giorni rimanenti, permessi e congedi. In “Report” il cartellino del mese da esportare in CSV o stampare in PDF.'],
  ['💾', 'Sul tuo iPhone', 'I dati sono salvati su questo dispositivo, nel browser. Fai ogni tanto un backup (Profilo → Importa e backup) e aggiungi l’app alla schermata Home: Condividi → “Aggiungi alla schermata Home”.']
];
export function schermataGuida() {
  const [em, t, c] = SLIDE[FL.guida], ultimo = FL.guida === SLIDE.length - 1;
  return `<div class="full"><div class="em">${em}</div><h1 style="font-size:24px">${t}</h1><p style="max-width:340px">${c}</p><div class="mu sm">${FL.guida + 1} / ${SLIDE.length}</div>
    <button class="cta" style="max-width:340px" data-a="guidaAvanti">${ultimo ? 'Inizia' : 'Avanti'}</button></div>`;
}
on('accetto', () => { setP({ consensoStatistiche: 'si', idInstallazione: S.p.idInstallazione || uid() }); FL.rifiutato = false; pingStatistiche(); N.render(); });
on('nonAccetto', () => { FL.rifiutato = true; N.render(); });
on('bvAvanti', () => {
  if (!S.p.benvenutoVisto && FL.pag < 2) { FL.pag++; N.render(); return; }
  setP({ benvenutoVisto: true, versioneVista: VERSIONE }); FL.pag = 0; N.render();
});
on('guidaAvanti', () => {
  if (FL.guida < SLIDE.length - 1) { FL.guida++; N.render(); return; }
  setP({ guida: true }); FL.guida = 0; FL.riguarda = false; N.vai('home');
});
on('guida', () => { FL.riguarda = true; FL.guida = 0; N.render(); });

// ---------------- invito "caffè o pizza"
let apertoCaffe = false;
export function dialogCaffe() {
  if (apertoCaffe) return; apertoCaffe = true;
  const m = modal(`<h2>☕🍕 Agenda ATA è gratuita… e lo resterà</h2>
    <p>Ciao, sono Gianpaolo, collaboratore scolastico. Ho creato Agenda ATA nel mio tempo libero perché nessun collega perda un minuto delle proprie ore: niente pubblicità, niente abbonamenti, nessun dato venduto, e voglio che resti così.</p>
    <p>Se ti è utile, offrimi un caffè (2 €) o una pizza (5 €): mi aiuti a tenerla aggiornata e a realizzare le novità che mi chiedete. Ogni piccolo gesto conta davvero. Grazie di cuore! 🙏</p>
    <div class="chips"><label><input type="radio" name="pv" value="paypal" checked>PayPal</label><label><input type="radio" name="pv" value="revolut">Revolut</label></div><div class="sp"></div>
    <button id="c2">☕ Un caffè · 2 €</button><div class="sp"></div><button id="c5">🍕 Una pizza · 5 €</button>
    <div id="rv" class="mu sm" style="display:none">Su Revolut scegli tu l’importo (2 € per un caffè, 5 € per una pizza).</div><div class="sp"></div>
    <button class="link" id="cfatto" style="width:100%">Ho già offerto, grazie!</button><button class="sec" id="cpiu">Più tardi</button>`, { centro: true, chiudiFuori: false });
  const link = e => (m.el.querySelector('input[name=pv]:checked').value === 'paypal' ? linkPaypal(e) : REVOLUT);
  m.el.querySelectorAll('input[name=pv]').forEach(r => r.onchange = () => { m.$('#rv').style.display = m.el.querySelector('input[name=pv]:checked').value === 'revolut' ? '' : 'none'; });
  m.$('#c2').onclick = () => apri(link(2)); m.$('#c5').onclick = () => apri(link(5));
  const chiudi = () => { apertoCaffe = false; m.close(); };
  m.$('#cpiu').onclick = chiudi;
  m.$('#cfatto').onclick = () => { setP({ contributoFatto: true }); chiudi(); N.render(); toast('Grazie di cuore! 🙏'); };
}
on('caffe', dialogCaffe);
/** Dopo la configurazione iniziale: una volta per sessione, se è ora di riproporre l'invito. */
let invitoSessione = false;
export function controllaInvito() {
  if (invitoSessione || !invitoDovuto()) return;
  invitoSessione = true; invitoMostrato(); dialogCaffe();
}

// ---------------- statistiche anonime (una volta al giorno, solo con l'accettazione)
export async function pingStatistiche() {
  const p = S.p;
  if (!statAttive() || p.consensoStatistiche !== 'si' || !p.idInstallazione || p.ultimoPing === iso(oggi())) return;
  const os = /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'web-iOS' : 'web';
  const q = `id=${encodeURIComponent(p.idInstallazione)}&v=${encodeURIComponent(VERSIONE)}&os=${encodeURIComponent(os)}&k=${encodeURIComponent(STAT.CHIAVE)}`;
  try { await fetch(`${STAT.INDIRIZZO}?${q}`, { mode: 'no-cors', cache: 'no-store' }); setP({ ultimoPing: iso(oggi()) }); } catch (e) { }
}

// ---------------- installazione sulla schermata Home (iPhone)
export const èStandalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
export function bannerInstall() {
  if (èStandalone() || !/iPhone|iPad|iPod/.test(navigator.userAgent) || localStorage.getItem('ata2.noInstall')) return '';
  return `<div class="banner"><div style="font-size:26px">📲</div><div style="flex:1"><b>Installa l’app sul tuo iPhone</b><div class="sm">Tocca <b>Condividi</b> ⬆️ in Safari e poi <b>“Aggiungi alla schermata Home”</b>: si apre a tutto schermo e funziona anche senza rete. Fallo prima di inserire dati: i dati dell’icona sulla Home e quelli di Safari sono separati.</div></div><button class="link" data-a="chiudiInstall">✕</button></div>`;
}
on('chiudiInstall', () => { try { localStorage.setItem('ata2.noInstall', '1'); } catch (e) { } N.render(); });
