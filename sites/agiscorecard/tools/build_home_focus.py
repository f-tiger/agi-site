#!/usr/bin/env python3
"""Render marked discovery/status fragments. Never regrade or date-stamp evidence.

Run after generators and before feed/agent mirrors. --check is read-only.
The ledger date and score come from data.json; site changes come from changelog.json.
"""
from pathlib import Path
import json
import re
import sys
from html import escape

ROOT = Path(__file__).resolve().parents[1]
WEIGHTS = {'On track': 1, 'Holding': 1, 'Exceeded': 1, 'Open': .5, 'Pending': .5, 'Wrong': 0}

def region(text, key, body):
    pattern = rf'<!-- {key}:start -->.*?<!-- {key}:end -->'
    replacement = f'<!-- {key}:start -->\n{body}\n<!-- {key}:end -->'
    if not re.search(pattern, text, re.S):
        raise ValueError(f'Missing managed region: {key}')
    return re.sub(pattern, lambda _: replacement, text, flags=re.S)

def action(href, label, key, cls=''):
    return f'<a href="{escape(href, quote=True)}" data-focus-action="{key}" class="{cls}">{label}</a>'

def assets(text):
    if '/home-focus/focus.css' not in text:
        text = text.replace('</head>', '<link rel="stylesheet" href="/home-focus/focus.css?v=1">\n<script type="module" src="/home-focus/focus.js?v=1"></script>\n</head>')
    if '/evidence-assets/evidence.js' not in text:
        text=text.replace('</head>', '<script type="module" src="/evidence-assets/evidence.js"></script>\n</head>')
    return text

def countdown(zh):
    base='/zh' if zh else ''
    units=[('days','天','Days'),('hours','时','Hours'),('min','分','Minutes'),('sec','秒','Seconds')]
    cells=''.join(f'<div class="focus-clock-unit"><span id="cd-{key}" class="focus-clock-number">—</span><span class="focus-clock-unit-label">{cn if zh else en}</span></div>' for key,cn,en in units)
    return f'''<section class="focus-countdown" id="milestones" aria-labelledby="countdown-title" data-release="agi-countdown-20261002" data-countdown-target="2027-01-01T00:00:00Z" data-countdown-lang="{'zh' if zh else 'en'}">
<h2 id="countdown-title">{'AGI 2027 倒计时' if zh else 'AGI 2027 countdown'}</h2>
<div class="focus-clock" role="timer" aria-live="off" aria-label="{'距离 2027 年元旦的剩余时间' if zh else 'Time remaining until the start of 2027'}">{cells}</div>
<p class="focus-clock-date">{'观察节点：' if zh else 'Observation point: '}<time datetime="2027-01-01T00:00:00Z">2027-01-01 00:00 UTC</time></p>
<p class="focus-clock-note">{'追踪 2027 年窗口的开启，不代表 AGI 会在当天到来。本站对“2027 年底前实现”预测的判定截止为 2028-01-01。' if zh else 'Counting down to the start of the 2027 window, not a promised AGI arrival date. Our deadline for judging the by-end-of-2027 prediction is January 1, 2028.'}</p>
<div class="focus-clock-links"><a href="{base}/will-agi-arrive-2027#cite-evidence">{'查看预测与判定条件' if zh else 'Read the prediction and criteria'}</a><button type="button" id="cd-pause" aria-pressed="false" hidden>{'暂停计时' if zh else 'Pause clock'}</button></div>
<details class="focus-clock-embed"><summary>{'把倒计时嵌入你的网站（英文组件）' if zh else 'Embed the countdown on your site'}</summary><p><a href="/widget">{'预览嵌入组件' if zh else 'Preview the widget'}</a></p><code>&lt;iframe src="https://agiscorecard.com/widget" width="360" height="200" style="border:0;border-radius:12px" title="AGI 2027 countdown" loading="lazy"&gt;&lt;/iframe&gt;</code></details>
<noscript><p class="focus-clock-note">{'启用 JavaScript 可显示实时倒计时；观察节点如上。' if zh else 'Enable JavaScript for the live clock; the observation date is shown above.'}</p></noscript>
</section>'''

