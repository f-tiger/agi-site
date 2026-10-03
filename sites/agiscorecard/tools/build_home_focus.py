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
<div class="focus-clock-links"><a href="#vote">{'你认为哪年实现？参与投票' if zh else 'When do you think AGI arrives? Vote'}</a><button type="button" id="cd-pause" aria-pressed="false" hidden>{'暂停计时' if zh else 'Pause clock'}</button></div>
<details class="focus-clock-embed"><summary>{'把倒计时嵌入你的网站（英文组件）' if zh else 'Embed the countdown on your site'}</summary><p><a href="/widget">{'预览嵌入组件' if zh else 'Preview the widget'}</a></p><code>&lt;iframe src="https://agiscorecard.com/widget" width="360" height="200" style="border:0;border-radius:12px" title="AGI 2027 countdown" loading="lazy"&gt;&lt;/iframe&gt;</code></details>
<noscript><p class="focus-clock-note">{'启用 JavaScript 可显示实时倒计时；观察节点如上。' if zh else 'Enable JavaScript for the live clock; the observation date is shown above.'}</p></noscript>
</section>'''

def poll(zh):
    options=[('accelerationist','2025–26','2025–26'),('true-believer','2027','2027'),('realist','2028–30','2028–30'),('skeptic','2030 年代','2030s'),('contrarian','永不 / 2040+','Never / 2040+')]
    buttons=''.join(f'<button type="button" data-vote="{slug}" aria-pressed="false">{cn if zh else en}</button>' for slug,cn,en in options)
    return f'''<section class="focus-poll" id="vote" aria-labelledby="vote-title" data-home-vote="{'zh' if zh else 'en'}" data-release="agi-vote-20261002">
<h2 id="vote-title">{'你认为 AGI 会在哪年到来？' if zh else 'When do you think AGI arrives?'}</h2>
<p>{'投下一票，看看你的 AGI 类型与大家的选择。无需注册。' if zh else 'Make your call. See your AGI type and how others answered. No account needed.'}</p>
<div class="focus-vote-options" role="group" aria-label="{'选择时间' if zh else 'Choose a time window'}">{buttons}</div>
<div id="vote-result" hidden><h3 id="vote-verdict" aria-live="polite"></h3><div id="vote-crowd" aria-live="polite"></div>
<div class="focus-vote-actions"><button type="button" id="vote-share">{'邀请朋友投票' if zh else 'Invite a friend'}</button><button type="button" id="vote-copy">{'复制我的判断' if zh else 'Copy my prediction'}</button><button type="button" id="vote-lock">{'保存判断（本机）' if zh else 'Save on this device'}</button></div>
<p id="vote-status" role="status"></p><textarea id="vote-copy-fallback" readonly hidden aria-label="{'手动复制的分享内容' if zh else 'Share text to copy manually'}"></textarea>
<p><a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&amp;utm_medium=post_vote" id="vote-subscribe">{'关注预测是否兑现' if zh else 'Follow whether the predictions hold up'}</a> · <a href="{'/zh' if zh else ''}/will-agi-arrive-2027#cite-evidence">{'核对判定条件' if zh else 'Inspect the criteria'}</a></p></div>
<p id="vote-saved" hidden></p><p class="focus-vote-note">{'统计为已记录的匿名作答次数，可能包含重复，不代表独立人数或民意调查。' if zh else 'Counts are recorded anonymous answers, may include repeats, and are not unique people or a representative survey.'}</p>
<noscript><p>{'请启用 JavaScript 参与投票。' if zh else 'Enable JavaScript to take part.'}</p></noscript>
</section>'''

def hero(d, zh):
    score=d['thesisTracker']['score']; date=d['thesisTracker']['asOf']; base='/zh' if zh else ''
    snapshot=json.loads((ROOT/'foresight-assets/home.json').read_text()); content=snapshot['locales']['zh' if zh else 'en']
    headline='看懂 AI 的变化，找到你的下一步。' if zh else 'Make sense of AI. Find your next step.'
    intro='从一条值得看的观点开始，了解工作、学习与未来正在发生什么。' if zh else 'Start with a perspective worth watching. Explore what AI means for work, learning and the future.'
    return f'''<section class="focus-intro home-editorial" aria-labelledby="focus-title" data-release="agi-focus-20261001">
