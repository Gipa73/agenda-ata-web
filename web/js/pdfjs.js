/** Carica pdf.js (libreria locale, funziona anche senza rete) la prima volta che serve. */
export async function caricaPdfjs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'vendor/pdf.min.js'; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  return window.pdfjsLib;
}