def hero(d, zh):
    score=d['thesisTracker']['score']; date=d['thesisTracker']['asOf']; n=len(d['predictions'])
    base='/zh' if zh else ''
    headline='AI 进展到了哪一步？' if zh else 'How close are we to AGI?'
    intro=('对照证据，追踪《态势感知》的 '+str(n)+' 项预测。看懂已经发生的变化、仍未兑现的承诺，以及它们对工作和投资研究的意义。' if zh else
           f'Track {n} predictions from Situational Awareness against the evidence. See what has held up, what remains unresolved, and what it means for work and investment research.')
    score_label='AGI-2027 命题追踪指数' if zh else 'AGI-2027 Thesis Tracker'
    evidence_note='已发布判定的综合分数，不是 AGI 发生概率。' if zh else 'A composite of published verdicts, not the probability of AGI.'
    stamp=('台账记录日期' if zh else 'Ledger reading dated')+f' <time datetime="{date}">{date}</time>'
    cases=[(base+'/progress-index','查证据' if zh else 'Check the evidence','逐项核对判定、来源与改变结论的条件。' if zh else 'Inspect each verdict, source and condition for changing it.','evidence'),
           (base+'/ai-and-your-job','判断工作影响' if zh else 'Understand work changes','区分已观测的就业数据与未来预测。' if zh else 'Separate observed employment data from forecasts.','work'),
           (base+'/invest','研究 AI 投资' if zh else 'Research AI investments','核对公开持仓与研究假设，再看风险。' if zh else 'Check public holdings, assumptions and risks.','invest')]
    routes=''.join(action(href,f'<strong>{title}</strong><span>{desc}</span>','route_'+key,'focus-route') for href,title,desc,key in cases)
    desk=evidence_desk(d,zh)
    return f'''<section class="focus-intro" aria-labelledby="focus-title" data-release="agi-focus-20261001">
  <div class="focus-opening"><div><h1 id="focus-title">{headline}</h1>{countdown(zh)}<p class="focus-lead">{intro}</p>
  <div class="focus-actions">{action(base+'/progress-index#cite-evidence','查看证据与变化' if zh else 'Inspect evidence and changes','hero_evidence','focus-primary')}{action('#grade-game','给出我的判断' if zh else 'Make my own assessment','hero_grade','focus-secondary')}</div></div>
  <aside class="focus-reading" aria-label="{score_label}"><p>{score_label}</p><div class="focus-score">{score}<span>/100</span></div><p>{evidence_note}</p><p class="focus-date">{stamp}</p><a href="{base}/progress-index">{'核对计算方法与历史' if zh else 'Inspect the method and history'}</a></aside></div>
  {desk}
  <nav class="focus-routes" aria-label="{'选择用途' if zh else 'Choose your task'}">{routes}</nav>
  <p class="focus-boundary">{'判定记录与网站更新分开标注。页面改版不代表证据重新核验。' if zh else 'Evidence dates and site updates are shown separately. A site update does not mean a verdict was reassessed.'}</p>
</section>'''

def evidence_desk(d,zh):
    base='/zh' if zh else ''
    cases=[('progress','progress-index','分数与历史','Score and history'),('agi2027','will-agi-arrive-2027','2027 预测怎么判定','What resolves the 2027 prediction?'),('open','did-open-source-ai-fade','开源与闭源的能力差距','Open vs closed capability gap'),('work','ai-and-your-job','哪些证据说明工作在变','Which evidence shows work changing?')]
    links=''.join(action(base+'/'+slug+'#cite-evidence',cn if zh else en,'asset_'+key) for key,slug,cn,en in cases)
    return f'''<section class="focus-evidence-desk" id="evidence-desk" aria-labelledby="desk-heading"><h2 id="desk-heading">{'最新查证补充' if zh else 'Latest evidence notes'}</h2><p><time datetime="2026-10-02">2026-10-02</time> — {'补齐开放权重模型差距的研究区间：2026 年 1—5 月，平均约 4 个月；更严格比较约 6 个月。' if zh else 'Clarified the open-weight model gap: January–May 2026 study window, about 4 months on average; about 6 under a stricter comparison.'}</p><p class="focus-boundary">{'最新判定台账仍为 ' if zh else 'Latest verdict ledger remains dated '}{d['thesisTracker']['asOf']}{'。本次是来源说明与展示更新，不是新的判定。' if zh else '. This is a source-note and presentation update, not a new verdict.'}</p><nav aria-label="{'四个证据主题' if zh else 'Four evidence topics'}">{links}</nav></section>'''