<div class="home-opening"><div><h1 id="focus-title">{headline}</h1><p class="home-lead">{intro}</p></div><a class="focus-primary" href="{base}/future-guide" data-home-action="library">{'探索视频与观点' if zh else 'Explore videos & ideas'} ↗</a></div>
<div class="home-stats" id="home-stats">{content['stats']}</div>
<div class="home-hero-grid"><div id="home-feature">{content['feature']}</div><aside class="home-outlook" aria-label="{'AGI 倒计时与投票' if zh else 'AGI countdown and poll'}">{countdown(zh)}{poll(zh)}</aside></div>
<div id="home-feed">{content['feed']}</div>
<section class="home-next"><div><h2>{'看完之后，继续追问。' if zh else 'Turn a good question into a next step.'}</h2><p>{'收藏观点、核对证据，或让贾维斯围绕你的问题继续研究。' if zh else 'Save a perspective, inspect the evidence, or give Jarvis a question to investigate.'}</p></div><nav><a href="{base}/future-guide#notebook" data-home-action="notebook">{'我的收藏与行动' if zh else 'My saved views & actions'}</a><a href="{base}/jarvis" data-home-action="jarvis">{'让贾维斯继续研究' if zh else 'Research with Jarvis'}</a></nav></section>
<div class="home-evidence"><div><h2>{'用证据检验未来。' if zh else 'Check the future against the evidence.'}</h2><p>{'追踪《态势感知》的 8 项预测，了解哪些已兑现、哪些仍有待观察。' if zh else 'Track 8 predictions from Situational Awareness: what has held up, and what remains open.'}</p><div class="focus-actions">{action(base+'/progress-index','查看预测证据' if zh else 'Inspect the evidence','hero_evidence','focus-secondary')}{action('#grade-game','给出我的判断' if zh else 'Make my assessment','hero_grade','focus-secondary')}</div></div><aside class="focus-reading"><p>{'AGI-2027 命题追踪指数' if zh else 'AGI-2027 Thesis Tracker'}</p><div class="focus-score">{score}<span>/100</span></div><p>{'判定综合分数，不是 AGI 发生概率。' if zh else 'A composite of verdicts, not an AGI probability.'}</p><p class="focus-date">{'台账日期' if zh else 'Ledger dated'} <time datetime="{date}">{date}</time></p></aside></div>
{evidence_desk(d,zh)}
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
        snapshot=json.loads((ROOT/'foresight-assets/home.json').read_text())
        s=re.sub(r'<header.*?</header>',lambda _:snapshot['locales']['zh' if zh else 'en']['header'],s,count=1,flags=re.S)
        s=re.sub(r'/home-focus/nav\.css\?v=[^\"]+', '/home-focus/nav.css?v=20261003-nav2', s)
        if '/site-nav/app.mjs' not in s:s=s.replace('</head>','<script type="module" src="/site-nav/app.mjs?v=20261003-nav2"></script>\n</head>')
        s=re.sub(r'/home-focus/media\.mjs\?v=[^\"]+', '/home-focus/media.mjs?v=20261003-daily1', s)
        if '/home-focus/media.mjs' not in s:s=s.replace('</head>','<script type="module" src="/home-focus/media.mjs?v=20261003-daily1"></script>\n</head>')
        if '/home-focus/nav.css' not in s:s=s.replace('</head>','<link rel="stylesheet" href="/home-focus/nav.css?v=20261003-nav2">\n</head>')
        s=s.replace('/home-focus/focus.css?v=1','/home-focus/focus.css?v=20261003')
        if '/home-focus/countdown.js' not in s:
            s=s.replace('</head>', '<script type="module" src="/home-focus/countdown.js"></script>\n</head>')
        if '/home-focus/vote.js' not in s:
            s=s.replace('</head>', '<script type="module" src="/home-focus/vote.js"></script>\n</head>')
        if not zh:
            # Migrate the buried clock to the generated hero; keep its old anchor.
            s=re.sub(r'  <!-- MAIN COUNTDOWN -->.*?(?=  <!-- VOTE WIDGET -->)', '', s, count=1, flags=re.S)
            s=re.sub(r'const pageOpenTime = Date.now\(\);.*?setInterval\(updateCountdown, 1000\);\n', '', s, count=1, flags=re.S)
            s=re.sub(r'  <!-- VOTE WIDGET -->.*?(?=  <!-- MILESTONE CARDS -->)', '', s, count=1, flags=re.S)
            s=re.sub(r'let myVote = null, myArchetype = null;.*?(?=// Per-prediction actions,)', '', s, count=1, flags=re.S)
            s=re.sub(r'// Crowd reveal \(2026-09-27.*?try \{ renderLocked\(\); \} catch \(e\) \{\}', '', s, count=1, flags=re.S)
        s=region(s,'home-focus',hero(d,zh));s=region(s,'home-grade',grade(zh));s=region(s,'home-changes',changes(cl,zh))
        title='AI 视频、观点与 AGI 倒计时 | AGI 记分牌' if zh else 'AI Videos, Ideas & AGI Countdown | AGI Scorecard'
        desc='按工作、学习、商业与未来预判浏览 AI 访谈和博主视频。阅读观点总结、直接观看原片，追踪 AGI 倒计时与预测证据。' if zh else 'Explore AI interviews and creator videos by work, learning, business and future forecasts. Read takeaways, watch originals, and track the AGI countdown and prediction evidence.'
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
