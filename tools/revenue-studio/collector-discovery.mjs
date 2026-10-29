/** Current collector homepage contract, independent of legacy workbench injection. */
export function collectorHomeLinks(lang){
 if(!['en','de'].includes(lang))throw Error('Unsupported collector homepage language');
 const prefix=lang==='de'?'/de':'';
 return ['/collector-tools','/brands/labubu#style-probability','/brands/skullpanda#display-fit','/collection-tracker'].map(p=>prefix+p);
}
export function inspectCollectorHome(lang,html){
 // Only real anchors count: text, script strings and commented-out markup do not.
 const visible=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 const hrefs=[...visible.matchAll(/<a\b[^>]*\shref\s*=\s*(["'])(.*?)\1[^>]*>[\s\S]*?<\/a\s*>/gi)].map(m=>m[2]);
 return collectorHomeLinks(lang).filter(href=>!hrefs.includes(href)).map(href=>'collector_entry:'+href);
}