def grade(zh):
    return f'''<section class="focus-grade section" id="grade-game" aria-labelledby="grade-title" data-grade-lang="{'zh' if zh else 'en'}">
<h2 id="grade-title">{'你会给这 8 项预测打几分？' if zh else 'How would you grade these 8 predictions?'}</h2>
<p>{'逐项选择已兑现、未决或落空，得到你的分数与台账的分歧。无需注册。' if zh else 'Choose delivered, unresolved or failed for each prediction. See your score and where you differ from the ledger. No account needed.'}</p>
<p class="focus-boundary">{'权重：已兑现 1、未决 0.5、落空 0；各项等权取平均。' if zh else 'Equal weights: delivered = 1, unresolved = 0.5, failed = 0. The score is their mean × 100.'}</p>
<button type="button" id="gg-start" class="focus-secondary">{'开始逐项判断' if zh else 'Start my assessment'}</button>
<div id="gg-wrap" hidden><p id="gg-status" role="status"></p><div id="gg-rows"></div><p id="gg-live" aria-live="polite"></p>
<div id="gg-result" hidden><h3>{'我的分数' if zh else 'My score'} <span id="gg-score"></span>/100</h3><p id="gg-verdict-line"></p><div id="gg-diffs"></div>
<div class="focus-actions"><button type="button" id="gg-copy" class="focus-primary">{'复制判断摘要' if zh else 'Copy result summary'}</button>{action('/zh/progress-index' if zh else '/progress-index','核对台账' if zh else 'Inspect the ledger','grade_evidence','focus-secondary')}<button type="button" id="gg-reset" class="focus-secondary">{'重新判断' if zh else 'Start again'}</button></div>
<p id="gg-copy-status" role="status"></p><textarea id="gg-copy-fallback" readonly hidden aria-label="{'可手动复制的结果' if zh else 'Result to copy manually'}"></textarea>
<p class="focus-boundary">{'每项选择与分数仅在本页计算；统计只记录开始、完成及复制成功，不包含你的评分。复制内容是文字摘要与页面链接，不会生成公开个人档案。' if zh else 'Choices and scores stay in this page. Analytics counts starts, completions and successful copies without your grades. The copy contains a text summary and a page link; no public profile is created.'}</p><p><a href="https://agiscorecard.beehiiv.com/subscribe" onclick="gtag('event','subscribe_click',{{location:'grade_result'}});">{'登记邮箱，关注判定变化' if zh else 'Register for verdict-change updates'}</a></p></div></div>
<noscript><p>{'请启用 JavaScript 使用评分；你仍可阅读' if zh else 'Enable JavaScript for the assessment, or read the'} <a href="{'/zh' if zh else ''}/progress-index">{'完整台账与方法' if zh else 'full ledger and method'}</a>。</p></noscript>
</section>'''

def changes(cl, zh):
    entries=sorted(cl['entries'],key=lambda x:x['date'],reverse=True)[:3]
    if zh and any(not e.get('title_zh') for e in entries):
        raise ValueError('Recent changelog entries need title_zh for the Chinese homepage')
    rows=''.join(f'<li><time datetime="{e["date"]}">{e["date"]}</time><span>{escape(e["title_zh"] if zh else e["title"])}</span></li>' for e in entries)
    return f'''<section class="focus-changes section" id="changelog"><h2>{'最近的网站更新' if zh else 'Recent site changes'}</h2><p>{'这些是功能或证据展示的变更；判定日期见上方台账。' if zh else 'Changes to features and evidence presentation. Verdict dates remain attached to the ledger.'}</p><ol>{rows}</ol>{action('/changelog','完整变更记录（英文）' if zh else 'Full change history','changelog')}</section>'''

def context(d,zh,page_date):
    base='/zh' if zh else '';score=d['thesisTracker']['score'];date=d['thesisTracker']['asOf']
    return f'''<aside class="evidence-context" aria-label="{'证据与版本' if zh else 'Evidence and versions'}"><p>{'本文版本日期' if zh else 'Article version dated'}: <time>{page_date}</time> · {'台账读数日期' if zh else 'Ledger reading dated'}: <time>{date}</time></p><p>{'命题追踪分数' if zh else 'Thesis score'}: <strong>{score}/100</strong> — {'编辑判定综合分数，不是概率。' if zh else 'an editorial composite, not a probability.'}</p><nav>{action(base+'/progress-index','方法与历史' if zh else 'Method and history','context_method')} {action('/data.json','公开判定数据 JSON' if zh else 'Public verdict data (JSON)','context_data')} {action('/index-history.json','分数历史 JSON' if zh else 'Score history (JSON)','context_history')}</nav></aside>'''

