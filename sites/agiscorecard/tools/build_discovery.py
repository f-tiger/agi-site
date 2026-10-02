#!/usr/bin/env python3
"""Source-derived discovery fragments; never changes verdicts or their dates."""
import json
import re
import sys
from html import escape
from pathlib import Path
from build_home_focus import ROOT, WEIGHTS, region

ORIGIN = 'https://agiscorecard.com'

def answers(d, zh):
    t=d['thesisTracker']; n=len(d['predictions']); score=t['score']; date=t['asOf']
    counts=[sum(WEIGHTS[p['verdict']]==w for p in d['predictions']) for w in [1,.5,0]]
    if zh:
        return [
            ('AGI 命题追踪指数衡量什么？',f'它汇总《态势感知》的 {n} 项预测在本站公开台账中的判定。{date} 的记录为 {score}/100：{counts[0]} 项支持、{counts[1]} 项未决、{counts[2]} 项反驳。它不是衡量所有 AI 能力的通用基准。'),
            (f'{score} 分代表 AGI 有 {score}% 的发生概率吗？','不是。每项判定等权计算：支持取 1、未决取 0.5、反驳取 0，平均值乘以 100。这是编辑判定的综合分数，不是概率预测，也不表示 AGI 已经实现。'),
            ('怎样复算或引用这个分数？',f'读取 data.json 中的 predictions 与 thesisTracker，按公开权重复算；用 index-history.json 核对历史。引用时写明 AGI Scorecard、台账日期 {date} 和原始数据链接。数据采用 CC BY 4.0；网站改版日期不能替代证据日期。'),
            ('AGI 倒计时到零就代表 AGI 实现了吗？','不是。倒计时指向 2027 年 1 月 1 日 00:00 UTC，即观察窗口的开始，不是 AGI 到来的保证。本站对“2027 年底前实现”预测的判定截止为 2028 年 1 月 1 日，仍需核对公开证据。'),
            ('怎样参与 AGI 时间投票？','在首页倒计时下方选择一个时间段，即可查看预测类型与历史作答分布，并复制、分享或在本机保存判断。无需注册。分布统计的是作答次数，可能重复，不代表独立人数或民意调查。')]
    return [
        ('What does the AGI Thesis Tracker measure?',f'It summarizes {n} Situational Awareness predictions in our published ledger. The {date} reading is {score}/100: {counts[0]} supportive, {counts[1]} unresolved and {counts[2]} refuted. It is not a general benchmark of all AI capabilities.'),
        (f'Does {score}/100 mean a {score}% probability of AGI?','No. Each verdict has equal weight: supportive = 1, unresolved = 0.5 and refuted = 0. The mean is multiplied by 100. This is an editorial composite, not a probability forecast or a finding that AGI has arrived.'),
        ('How can I reproduce or cite the score?',f'Read predictions and thesisTracker in data.json, recompute the published weights, and inspect index-history.json for past readings. Cite AGI Scorecard, the ledger date {date} and the original data URL. The dataset is CC BY 4.0; a site redesign date is not an evidence date.'),
        ('Does the AGI countdown reaching zero mean AGI has arrived?','No. It counts down to January 1, 2027 at 00:00 UTC, the start of the observation window, not a promised AGI arrival. Our deadline for judging the by-end-of-2027 prediction is January 1, 2028, and still requires public evidence.'),
        ('How can I vote on when AGI arrives?','Choose a time window below the homepage countdown to see your prediction type and historical answers, then copy, share or save your prediction on this device. No account is needed. Counts are answers, may repeat, and are not unique people or a representative survey.')]

