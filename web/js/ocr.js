import { caricaPdfjs } from './pdfjs.js';
import { LIMITE_PAGINE_PDF } from './importer.js';

async function caricaTesseract() {
  if (window.Tesseract) return window.Tesseract;
  await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'vendor/tess/tesseract.min.js'; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
  return window.Tesseract;
}
const url = p => new URL(p, document.baseURI).href;

/**
 * Legge il testo di un PDF scansionato: ogni pagina viene disegnata e riconosciuta (OCR, tutto sul dispositivo).
 * onProgresso(testo, frazione 0..1). fermaDopo = espressione: dopo la pagina in cui compare, si smette di leggere.
 */
export async function testoDaPdfScansionato(buf, onProgresso = () => { }, fermaDopo = null) {
  const pdfjs = await caricaPdfjs(), Tesseract = await caricaTesseract();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)), isEvalSupported: false }).promise;
  if (doc.numPages > LIMITE_PAGINE_PDF) return null;
  onProgresso('Preparo il lettore di testo…', 0.02);
  const worker = await Tesseract.createWorker('eng', 1, { workerPath: url('vendor/tess/worker.min.js'), corePath: url('vendor/tess/'), langPath: url('vendor/tess/lang'), gzip: true });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
    let testo = '';
    for (let n = 1; n <= doc.numPages; n++) {
      onProgresso(`Leggo la pagina ${n} di ${doc.numPages}…`, 0.05 + 0.9 * (n - 1) / doc.numPages);
      const page = await doc.getPage(n), v1 = page.getViewport({ scale: 1 }), scala = Math.min(4, 2300 / Math.max(v1.width, 1));
      const vp = page.getViewport({ scale: scala }), cv = document.createElement('canvas');
      cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: cx, viewport: vp }).promise;
      const { data } = await worker.recognize(cv);
      testo += data.text + '\n';
      cv.width = cv.height = 0;
      if (fermaDopo && fermaDopo.test(data.text)) break;
    }
    onProgresso('Fatto', 1);
    return testo;
  } finally { await worker.terminate(); }
}
