import {canonicalUrls} from './canonical-urls.mjs';
export const repairPaths=['/tools/google-flow','/tools/cline','/tools/together','/tools/jianying','/alternatives/grammarly'];
export function selectUrls(urls,manifest,{recent,all=false,repair=false}={}){
 const canonical=[...new Set(urls.map(canonicalUrls))];
 for(const value of canonical){const u=new URL(value);if(u.origin!=='https://baipiaoji.com'||u.search||u.hash)throw Error('Invalid sitemap host or parameters');}
 const dates=new Map(Object.entries(manifest).map(([u,v])=>[canonicalUrls(u),v.d]));
 if(repair){const expected=repairPaths.map(p=>'https://baipiaoji.com'+p);for(const u of expected)if(!canonical.includes(u))throw Error('Bing affected URL missing from sitemap: '+u);return expected;}
 return all?canonical:canonical.filter(u=>recent.includes(dates.get(u)));
}
