import { LIMITS, auditDocument, structureFacts } from './core.mjs?v=2026-09-25.5';

export async function readPdf(data, options = {}) {
  const { name = 'document.pdf', signal, onProgress = () => {}, pageLimit = LIMITS.pages, library } = options;
  const pdfjs = library || await import('./vendor/pdf.mjs');
  if (!library) pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.mjs', import.meta.url).href;
  if (signal?.aborted) throw Object.assign(new Error('cancelled'), { name: 'AbortError' });
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.byteLength > LIMITS.fileBytes) throw new Error('tooLarge');
  const header = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
  if (!header.includes('%PDF-')) throw new Error('invalidPdf');
  const size = bytes.byteLength;
  const task = pdfjs.getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true,
    cMapUrl: new URL('./vendor/cmaps/', import.meta.url).href, cMapPacked: true,
    standardFontDataUrl: new URL('./vendor/standard_fonts/', import.meta.url).href,
    wasmUrl: new URL('./vendor/wasm/', import.meta.url).href,
  });
  let timedOut = false;
  const stop = () => { void task.destroy(); };
  const timeout = setTimeout(() => { timedOut = true; stop(); }, 90000);
  signal?.addEventListener('abort', stop, { once: true });
  try {
    const pdf = await task.promise;
    const metadata = await pdf.getMetadata();
    const marked = await pdf.getMarkInfo();
    const outline = await pdf.getOutline();
    const language = String(metadata.info.Language || metadata.metadata?.get('dc:language') || '');
    // PDF.js 6 returns a Map here (the bundled declaration still says object).
    const doc = { name, size, pageCount: pdf.numPages, title: metadata.info.Title || metadata.metadata?.get('dc:title') || '', language, marked: (marked instanceof Map ? marked.get('Marked') : marked?.Marked) === true, outlineCount: outline?.length || 0, pages: [] };
    let totalChars = 0;
    for (let number = 1; number <= Math.min(pdf.numPages, pageLimit); number++) {
      if (signal?.aborted) throw Object.assign(new Error('cancelled'), { name: 'AbortError' });
      onProgress(number, Math.min(pdf.numPages, pageLimit));
      let page;
      try {
        page = await pdf.getPage(number);
        const content = await page.getTextContent();
        const parts = content.items.filter(item => typeof item.str === 'string').map(item => item.str + (item.hasEOL ? '\n' : ' '));
        const fullText = parts.join('').trim();
        const cap = Math.max(0, Math.min(LIMITS.pageChars, LIMITS.totalChars - totalChars));
        const text = fullText.slice(0, cap);
        totalChars += text.length;
        const tree = await page.getStructTree();
        const annotations = await page.getAnnotations();
        doc.pages.push({ number, text, characters: text.replace(/\s/g, '').length, textTruncated: text.length < fullText.length, structure: structureFacts(tree), forms: annotations.filter(a => a.subtype === 'Widget').length });
      } catch (error) {
        if (signal?.aborted || timedOut) throw error;
        doc.pages.push({ number, text: '', characters: 0, error: true, structure: structureFacts(null), forms: 0 });
      } finally { page?.cleanup(); }
    }
    return auditDocument(doc);
  } catch (error) {
    if (signal?.aborted) throw Object.assign(new Error('cancelled'), { name: 'AbortError' });
    if (timedOut) throw new Error('timeout');
    if (error?.name === 'PasswordException') throw new Error('passwordPdf');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', stop);
    await task.destroy();
  }
}
