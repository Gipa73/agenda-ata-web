// Backup protetti da password: AES-256-GCM con chiave PBKDF2-HMAC-SHA256. Stesso formato dell'app Android:
// "ATA-ENC1;iterazioni;sale(base64);iv(base64);dati(base64)"
export const PREFISSO = 'ATA-ENC1;';
const ITER = 210000;
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function chiave(pw, sale, iter, usi) {
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sale, iterations: iter, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, usi);
}
export const cifrato = t => String(t || '').startsWith(PREFISSO);
export async function cifra(testo, pw) {
  const sale = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await chiave(pw, sale, ITER, ['encrypt']);
  const dati = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, k, new TextEncoder().encode(testo)));
  return `${PREFISSO}${ITER};${b64(sale)};${b64(iv)};${b64(dati)}`;
}
/** null = password errata o file alterato. */
export async function decifra(file, pw) {
  try {
    const p = String(file).trim().slice(PREFISSO.length).split(';'), iter = parseInt(p[0]);
    if (!(iter >= 10000 && iter <= 2000000)) return null;
    const k = await chiave(pw, unb64(p[1]), iter, ['decrypt']);
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(p[2]), tagLength: 128 }, k, unb64(p[3])));
  } catch (e) { return null; }
}
