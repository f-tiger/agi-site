#!/usr/bin/env node
// Run after the workbench and member builders. Only BPJ's independent page shells
// are adapted; forms, scripts, body datasets and private-account headers survive.
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {shellHead,shellHeader,shellFooter,shellRelated,shellShare} from './site-shell.mjs';

const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const attr=(tag,name)=>tag.match(new RegExp('\\b'+name+'=["\']([^"\']*)["\']','i'))?.[1];
const marked=(name,html)=>`<!-- bpj-experience:${name}:start -->${html}<!-- bpj-experience:${name}:end -->`;
const stripOwned=html=>html.replace(/<!-- bpj-experience:([a-z]+):start -->[\s\S]*?<!-- bpj-experience:\1:end -->/g,'');

function adapt(input){
  let html=stripOwned(input);
  const bodyTag=html.match(/<body\b[^>]*>/i)?.[0]||'';
  const member=attr(bodyTag,'data-member-site')==='bpj',workbench=attr(bodyTag,'data-site')==='bpj';
  if(!member&&!workbench)return null;
  const lang=attr(bodyTag,member?'data-language':'data-locale')||'en';
  const canonicalTag=html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i)?.[0];
  const canonical=canonicalTag&&attr(canonicalTag,'href');
  if(!canonical||new URL(decode(canonical)).origin!=='https://baipiaoji.com')throw Error('Unexpected BPJ canonical');
  const publicURL=new URL(decode(canonical));publicURL.search='';publicURL.hash='';
  const localPath=publicURL.pathname.replace(/^\/(?:en|de|it)(?=\/)/,'').replace(/\.html$/,'');
  const title=decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'BPJ');
  const alternates=[...html.matchAll(/<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=)[^>]*>/gi)]
    .map(([tag])=>({lang:attr(tag,'hreflang')?.split('-')[0],href:decode(attr(tag,'href')||'')}))
    .filter(a=>['zh','en','de','it'].includes(a.lang)&&a.href.startsWith('https://baipiaoji.com/'));
  if(!alternates.length)throw Error('Missing localized BPJ alternates');
  // Main IDs belong to the interactive application; point the skip link at the
  // existing target instead of renaming it or adding another main element.
  const main=html.match(/<main\b[^>]*>/i)?.[0];
  if(!main)throw Error('Missing BPJ application main');
  let mainId=attr(main,'id');
  if(!mainId){mainId='bpj-main';html=html.replace(main,main.replace(/>$/,' id="bpj-main">'));}
  let header=shellHeader({lang,path:localPath,alternates});
  header=header.replace('href="#bpj-main"',`href="#${mainId}"`);
  // The old builders own one top-level header. Never search inside application
  // content for navigation, and never touch the form trees.
  html=html.replace(/(<body\b[^>]*>)([\s\S]*?)(<main\b)/i,(_,body,prefix,mainStart)=>{
    prefix=prefix.replace(/<header\b[\s\S]*?<\/header>/i,'').replace(/<a\b[^>]*class=["']skip["'][^>]*>[\s\S]*?<\/a>/i,'');
    return body+marked('header',header)+prefix+mainStart;
  });
  html=html.replace(/<body\b[^>]*>/i,tag=>{
    const classes=new Set((attr(tag,'class')||'').split(/\s+/).filter(Boolean));classes.add('bpj-shell');
    return tag.replace(/\s(?:class|data-bpj-experience)=["'][^"']*["']/g,'').replace(/>$/,` class="${[...classes].join(' ')}" data-bpj-experience="${member?'member':'workbench'}">`);
  });
  html=html.replace(/<\/head>/i,marked('head',shellHead(''))+'</head>');
  const related=shellRelated(lang,localPath);
  // Account pages share only their public canonical. No key, input, return
  // context, query parameter or project state is supplied to the sharing UI.
  const hubNote=localPath==='/workbench'?`<p class="bpj-workbench-note">${lang==='zh'?'先选择一个具体任务：LaunchDesk 整理发布页，QuotaWatch Pro 比较你填写的额度情景，CreatorOps 整理视频制作简报。它们根据输入生成结构化结果，不会代你发布内容或生成视频。请先核对示例数据，再导出用于真实工作。':'Choose a concrete task: prepare a launch page with LaunchDesk, compare your own quota scenarios with QuotaWatch Pro, or organize a production brief with CreatorOps. These tools structure your inputs; they do not publish content or generate video. Check the example data before using an export in real work.'}</p>`:'';
  const extras=hubNote+related+(member?'':shellShare(lang,publicURL.href,title));
  html=html.replace(/<\/main>/i,marked('extras',extras)+'</main>');
  html=html.replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i,'<div class="bpj-legacy-notice">$1</div>');
  html=html.replace(/<\/body>/i,marked('footer',shellFooter(lang))+'</body>');
  return {html,kind:member?'member':'workbench'};
}

export function finishExperience(out){
  out=resolve(out);const files=[];
  function walk(dir){if(!existsSync(dir))return;for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.html'))files.push(p);}}
  for(const prefix of ['','en']){const dir=join(out,prefix);const hub=join(dir,'workbench.html');if(existsSync(hub))files.push(hub);walk(join(dir,'workbench'));}
  for(const prefix of ['','en','de','it']){const file=join(out,prefix,'members.html');if(existsSync(file))files.push(file);}
  const totals={workbench:0,member:0};let changed=0;
  for(const file of files){const before=readFileSync(file,'utf8'),result=adapt(before);if(!result)continue;totals[result.kind]++;if(result.html!==before){writeFileSync(file,result.html);changed++;}}
  if(!totals.workbench||!totals.member)throw Error('Build BPJ workbench and membership before finish-experience');
  console.log(`BPJ experience: ${totals.workbench} workbench + ${totals.member} member pages; ${changed} updated. Widgets and other sites untouched.`);
  return {...totals,changed};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),i=args.indexOf('--out');
  finishExperience(i>=0?args[i+1]:join(dirname(fileURLToPath(import.meta.url)),'../dist'));
}
