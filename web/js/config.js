// Impostazioni della versione web (le stesse dell'app Android).
export const VERSIONE = '2.8';
export const EMAIL = 'gipa73w@gmail.com';
export const PAYPAL = 'https://paypal.me/gipa73';
export const REVOLUT = 'https://revolut.me/gianpaolo_p73';
export const linkPaypal = euro => `${PAYPAL}/${euro}EUR`;
export const COPYRIGHT = '© 2026 Papa Gianpaolo. Tutti i diritti riservati.';

// Statistiche anonime (stesso foglio Google dell'app Android). OBBLIGATORIO = true: senza accettare non si usa l'app.
export const STAT = {
  INDIRIZZO: 'https://script.google.com/macros/s/AKfycbz-VV0cdYH8hqVRJkAURHXS67-aVeVK4nhthq7PnQhanR70Uvp7V0DjyHxsZG8u52J9tw/exec',
  CHIAVE: 'k9f3a7c2e1b84d6a',
  OBBLIGATORIO: true
};
export const statAttive = () => !!STAT.INDIRIZZO;
export const TESTO_PRIVACY = STAT.OBBLIGATORIO
  ? 'Per usare l’app è necessario accettare l’invio, in forma anonima, di un codice casuale, della versione dell’app e della data di utilizzo, per sapere quante persone la usano.'
  : 'Solo se acconsenti, l’app invia in forma anonima un codice casuale, la versione e la data di utilizzo, per sapere quante persone la usano.';
export const GIORNI_PRIMO_INVITO = 7, GIORNI_TRA_INVITI = 5;
