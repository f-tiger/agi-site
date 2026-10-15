// Install only on public routes already admitted by the final GA4 coverage gate.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../assets/public-engagement.mjs', import.meta.url));
export const engagementVersion = createHash('sha256').update(source).digest('hex').slice(0,12);
export function installPublicEngagement(out, write = false) {
  const report = JSON.parse(fs.readFileSync(path.join(out,'analytics-assets/coverage.json')));
  assert.equal(report.site,'bpj'); assert.equal(report.measurementId,'G-H79D948F4Z');
  const tag = `<script type="module" src="/bpj-engagement.mjs?v=${engagementVersion}"></script>`;
  if (write) fs.writeFileSync(path.join(out,'bpj-engagement.mjs'),source);
  assert.equal(fs.readFileSync(path.join(out,'bpj-engagement.mjs'),'utf8'),source.toString());
  let publicPages = 0, excludedPages = 0;
  for (const record of report.records) {
    const file = path.join(out,record.file); let html = fs.readFileSync(file,'utf8');
    const tags = html.match(/<script\b[^>]*\bsrc=["'][^"']*bpj-engagement\.mjs[^"']*["'][^>]*>[\s\S]*?<\/script>/gi) || [];
    if (record.mode === 'excluded') { assert.equal(tags.length,0,record.file); excludedPages++; continue; }
    assert.equal(record.mode,'consent',record.file);
    assert.equal(new URL(record.url).hostname,'baipiaoji.com',record.file);
    assert.match(html,/data-ga4-id="G-H79D948F4Z"/,record.file);
    if (write) {
      for (const existing of tags) html = html.replace(existing,'');
      assert.match(html,/<\/body>/i,record.file);
      fs.writeFileSync(file,html.replace(/<\/body>/i,tag+'</body>'));
    } else { assert.deepEqual(tags,[tag],record.file); }
    publicPages++;
  }
  return {publicPages,excludedPages,version:engagementVersion};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2), i=args.indexOf('--out');
  console.log(JSON.stringify(installPublicEngagement(i<0?fileURLToPath(new URL('../dist/',import.meta.url)):args[i+1],args.includes('--write'))));
}
