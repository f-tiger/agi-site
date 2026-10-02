#!/usr/bin/env python3
"""Citable panels from existing ledger + explicitly dated editorial source notes."""
from pathlib import Path
import json,re,sys
from html import escape as h
ROOT=Path(__file__).resolve().parents[1]
VERSION='2026-10-02'
CASES=[('progress','progress-index'),('agi2027','will-agi-arrive-2027'),('open','did-open-source-ai-fade'),('work','ai-and-your-job')]

def svg(kind,zh,d,hist):
    title={'progress':('Published score history','已发布分数历史'),'agi2027':('What would settle the 2027 prediction?','什么证据能判定 2027 预测？'),'open':('Open vs closed: measure the gap','开放权重与闭源：如何读差距'),'work':('Three signals, different questions','三种信号，回答不同问题')}[kind][zh]
    out=[f'<svg xmlns="http://www.w3.org/2000/svg" width="960" height="520" viewBox="0 0 960 520" role="img" aria-labelledby="title desc"><title id="title">{title}</title><desc id="desc">AGI Scorecard. {d["thesisTracker"]["asOf"]}. See the canonical page for sources and limitations.</desc><rect width="960" height="520" rx="16" fill="#171425"/><g font-family="Arial, PingFang SC, Noto Sans CJK SC, sans-serif" fill="#f4f2fc"><text x="40" y="54" font-size="28" font-weight="700">{title}</text>']
    def text(x,y,s,size=20,color='#f4f2fc'):out.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}">{h(str(s))}</text>')
    if kind=='progress':
        recent=hist[-6:];points=[]
        for val in [0,50,100]:
            y=350-val*2;out.append(f'<path d="M90 {y}H870" stroke="#50495f"/>');text(40,y+7,val,18,'#c3bbd8')
        for i,r in enumerate(recent):
            x=110+i*740/max(1,len(recent)-1);y=350-r['score']*2;points.append(f'{x},{y}')
            out.append(f'<circle cx="{x}" cy="{y}" r="6" fill="#c2abff"/>');text(x-35,y-18,r['score']);text(x-56,390,r['date'],17,'#c3bbd8')
        out.append(f'<polyline points="{" ".join(points)}" fill="none" stroke="#c2abff" stroke-width="3"/>')
        text(40,110,'综合判定分数；不是 AGI 概率' if zh else 'Editorial verdict score; not an AGI probability',21)
        text(40,436,'仅连接已存档读数；中间日期没有逐日记录。' if zh else 'Stored readings only. Connecting lines do not establish daily observations.',18,'#c3bbd8')
    else:
        rows={
          'agi2027': [('2024-06','原始命题：完成 AI 研究员或工程师的工作','Original claim: do the work of an AI researcher or engineer'),(d['thesisTracker']['asOf'],'台账：未决；不是模型榜单分数','Ledger: Open; a benchmark score alone does not resolve it'),('2028-01-01','本站判定期限；需要自主研究的可核验证据','Site resolution date; inspect verifiable autonomous research')],
          'open':[('2026-01 → 05','Epoch ECI 研究区间：1 月 1 日至 5 月 28 日','Epoch ECI analysis: January 1 through May 28'),('约 4 个月' if zh else '~4 months','平均能力时间差；不同统计规则下约 6 个月','Average time gap; about 6 months under the stricter rule'),('口径' if zh else 'Scope','开放权重不等于开源；基准领先不等于持久壁垒','Open weights ≠ open source; benchmark lead ≠ durable moat')],
          'work':[('情绪' if zh else 'Sentiment','情绪调查：人们担心什么？','Sentiment: what do people worry about?'),('任务暴露' if zh else 'Task exposure','任务暴露：AI 可以参与哪些任务？','Task exposure: which tasks can AI assist with?'),('就业' if zh else 'Employment','就业观察：实际发生了什么？','Employment: what actually happened?')]
        }[kind]
        for i,(label,cn,en) in enumerate(rows):
            y=125+i*98;out.append(f'<path d="M40 {y+60}H920" stroke="#50495f"/>');text(40,y,label,22,'#c2abff');text(40,y+36,cn if zh else en,20)
        text(40,440,('资料区间不等于今天的实时表现。' if zh else 'A dated source window is not a live reading.') if kind=='open' else ('示意图；不表示概率或因果证明。' if zh else 'Reading guide; not a probability or proof of causation.'),19,'#c3bbd8')
    text(40,488,'agiscorecard.com · CC BY 4.0 · '+(('台账 ' if zh else 'Ledger ')+d['thesisTracker']['asOf'] if kind in ('progress','agi2027') else ('说明版本 ' if zh else 'Note version ')+VERSION),18,'#c3bbd8')
    out.append('</g></svg>');return '\n'.join(out)