def render():
    d=json.loads((ROOT/'data.json').read_text());out={}
    for name,zh in [('index.html',False),('cn.html',True)]:
        p=ROOT/name;s=p.read_text();qas=answers(d,zh);base='/zh' if zh else '';url=ORIGIN+('/cn' if zh else '/')
        # Migration replaces the old duplicated FAQ prose, retaining the link directory.
        if '<!-- discovery-faq:start -->' not in s:
            if not zh:
                start=s.index('    <div style="background: var(--bg2);',s.index('id="faq"'))
                end=s.index('    <div style="display:flex;',start)
                s=s[:start]+'<!-- discovery-faq:start --><!-- discovery-faq:end -->\n'+s[end:]
            else:
                s=s.replace('<!-- home-changes:start -->','<section class="focus-grade" id="faq"><h2>常见问题</h2><!-- discovery-faq:start --><!-- discovery-faq:end --></section>\n<!-- home-changes:start -->',1)
        s=region(s,'discovery-faq','\n'.join(f'<div class="discovery-question"><h3 class="faq-q">{escape(q)}</h3><p>{escape(a)}</p></div>' for q,a in qas))
        if '<!-- discovery-citation:start -->' not in s:
            s=s.replace('<!-- home-focus:end -->','<!-- home-focus:end -->\n<!-- discovery-citation:start --><!-- discovery-citation:end -->',1)
        citation=(f'AGI 记分牌，《AGI-2027 命题追踪指数》，台账日期 {d["thesisTracker"]["asOf"]}，{d["thesisTracker"]["score"]}/100。' if zh else f'AGI Scorecard, “AGI-2027 Thesis Tracker,” ledger dated {d["thesisTracker"]["asOf"]}, {d["thesisTracker"]["score"]}/100.')
        links=[(base+'/progress-index','方法与历史' if zh else 'Method and history'),('/data.json','原始数据 JSON' if zh else 'Original data (JSON)'),('/calibration','核验记录（英文）' if zh else 'Verify the records'),('/about','编辑方法与独立性（英文）' if zh else 'Editorial method and independence')]
        body=f'<section class="focus-citation" id="evidence-summary" data-release="agi-discovery-20261001" aria-label="{"证据摘要与引用" if zh else "Evidence summary and citation"}"><p class="capsule">{escape(qas[0][1])}</p><details><summary>{"引用这份台账" if zh else "Cite this ledger"}</summary><p>{escape(citation)} <a href="/data.json">https://agiscorecard.com/data.json</a></p><p>{"按 CC BY 4.0 署名引用；保留记录日期与判定的不确定性。" if zh else "Reuse with attribution under CC BY 4.0. Preserve the reading date and the uncertainty of each verdict."}</p></details><nav>'+''.join(f'<a href="{href}">{text}</a>' for href,text in links)+'</nav></section>'
        s=region(s,'discovery-citation',body)
        # Home schema is generated from the same strings readers see, not an old FAQ copy.
        title=re.search(r'<title>(.*?)</title>',s)[1]
        desc=re.search(r'<meta name="description" content="([^"]*)"',s)[1]
        org={'@type':'Organization','@id':ORIGIN+'/#publisher','name':'The AGI Scorecard','url':ORIGIN+'/','logo':ORIGIN+'/og-image.png'}
        graph=[org,{'@type':'WebSite','@id':ORIGIN+'/#website','name':'The AGI Scorecard','url':ORIGIN+'/','publisher':{'@id':org['@id']}},
            {'@type':'WebPage','@id':url+'#webpage','url':url,'name':title,'description':desc,'inLanguage':'zh-CN' if zh else 'en','isPartOf':{'@id':ORIGIN+'/#website'},'mainEntity':{'@id':ORIGIN+'/#dataset'}},
            {'@type':'Dataset','@id':ORIGIN+'/#dataset','name':'AGI-2027 Thesis Tracker','description':answers(d,False)[0][1],'url':ORIGIN+'/','dateModified':d['dateModified'],'license':'https://creativecommons.org/licenses/by/4.0/','creator':{'@id':org['@id']},'isAccessibleForFree':True,'measurementTechnique':d['thesisTracker']['method'],'distribution':[{'@type':'DataDownload','encodingFormat':'application/json','contentUrl':ORIGIN+'/data.json'}]},
            {'@type':'FAQPage','@id':url+'#faq','inLanguage':'zh-CN' if zh else 'en','mainEntity':[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in qas]}]
        schema='<script type="application/ld+json">'+json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False).replace('<','\\u003c')+'</script>'
        if '<!-- discovery-schema:start -->' not in s:
            s=re.sub(r'<script[^>]*type="application/ld\+json"[^>]*>.*?</script>\s*','',s,flags=re.S)
            s=s.replace('</head>','<!-- discovery-schema:start --><!-- discovery-schema:end -->\n</head>',1)
        s=region(s,'discovery-schema',schema)
        if zh:
            s=s.replace('<meta property="og:type" content="article">','<meta property="og:type" content="website">')
            if 'name="twitter:title"' not in s:s=s.replace('</head>',f'<meta name="twitter:title" content="{escape(title,quote=True)}">\n<meta name="twitter:description" content="{escape(desc,quote=True)}">\n</head>')
            if 'name="twitter:card"' not in s:s=s.replace('</head>','<meta name="twitter:card" content="summary_large_image">\n<meta property="og:image" content="https://agiscorecard.com/og-image.png">\n<meta name="twitter:image" content="https://agiscorecard.com/og-image.png">\n</head>')
        out[p]=s
    p=ROOT/'llms.txt';s=p.read_text()
    intro='# The AGI Scorecard\n\n> '+answers(d,False)[0][1]+'\n\nThe score is an editorial composite, not a probability. Cite the ledger date and source URL; preserve unresolved verdicts. Method and history: https://agiscorecard.com/progress-index · Original source data: https://agiscorecard.com/data.json (CC BY 4.0).\n\n'
    s=re.sub(r'\A.*?(?=Full content in one fetch:)',lambda _:intro,s,count=1,flags=re.S)
    s=s.replace('and every top-level English page has a Markdown mirror at its URL + ".md"','with homepage mirrors at /index.md and /cn.md, top-level English mirrors at each URL + ".md", and selected Chinese evidence mirrors')
    s=re.sub(r'\[AGI-2027 Thesis Tracker\].*?\n',f'[AGI-2027 Thesis Tracker]({ORIGIN}/progress-index): {d["thesisTracker"]["score"]}/100, ledger dated {d["thesisTracker"]["asOf"]}; equal-weight verdict composite, not a probability. History: /index-history.json.\n',s,count=1)
    out[p]=s
    return out

if __name__=='__main__':
    changed={p:s for p,s in render().items() if p.read_text()!=s}
    if '--check' in sys.argv:
        if changed:sys.exit('Discovery fragments stale: '+', '.join(p.name for p in changed))
        print('Discovery: visible answers, schema and ledger references agree')
    else:
        for p,s in changed.items():p.write_text(s)
        print(f'Discovery: updated {len(changed)} files; evidence dates unchanged')