def render():
    d=json.loads((ROOT/'data.json').read_text());cl=json.loads((ROOT/'changelog.json').read_text())
    score=round(sum(WEIGHTS[p['verdict']] for p in d['predictions'])/len(d['predictions'])*100,1)
    if score != d['thesisTracker']['score']: raise ValueError('Ledger score does not match published weights')
    out={}
    for name,zh in [('index.html',False),('cn.html',True)]:
        p=ROOT/name;s=assets(p.read_text())
        if '/home-focus/countdown.js' not in s:
            s=s.replace('</head>', '<script type="module" src="/home-focus/countdown.js"></script>\n</head>')
        if not zh:
            # Migrate the buried clock to the generated hero; keep its old anchor.
            s=re.sub(r'  <!-- MAIN COUNTDOWN -->.*?(?=  <!-- VOTE WIDGET -->)', '', s, count=1, flags=re.S)
            s=re.sub(r'const pageOpenTime = Date.now\(\);.*?setInterval\(updateCountdown, 1000\);\n', '', s, count=1, flags=re.S)
        s=region(s,'home-focus',hero(d,zh));s=region(s,'home-grade',grade(zh));s=region(s,'home-changes',changes(cl,zh))
        title='AGI 倒计时、进展与预测证据 | AGI 记分牌' if zh else 'AGI Countdown, Progress & Prediction Evidence | AGI Scorecard'
        desc='查看 2027 年观察节点倒计时，追踪《态势感知》的 8 项 AGI 预测。核对来源与判定条件，自行评分，了解 AI 对工作与投资研究的影响。' if zh else 'Watch the countdown to the 2027 observation window and track 8 AGI predictions against evidence. Check sources and verdicts, make your own assessment, and explore work and investment impacts.'
        s=re.sub(r'<title>.*?</title>',f'<title>{title}</title>',s,flags=re.S)
        for attr,key,val in [('name','description',desc),('property','og:title',title),('property','og:description',desc),('name','twitter:title',title),('name','twitter:description',desc)]:
            s=re.sub(rf'<meta {attr}="{key}" content="[^"]*">',f'<meta {attr}="{key}" content="{escape(val,quote=True)}">',s)
        if not zh:
            s=re.sub(r'Graded June 2026 · <span style="color:var\(--accent2\);">Last updated: [^<]+</span>',f'Ledger reading dated <span style="color:var(--accent2);">{d["thesisTracker"]["asOf"]}</span>',s)
            # Only Dataset date changes to its existing source date; no date is invented.
            def dataset(m):
                obj=json.loads(m[1])
                if obj.get('@type')=='Dataset':obj['dateModified']=d['dateModified']
                return '<script type="application/ld+json">'+json.dumps(obj,ensure_ascii=False)+'</script>'
            s=re.sub(r'<script type="application/ld\+json">(.*?)</script>',dataset,s,flags=re.S)
        out[p]=s
    for slug in ['progress-index','ai-and-your-job']:
        for zh in [False,True]:
            p=ROOT/('zh/' if zh else '')/(slug+'.html');s=assets(p.read_text())
            page_date=re.search(r'"dateModified":\s*"([0-9-]{10})"',s)[1]
            if '<!-- evidence-context:start -->' not in s:
                s=re.sub(r'(<div class="updated">.*?</div>)',r'\1\n<!-- evidence-context:start --><!-- evidence-context:end -->',s,count=1,flags=re.S)
            s=region(s,'evidence-context',context(d,zh,page_date))
            if zh and slug=='progress-index':
                s=re.sub(r'最后更新：[0-9年日月]+',f'最后更新：{page_date[:4]}年{int(page_date[5:7])}月{int(page_date[8:])}日',s)
            out[p]=s
    return out

if __name__=='__main__':
    changeset={p:s for p,s in render().items() if p.read_text()!=s}
    if '--check' in sys.argv:
        if changeset:sys.exit('Home/evidence fragments are stale: '+', '.join(str(p.relative_to(ROOT)) for p in changeset))
        print('Home focus and evidence dates: OK')
    else:
        for p,s in changeset.items():p.write_text(s)
        print(f'Home focus: updated {len(changeset)} pages; ledger and history unchanged')