def render():
 d=json.loads((ROOT/'data.json').read_text());hist=json.loads((ROOT/'index-history.json').read_text());out={}
 for kind,slug in CASES:
  for zh in [False,True]:
   lang='zh' if zh else 'en';route=('/zh/' if zh else '/')+slug;path=ROOT/(route.lstrip('/')+'.html');s=path.read_text()
   titles={'progress':('Read the score with its history','把分数与历史一起看'),'agi2027':('A forecast needs a resolution rule','预测需要明确的判定条件'),'open':('A capability lead is not a permanent moat','能力领先不等于永久壁垒'),'work':('Separate exposure from job loss','区分任务暴露与岗位流失')}
   summaries={
   'progress':(f'The published ledger is {d["thesisTracker"]["score"]}/100, dated {d["thesisTracker"]["asOf"]}. Eight equally weighted judgments make up this score. It is not the probability that AGI arrives.',f'台账读数为 {d["thesisTracker"]["score"]}/100，日期 {d["thesisTracker"]["asOf"]}。分数来自 8 项等权判定，不是 AGI 到来的概率。'),
   'agi2027':('The ledger records this prediction as Open. Its operational test is autonomous AI research, with a site resolution date of 1 January 2028. This is the site’s interpretation, not a universal definition of AGI.','台账将此预测记为“未决”。本站以自主 AI 研究作为操作性标准，判定期限为 2028 年 1 月 1 日；这是本站口径，不是统一的 AGI 定义。'),
   'open':('Epoch’s January–May 2026 ECI analysis estimates a four-month average open-weight capability lag; a stricter comparison gives six months. Neither estimate measures every capability or proves a durable commercial moat.','Epoch 对 2026 年 1—5 月的 ECI 分析给出开放权重模型平均约 4 个月的能力时间差；更严格比较规则下约为 6 个月。它们不能代表所有能力，也不能证明持久的商业壁垒。'),
   'work':('Sentiment, task exposure and observed employment answer different questions. Use the dated studies below to inspect a specific task and cohort; do not convert a task-exposure percentage into a probability of losing your job.','情绪、任务暴露和实际就业回答不同问题。请按下文研究的日期、任务和人群核对；不要把任务暴露比例当成个人失业概率。')}
   sources={'progress':[('/data.json','Published verdict ledger / 已发布判定台账'),('/index-history.json','Archived score readings / 已存档分数')],
   'agi2027':[('https://situational-awareness.ai/from-gpt-4-to-agi/','Aschenbrenner, June 2024'),('/data.json','Site resolution rule / 本站判定规则')],
   'open':[('https://epoch.ai/data-insights/open-closed-eci-gap','Edwards & Emberson, Epoch AI (2026)'),('https://epoch.ai/publications/open-models-report','Epoch AI: definitions and earlier research')],
   'work':[('https://github.com/microsoft/working-with-ai','Microsoft Research: Working with AI'),('https://budgetlab.yale.edu/research/evaluating-impact-ai-labor-market-current-state-affairs','Yale Budget Lab: employment tracker')]}
   # Date is for this source note, never a regrading of the underlying ledger.
   title=titles[kind][zh];summary=summaries[kind][zh];file=f'evidence-assets/{kind}-{lang}.svg'
   out[ROOT/file]=svg(kind,zh,d,hist)
   linked=''.join(f'<li><a href="{h(url,quote=True)}" data-evidence-action="source_open">{h(label)}</a></li>' for url,label in sources[kind])
   history=('分数历史只有已存档读数，没有逐项判定的完整变更日志。' if zh else 'The archive contains score readings, not a complete history of individual verdict changes.')
   if kind=='open':history=('本次补充精确研究区间和统计规则；保留 9 月 6 日台账判定。' if zh else 'This note adds the exact study window and comparison rule; the September 6 ledger verdict is retained.')
   citation=f'AGI Scorecard. {title}. '+('引用说明版本 ' if zh else 'Citation note version ')+VERSION+f'; '+('台账 ' if zh else 'ledger ')+d['thesisTracker']['asOf']+f'. https://agiscorecard.com{route}. CC BY 4.0.'
   panel=f'''<!-- evidence-asset:start -->
<section class="evidence-asset" id="cite-evidence" data-evidence-key="{kind}" data-evidence-lang="{lang}" data-release="agi-evidence-20261002" aria-labelledby="evidence-heading">
<h2 id="evidence-heading">{title}</h2><p class="evidence-answer">{summary}</p>
<p class="evidence-stamp">{'引用说明版本' if zh else 'Citation note version'}: <time datetime="{VERSION}">{VERSION}</time> · {'台账日期' if zh else 'Ledger date'}: <time>{d['thesisTracker']['asOf']}</time></p>
<figure><a href="/{file}" target="_blank" rel="noopener" aria-label="{'打开完整图表' if zh else 'Open full-size chart'}"><img src="/{file}" width="960" height="520" alt="{h(title)}" loading="lazy"></a><figcaption>{history}</figcaption></figure>
<details><summary>{'核对原始来源与口径' if zh else 'Inspect sources and scope'}</summary><ul>{linked}</ul><p>{'来源会持续更新；引用时保留研究区间。说明版本不代表全部旧文重新核验。' if zh else 'Sources may evolve. Retain their study window when citing. The note version does not mean the entire older article was reassessed.'}</p></details>
<div class="evidence-actions"><button type="button" data-evidence-action="citation_copy">{'复制引用' if zh else 'Copy citation'}</button><button type="button" data-evidence-action="share_copy">{'复制分享链接' if zh else 'Copy share link'}</button><button type="button" data-evidence-action="png_download">{'保存图表 PNG' if zh else 'Save chart (PNG)'}</button><a href="/{file}" download="agi-{kind}-{lang}.svg" data-evidence-action="chart_download">{'下载图表 SVG' if zh else 'Download chart (SVG)'}</a></div>
<p class="evidence-status" role="status"></p><textarea class="evidence-fallback" readonly hidden aria-label="{'手动复制内容' if zh else 'Text to copy manually'}"></textarea><p class="evidence-citation">{h(citation)}</p>
<a class="evidence-next" href="{'/cn' if zh else '/'}#grade-game" data-evidence-action="assessment_open">{'看过证据，给出你的判断' if zh else 'Use the evidence to make your assessment'}</a>
</section><!-- evidence-asset:end -->'''
   pat=r'<!-- evidence-asset:start -->.*?<!-- evidence-asset:end -->'
   if re.search(pat,s,re.S):s=re.sub(pat,lambda _:panel,s,flags=re.S)
   else:s=re.sub(r'(<div class="updated">.*?</div>)',lambda m:m[0]+'\n'+panel,s,count=1,flags=re.S)
   if panel not in s:raise ValueError('missing insertion anchor '+route)
   if '/evidence-assets/evidence.js' not in s:s=s.replace('</head>','<link rel="stylesheet" href="/evidence-assets/evidence.css">\n<script type="module" src="/evidence-assets/evidence.js"></script>\n</head>')
   # Add a visible-note schema separately from the original article's dated evidence.
   note={'@context':'https://schema.org','@type':'CreativeWork','@id':'https://agiscorecard.com'+route+'#cite-evidence','name':title,'text':summary,'inLanguage':'zh-CN' if zh else 'en','datePublished':VERSION,'dateModified':VERSION,'license':'https://creativecommons.org/licenses/by/4.0/','creator':{'@type':'Organization','name':'AGI Scorecard'},'citation':[url if url.startswith('https://') else 'https://agiscorecard.com'+url for url,label in sources[kind]],'image':'https://agiscorecard.com/'+file}
   schema='<!-- evidence-schema:start --><script type="application/ld+json">'+json.dumps(note,ensure_ascii=False).replace('<','\\u003c')+'</script><!-- evidence-schema:end -->'
   if '<!-- evidence-schema:start -->' in s:s=re.sub(r'<!-- evidence-schema:start -->.*?<!-- evidence-schema:end -->',lambda _:schema,s,flags=re.S)
   else:s=s.replace('</head>',schema+'\n</head>')
   out[path]=s
 return out
if __name__=='__main__':
 changes={p:s for p,s in render().items() if not p.exists() or p.read_text()!=s}
 if '--check' in sys.argv:
  if changes:sys.exit('Stale evidence assets: '+', '.join(str(p.relative_to(ROOT)) for p in changes))
  print('Evidence assets: four bilingual topics, source dates and charts current')
 else:
  for p,s in changes.items():p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
  print('Evidence assets updated:',len(changes))
