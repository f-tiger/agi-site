import {cpSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
// Explicit allowlist: private manifests, reports and credentials can never be copied.
export function buildReleaseCheckAssets(root,dist){
 const src=join(root,'products/release-check'),dst=join(dist,'downloads/release-check');mkdirSync(dst,{recursive:true});
 const files=['release-check.mjs','example-manifest.json','README.md','README.zh-CN.md','AGENT-BRIEF.md','LICENSE'];
 for(const f of files)cpSync(join(src,f),join(dst,f));
 writeFileSync(join(dst,'SHA256SUMS'),files.map(f=>createHash('sha256').update(readFileSync(join(dst,f))).digest('hex')+'  '+f).join('\n')+'\n');
}
