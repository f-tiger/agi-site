import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {safeJSON,template} from './core.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const css=readFileSync(join(root,'style.css'),'utf8');
const core=readFileSync(join(root,'core.mjs'),'utf8').replace(/^export /gm,'');
const app=readFileSync(join(root,'app.js'),'utf8');
if(/<\/script/i.test(core+app)||/<\/style/i.test(css))throw new Error('Unsafe embedded source');
mkdirSync(join(root,'dist'),{recursive:true});
for(const lang of ['zh','en']){
  const zh=lang==='zh';
  const html=`<!doctype html><html lang="${zh?'zh-CN':'en'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta name="description" content="${zh?'用自己的服务和单价创建可独立交付的互动报价工具。':'Create a portable interactive quote tool from your services and rates.'}"><title>${zh?'BPJ 报价工坊':'BPJ Quote Studio'}</title><style>${css}</style></head><body><div id="app"></div><noscript>${zh?'请在浏览器开启 JavaScript 后使用本机报价工具。':'Enable JavaScript in your browser to use this local quote tool.'}</noscript><script type="application/json" id="initial-state">${safeJSON({mode:'builder',config:template('video',lang)})}</script><script>${core}\n${app}</script></body></html>`;
  writeFileSync(join(root,'dist',`quote-studio-${lang}.html`),html);
  console.log(`Built quote-studio-${lang}.html (${Buffer.byteLength(html)} bytes)`);
}
