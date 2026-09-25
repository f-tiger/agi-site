// TDS Delivery Record v1. Hashes identify bytes; all descriptive claims are supplied by the user.
export const DELIVERY_LIMITS = Object.freeze({ files:10, fileBytes:20*1024*1024, totalBytes:100*1024*1024, manifestBytes:131072 });
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validateDeliveryFiles(files) {
  if (!files.length || files.length > DELIVERY_LIMITS.files) throw Error('files');
  if (files.some(f => !Number.isSafeInteger(f.size) || f.size < 0 || f.size > DELIVERY_LIMITS.fileBytes)) throw Error('size');
  if (files.reduce((s,f) => s+f.size,0) > DELIVERY_LIMITS.totalBytes) throw Error('total');
  if (new Set(files.map(f=>f.name)).size !== files.length) throw Error('names');
}
export async function fingerprint(file) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return {name:file.name, bytes:bytes.byteLength, sha256:Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')};
}
export function deliveryRecord(files, notes, now = new Date()) {
  return { format:'tds-delivery-record', version:1, createdAtDevice:now.toISOString(),
    timeSource:'Unverified device clock', claimsSource:'User-entered; not independently verified',
    project:String(notes.project || '').trim().slice(0,160),
    notes:Object.fromEntries(['scope','delivery','acceptance'].map(k=>[k,String(notes[k] || '').trim().slice(0,2000)])),
    files, attestation:{recipientVerified:false,deliveryVerified:false,consentVerified:false,bitcoinAnchored:false},
    limitations:'Hashes identify file bytes. They do not prove authorship, delivery, acceptance, payment authorization, or a trusted time. No dispute outcome is guaranteed.' };
}
export function parseDeliveryRecord(text) {
  if (new TextEncoder().encode(text).length > DELIVERY_LIMITS.manifestBytes) throw Error('manifest');
  let r; try { r=JSON.parse(text); } catch { throw Error('manifest'); }
  if (!r || r.format !== 'tds-delivery-record' || r.version !== 1 || !Array.isArray(r.files) || !r.files.length || r.files.length > DELIVERY_LIMITS.files) throw Error('manifest');
  for (const f of r.files) if (!f || typeof f.name !== 'string' || f.name.length > 512 || !Number.isSafeInteger(f.bytes) || f.bytes < 0 || f.bytes > DELIVERY_LIMITS.fileBytes || !/^[a-f0-9]{64}$/.test(f.sha256)) throw Error('manifest');
  if (new Set(r.files.map(f=>f.name)).size !== r.files.length || r.files.reduce((n,f)=>n+f.bytes,0)>DELIVERY_LIMITS.totalBytes) throw Error('manifest');
  // Only read the bounded file inventory. Imported claims are never promoted to attestations.
  return {format:r.format,version:r.version,files:r.files.map(f=>({name:f.name,bytes:f.bytes,sha256:f.sha256}))};
}
export function compareInventory(expected, actual) {
  const byName = new Map(actual.map(f=>[f.name,f]));
  const rows = expected.files.map(f=>{const a=byName.get(f.name); return {name:f.name,status:!a?'missing':a.sha256===f.sha256 && a.bytes===f.bytes?'match':'changed'};});
  const names=new Set(expected.files.map(f=>f.name));
  return [...rows,...actual.filter(f=>!names.has(f.name)).map(f=>({name:f.name,status:'extra'}))];
}
export function recordHTML(record) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>TDS delivery record</title><style>body{font:16px/1.6 Helvetica,Arial,sans-serif;color:#111114;max-width:850px;margin:40px auto;padding:0 24px}h1{font-size:32px}h2{font-size:21px;margin-top:30px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #ddd;padding:10px;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}small{color:#555}a{color:#e4002b}@media print{body{margin:0}tr{break-inside:avoid}}</style><h1>Delivery record</h1><p>${esc(record.project || 'Untitled handoff')}</p><p>Created using an unverified device clock: ${esc(record.createdAtDevice)}</p><p>${esc(record.limitations)}</p><h2>File inventory</h2><table><thead><tr><th>File</th><th>Bytes</th><th>SHA-256</th></tr></thead><tbody>${record.files.map(f=>`<tr><td>${esc(f.name)}</td><td>${f.bytes}</td><td>${f.sha256}</td></tr>`).join('')}</tbody></table>${[['scope','Agreed scope / source reference'],['delivery','Delivery record / source reference'],['acceptance','Client response / source reference']].map(([k,label])=>`<h2>${label}</h2><pre>${esc(record.notes[k] || 'Not provided')}</pre>`).join('')}<h2>How to verify</h2><p>Keep the JSON record and original files. Recalculate each file’s SHA-256 and compare its name, byte length and digest. A match confirms equality with this inventory only. It does not authenticate who created the inventory or when.</p><p>Recipient, delivery, consent and Bitcoin timestamp have not been verified by TDS.</p><p>Prepared with <a href="https://thedollscout.com/delivery-evidence?via=share" rel="noreferrer">TDS Document Scout</a>. Review this record before sharing: it contains the file names and notes you entered.</p></html>`;
}
