import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {siteHeader,navAssets,VERSION} from '../../site-nav/render.mjs';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const excluded=new Set(['widget.html','404.html','analytics-assets/frame.html']);
export function eligible(html,rel){const lang=html.match(/<html\b[^>]*\blang=["']([^"']+)/i)?.[1];return !excluded.has(rel)&&/^(en|zh)(-|$)/i.test(lang||'')&&!/<meta[^>]*http-equiv=["']refresh/i.test(html)&&!rel.startsWith('tools/');}
const attr=(tag,name)=>tag.match(new RegExp('\\b'+name+'=["\']([^"\']+)["\']','i'))?.[1];
export function normalize(html,rel){
 if(!eligible(html,rel))return html;
 const lang=/^zh/.test(html.match(/<html\b[^>]*\blang=["']([^"']+)/i)[1])?'zh':'en';
 const links=html.match(/<link\b[^>]*>/gi)||[],canonical=links.find(x=>attr(x,'rel')==='canonical');
 const route=canonical?new URL(attr(canonical,'href'),'https://agiscorecard.com').pathname:rel==='index.html'?'/':'/'+rel.replace(/\.html$/,'');
 const counterpart=links.find(x=>attr(x,'rel')==='alternate'&&(lang==='zh'?/^en(?:-|$)/.test(attr(x,'hreflang')||''):/^zh(?:-|$)/.test(attr(x,'hreflang')||'')));
 const candidate=counterpart?new URL(attr(counterpart,'href'),'https://agiscorecard.com'):null;
 let alternate=candidate?.origin==='https://agiscorecard.com'?candidate.pathname:null;
 // Legacy homepages and articles receive hreflang at the edge. Resolve their
 // existing static counterpart before considering a language-home fallback.
 if(!alternate){const sibling=lang==='zh'?(rel==='cn.html'?'index.html':rel.replace(/^zh\//,'')):(rel==='index.html'?'cn.html':'zh/'+rel);const file=path.join(root,sibling);
  if(sibling!==rel&&fs.existsSync(file)){const target=fs.readFileSync(file,'utf8'),targetLang=target.match(/<html\b[^>]*\blang=["']([^"']+)/i)?.[1];
   if((lang==='zh'?/^en(?:-|$)/:/^zh(?:-|$)/).test(targetLang||'')){const canon=(target.match(/<link\b[^>]*>/gi)||[]).find(t=>attr(t,'rel')==='canonical'),url=canon?new URL(attr(canon,'href'),'https://agiscorecard.com'):null;
    alternate=url?.origin==='https://agiscorecard.com'?url.pathname:'/'+sibling.replace(/index\.html$/,'').replace(/\.html$/,'');
   }
  }
 }
 const header=siteHeader(lang,{pathname:route,alternate:alternate||(lang==='zh'?'/':'/cn'),translation:!!alternate});
 // Keep application content; only the old site's first header is replaced.
 // A few legacy articles never had a header; they receive one before their content.
 let s=html.replace(/<header\b[^>]*>[\s\S]*?<\/header>\s*/i,'');
 s=s.replace(/(<body\b[^>]*>)\s*/i,(_,m)=>m+'\n'+header+'\n');
 s=s.replace(/<link\b[^>]*href=["']\/home-focus\/nav\.css[^"']*["'][^>]*>\s*/gi,'').replace(/<script\b[^>]*src=["']\/site-nav\/app\.mjs[^"']*["'][^>]*><\/script>\s*/gi,'');
 return s.replace('</head>',navAssets()+'\n</head>');
}
export function files(dir=root){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='node_modules'||e.name.startsWith('.')?[]:e.isDirectory()?files(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const check=process.argv.includes('--check');let count=0,changed=0;
 for(const file of files()){const rel=path.relative(root,file).replaceAll('\\','/'),source=fs.readFileSync(file,'utf8');if(!eligible(source,rel))continue;count++;const next=normalize(source,rel);if(source!==next){changed++;if(!check)fs.writeFileSync(file,next);}}
 if(check&&changed)throw Error(`${changed} pages have stale site navigation`);
 console.log(JSON.stringify({navigation:VERSION,pages:count,changed,mode:check?'check':'build'}));
}
