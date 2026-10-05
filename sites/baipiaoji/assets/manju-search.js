/* Shared deterministic search/recommendation logic; no external model or query logging. */
(() => {
 const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
 const aliases=[['修仙','修真','仙侠'],['甜宠','恋爱','爱情'],['霸总','总裁','豪门'],['丧尸','末世','末日'],['悬疑','探案','推理'],['搞笑','喜剧','沙雕'],['萌宝','亲子','奶爸'],['种田','田园','乡村']];
 function terms(q){return String(q).normalize('NFKC').trim().toLowerCase().split(/[\s,，、；;]+/u).map(norm).filter(Boolean).slice(0,10);}
 function score(work,q){const ts=terms(q);if(!ts.length)return 1;const title=norm(work.title),tags=norm([work.genre,...(work.tags||[])].join(' ')),body=norm(work.search);let sum=0;
  for(const t of ts){const variants=aliases.find(g=>g.includes(t))||[t];let best=0;for(const v of variants){const exact=v===t;best=Math.max(best,title===v?120:title.includes(v)?(exact?55:35):tags.includes(v)?(exact?24:18):body.includes(v)?8:0);}if(!best)return 0;sum+=best;}
  return sum+(title===norm(q)?250:0);
 }
 function related(work,items,saved=[]){const seeds=work?[work]:items.filter(x=>saved.includes(x.id)),exclude=new Set(seeds.map(x=>x.id));if(!seeds.length)return [];
  return items.filter(x=>!exclude.has(x.id)).map(x=>{let best=0,reason='';for(const seed of seeds){if(x.channel!==seed.channel)continue;const common=(x.tags||[]).filter(t=>seed.tags?.includes(t)),same=x.category===seed.category,series=norm(x.seriesTitle)===norm(seed.seriesTitle)&&!!x.seriesTitle;const value=(same?4:0)+common.length*2+(series?6:0);if(value>best){best=value;reason=series?'同一系列名称':common.length?'共同标签：'+common.slice(0,3).join('、'):same?'相同题材：'+x.genre:'';}}return {...x,recommendationScore:best,reason};}).filter(x=>x.recommendationScore>0).sort((a,b)=>b.recommendationScore-a.recommendationScore||a.title.localeCompare(b.title,'zh-CN')).slice(0,6);
 }
 globalThis.ManjuSearch={norm,terms,score,related};
})();
