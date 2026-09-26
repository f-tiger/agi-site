// TDS file reference v1. Public, portable and deliberately free of identity claims.
export const VERIFY_MAX_BYTES = 20 * 1024 * 1024;
export function fileReference(value) {
  if (!value || !/^[a-f0-9]{64}$/.test(value.sha256) || !Number.isSafeInteger(value.bytes) || value.bytes < 0 || value.bytes > VERIFY_MAX_BYTES) throw Error('reference');
  return { sha256:value.sha256, bytes:value.bytes };
}
export function referenceFragment(value) {
  const r=fileReference(value);
  return `#tds-file-v1=${r.sha256}.${r.bytes}`;
}
export function parseReference(input) {
  if (typeof input !== 'string' || input.length > 512) throw Error('reference');
  let fragment=input.trim();
  if (!fragment.startsWith('#')) {
    let url; try { url=new URL(fragment); } catch { throw Error('reference'); }
    if (url.origin !== 'https://thedollscout.com' || !/^\/(?:(de|zh)\/)?verify-file$/.test(url.pathname) || url.username || url.password) throw Error('reference');
    fragment=url.hash;
  }
  const match=/^#tds-file-v1=([a-f0-9]{64})\.(0|[1-9][0-9]{0,7})$/.exec(fragment);
  if (!match) throw Error('reference');
  return fileReference({sha256:match[1],bytes:Number(match[2])});
}
export function referenceURL(value, lang='en') {
  const prefix=lang==='de'||lang==='zh'?`/${lang}`:'';
  return `https://thedollscout.com${prefix}/verify-file?via=recipient${referenceFragment(value)}`;
}
export function compareReference(expected, actual) {
  const a=fileReference(expected), b=fileReference(actual);
  return a.sha256===b.sha256 && a.bytes===b.bytes;
}
export function referenceEmbed(value, lang='en') {
  const label={en:'Check this file with TDS',de:'Diese Datei mit TDS prüfen',zh:'用 TDS 核对这份文件'}[lang]||'Check this file with TDS';
  return `<a href="${referenceURL(value,lang)}" rel="noreferrer">${label}</a>`;
}
