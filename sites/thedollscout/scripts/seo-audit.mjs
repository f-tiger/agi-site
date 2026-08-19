/* Technical SEO audit. Crawls every page from disk with a real browser (the
   age gate and the JS-rendered strips mean a plain HTML parse sees the wrong
   page), and reports the things that quietly cost rankings: over-long titles
   and descriptions that truncate in results, missing canonicals, duplicate or
   absent H1s, invalid JSON-LD, images without alt text, broken internal links,
   and the internal link count per page.

   That last column is the one worth watching. A page reachable only from its
   hub gets almost no internal link equity, and it is invisible in every other
   audit tool because nothing about the page itself is wrong.

   Run:  npm i -D playwright && node scripts/seo-audit.mjs
   Read-only — it changes nothing. */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
const ROOT="/home/user/sexweb";
const T={".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".xml":"application/xml",".txt":"text/plain"};
const srv=createServer((q,r)=>{let p=decodeURIComponent(q.url.split("?")[0]);let f=join(ROOT,p);
 if(existsSync(f)&&statSync(f).isDirectory())f=join(f,"index.html");
 if(!existsSync(f)){r.writeHead(404);return r.end("");}
 r.writeHead(200,{"content-type":T[extname(f)]||"application/octet-stream"});r.end(readFileSync(f));}).listen(8095);

function walk(d,out=[]){for(const e of readdirSync(d,{withFileTypes:true})){
  if(/^(\.|node_modules|img|css|js|scripts|content)/.test(e.name))continue;
  const p=join(d,e.name); if(e.isDirectory())walk(p,out); else if(e.name.endsWith(".html"))out.push("/"+relative(ROOT,p));}
  return out;}
const files=walk(ROOT).sort();
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
const ctx=await b.newContext(); const page=await ctx.newPage();
await page.goto("http://localhost:8095/"); await page.waitForTimeout(600);
if(await page.locator("#age-yes").count()) await page.click("#age-yes");

const data={}; const inbound={};
for(const f of files){
  if(f==="/404.html") continue;
  await page.goto("http://localhost:8095"+f); await page.waitForTimeout(350);
  const d=await page.evaluate(()=>{
    const g=s=>document.querySelector(s);
    const links=[...document.querySelectorAll("main a[href], footer a[href], header a[href]")]
      .map(a=>a.getAttribute("href")).filter(h=>h&&!/^(https?:|mailto:|javascript:|#)/.test(h));
    let schema=[];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{
      try{const j=JSON.parse(s.textContent); (j["@graph"]||[j]).forEach(x=>schema.push(x["@type"]));}
      catch(e){schema.push("PARSE_ERROR");}});
    return {
      title:(g("title")||{}).textContent||"",
      desc:(g('meta[name=description]')||{}).content||"",
      canonical:(g('link[rel=canonical]')||{}).href||"",
      og:!!g('meta[property="og:image"]'),
      h1:[...document.querySelectorAll("h1")].map(h=>h.textContent.trim()),
      words:(document.querySelector("main")||document.body).innerText.split(/\s+/).length,
      links, noindex:/noindex/.test((g('meta[name=robots]')||{}).content||""),
      schema, imgNoAlt:[...document.querySelectorAll("main img")].filter(i=>!i.hasAttribute("alt")).length
    };});
  data[f]=d;
  d.links.forEach(h=>{ let t=h.split("#")[0].split("?")[0]; if(!t)return;
    if(t.endsWith("/")) t+="index.html";
    inbound[t]=(inbound[t]||new Set()); inbound[t].add(f);});
}
console.log("PAGE                                   WORDS TITLE_LEN DESC_LEN H1 CANON OG SCHEMA INLINKS");
const problems=[];
for(const f of files){ if(f==="/404.html")continue; const d=data[f];
  const key=f, alt=f.replace(/\/index\.html$/,"/");
  const inl=new Set([...(inbound[key]||[]),...(inbound[alt]||[])]); inl.delete(f);
  console.log(`${f.padEnd(38)} ${String(d.words).padStart(5)} ${String(d.title.length).padStart(9)} ${String(d.desc.length).padStart(8)} ${String(d.h1.length).padStart(2)} ${d.canonical?"y":"N"}     ${d.og?"y":"N"}  ${(d.schema.join("/")||"-").slice(0,32).padEnd(32)} ${inl.size}`);
  if(!d.canonical&&!d.noindex) problems.push(`${f}: NO canonical`);
  // A noindex page has no search snippet to write, so this is not a defect
  // there — same exemption the canonical and og:image checks already make.
  if(!d.desc&&!d.noindex) problems.push(`${f}: NO meta description`);
  if(d.title.length>62) problems.push(`${f}: title ${d.title.length} chars (truncates in SERP)`);
  if(d.desc.length>165) problems.push(`${f}: description ${d.desc.length} chars`);
  if(d.h1.length!==1) problems.push(`${f}: ${d.h1.length} H1 tags`);
  if(!d.og&&!d.noindex) problems.push(`${f}: no og:image`);
  if(d.schema.includes("PARSE_ERROR")) problems.push(`${f}: INVALID JSON-LD`);
  if(inl.size===0&&!d.noindex&&f!=="/index.html") problems.push(`${f}: ORPHAN (0 internal inbound links)`);
  if(d.imgNoAlt) problems.push(`${f}: ${d.imgNoAlt} img without alt`);
}
// broken internal links
const all=new Set(files.map(f=>f)); const broken=new Set();
for(const f of files){ if(!data[f])continue;
  for(const h of data[f].links){ let t=h.split("#")[0].split("?")[0]; if(!t||!t.startsWith("/"))continue;
    if(t.endsWith("/"))t+="index.html";
    if(!all.has(t)&&!existsSync(join(ROOT,t))) broken.add(`${f} -> ${h}`);}}
console.log("\n=== PROBLEMS ==="); problems.forEach(p=>console.log("  "+p));
console.log("\n=== BROKEN INTERNAL LINKS ==="); [...broken].forEach(p=>console.log("  "+p));
await b.close(); srv.close();
