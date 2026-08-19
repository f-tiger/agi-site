#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
/matrix-odds + /zh/matrix-odds —— 「黑客帝国概率计算器」

站长 2026-08-16:「制造一个预测 AI 导致黑客帝国情景的工具」。

零编造规则下唯一诚实的做法:**本站不预测黑客帝国的概率**,因为没人能。
本站能做的是把这个剧本拆成五个必须**依次成立**的前提,每一环标注本站
data.json 里对应的真实判定;概率由读者自己填,乘法由页面当场做。
输出的是「你自己的数」,不是本站的数——这一点在页面上写死,不能含糊。

工具真正的发现在第五环:前四环都有可证伪的追踪项和一手信源,而第五环
(「它选择圈养人类并模拟一个世界」,也就是黑客帝国区别于普通 AI 失控的
那一环)**本站没有任何证据可以支撑或反驳**。把这件事显式地摆出来,比
再编一个百分比有价值得多,也正是这个工具值得被分享的原因。

生成:  python3 tools/gen_matrix_odds.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://agiscorecard.com"
GA = "G-B3PN0PLGTG"

# ---------------------------------------------------------------- 数据源
with open(os.path.join(ROOT, "data.json"), encoding="utf-8") as fh:
    DATA = json.load(fh)
PRED = {p["id"]: p for p in DATA["predictions"]}
ASOF = DATA["dateModified"][:10]

# 判定 → 展示样式。文案照抄 data.json,不改写。
VERDICT_ZH = {
    "On track": "兑现中", "Exceeded": "超额兑现", "Wrong": "落空",
    "Open": "未决", "Pending": "待验证",
}
TONE = {"On track": "ok", "Exceeded": "ok", "Wrong": "bad", "Open": "mid", "Pending": "mid"}


def link(key, ids, en, zh, en_why, zh_why):
    """一环 = 一个必要前提 + 它在本站的真实判定(可能是「没有」)。"""
    ev = []
    for i in ids:
        p = PRED[i]
        ev.append({
            "id": i,
            "claim": p["prediction"],
            "verdict": p["verdict"],
            "evidence": p["evidence"],
            "src": p["sources"][0]["url"] if p.get("sources") else "",
            "srcName": p["sources"][0]["name"] if p.get("sources") else "",
            "detail": p.get("detail", ""),
        })
    return {"key": key, "en": en, "zh": zh, "enWhy": en_why, "zhWhy": zh_why, "ev": ev}


LINKS = [
    link("agi", ["agi-2027"],
         "AGI arrives at all",
         "AGI 真的出现",
         "Nothing downstream can happen without it. The site tracks the 2027 target specifically; set your own probability for AGI ever, on any timeline.",
         "后面每一环都以它为前提。本站追踪的是「2027 年」这个具体靶子;这里请填你对「AGI 终究会出现」的估计，不限年份。"),
    link("explosion", ["intelligence-explosion"],
         "…and it keeps improving itself far past human level",
         "…并且持续自我改进，远远超过人类",
         "An AGI that plateaus near human level cannot run the scenario. This is the step from “as smart as us” to “beyond argument.”",
         "停在人类水平附近的 AGI 演不了这出戏。这一环是从「和我们一样聪明」跨到「无法与之争辩」。"),
    link("physical", ["capex", "compute-scaling"],
         "…and it commands enough energy, compute and physical industry",
         "…并且掌握足够的能源、算力与实体工业",
         "The scenario is a physical-world takeover, not a chatbot. This is the one link where the site's evidence is currently strongest — the buildout is real and ahead of schedule.",
         "这个剧本讲的是物理世界，不是聊天框。这也是本站证据目前**最强**的一环——基建是真的，而且超前。"),
    link("control", ["superintelligence", "the-project"],
         "…and humans fail to keep control of it",
         "…并且人类没能保住控制权",
         "Capability is not takeover. This link is about whether the off-switch, the labs and the state actually fail.",
         "有能力不等于夺权。这一环问的是：关机键、实验室、国家机器，是不是真的失效了。"),
]

# 第五环刻意没有追踪项——这是整个工具的要害。
LAST = {
    "key": "farm",
    "en": "…and it chooses to keep humans alive inside a simulation",
    "zh": "…并且它选择把人类活着养在一个模拟世界里",
    "enWhy": "This is the link that makes it <em>The Matrix</em> rather than ordinary AI risk — and it is the one link this site has <strong>no falsifiable evidence about, in either direction</strong>. Nothing in the dataset supports it and nothing refutes it. Indifference, extinction, and cooperation are all separate branches here; the film picked one.",
    "zhWhy": "这一环才是「黑客帝国」区别于一般 AI 风险的地方——也是本站<strong>完全没有可证伪证据</strong>的一环，正反都没有。数据集里没有任何东西支持它，也没有任何东西否定它。无视人类、消灭人类、与人类合作，在这里是三条各不相同的岔路；电影只挑了其中一条。",
    "ev": [],
}
ALL = LINKS + [LAST]

FORECASTERS = DATA["forecaster_timelines"]

# ---------------------------------------------------------------- 文案
C = {
    "en": {
        "lang": "en", "canon": f"{SITE}/matrix-odds", "home": "/", "brand": "The AGI Scorecard",
        "title": "Matrix Odds Calculator — your own probability, not ours",
        "desc": "Break the Matrix scenario into five preconditions that must all hold, set your own probability for each, and see the joint number. Four links carry real graded evidence; one carries none.",
        "kicker": "Free tool · no signup · runs in your browser",
        "h1": "What are the odds AI ends in something like <em>The Matrix</em>?",
        "lead": "Nobody can honestly hand you that number, so this page doesn’t. It breaks the scenario into five things that must <em>all</em> be true, shows you what this site’s graded evidence actually says about each, and lets you set the probabilities yourself. The multiplication is done in front of you.",
        "capsule": "<b>The short version:</b> the film’s scenario needs five separate things to go right in a row. Four of them map onto predictions this site grades with pre-registered flip conditions and primary sources. The fifth — the part that makes it <em>The Matrix</em> rather than any other bad ending — has <b>no evidence on either side</b>, here or anywhere. That asymmetry is the actual finding, and it survives whatever numbers you pick.",
        "hSet": "Set your five probabilities",
        "hint": "Every slider starts at 50% — that is a blank default, not this site’s estimate. This site publishes no probability for any of these.",
        "yours": "Your Matrix probability",
        "chain4": "Your probability of the first four (ordinary loss of control)",
        "gap": "The fifth link is doing all the remaining work: it divides those two numbers.",
        "evidenceOn": "What this site grades on this link",
        "noEvidence": "No tracked prediction. No falsifiable evidence either way.",
        "reset": "Reset to 50%",
        "share": "Copy a link to this result",
        "copied": "Copied ✓",
        "hMethod": "How the number is computed",
        "method": "<p>The five links are treated as a chain of conditional probabilities and multiplied: P(Matrix) = P(AGI) × P(explosion | AGI) × P(physical control | explosion) × P(we lose control | that) × P(it farms us | that). Multiplying conditionals is the standard way to price a scenario that needs every step; it is also why long chains produce small numbers even when each individual step feels likely.</p><p><b>The honest weakness, stated plainly:</b> these five are not fully independent, and a chain treats them as if the conditioning is already baked into your inputs. If you think the same underlying cause drives several links, your true joint number is <em>higher</em> than the product. The tool cannot fix that for you — but pretending the issue doesn’t exist would be worse than naming it.</p><p>The verdicts shown against links 1–4 come from <a href=\"/data.json\">/data.json</a> (CC BY 4.0), the same eight graded predictions behind the <a href=\"/progress-index\">AGI-2027 Thesis Tracker</a>, each with a pre-registered flip condition and a primary source. They are evidence about the <em>preconditions</em>. They are not a probability of the scenario, and this page never converts them into one.</p>",
        "hTimelines": "What people who forecast for a living actually say about link 1",
        "timelinesNote": "Verbatim positions from the dataset — the spread here is the honest state of link 1.",
        "sub": "Get told when a link changes verdict",
        "subp": "Four of these five links are live graded predictions. When one flips, the Thesis Tracker score moves and your number here changes with it. That is the email — not a newsletter about AI in general.",
        "subbtn": "Email me when the score moves →",
        "hFaq": "Questions",
        "faqs": [
            ("Does this site think the Matrix scenario is likely?",
             "This site publishes no probability for it, and this page deliberately does not either. Every number you see is one you entered. What the site does publish is graded evidence on four of the five preconditions, with pre-registered flip conditions and primary sources."),
            ("Why does the fifth link have no evidence?",
             "Because there is none, in either direction. “A superintelligence would keep humans alive in a simulation” is not a falsifiable claim about the present world — there is no observation today that would confirm or refute it. Indifference, extinction and cooperation are separate branches with the same evidentiary status. Anyone quoting you a percentage for this link made it up."),
            ("Which link currently has the strongest evidence?",
             "The physical one. AI capex has already <em>exceeded</em> what the source text predicted, and compute scaling is on track — both graded from primary sources. The buildout is the least speculative part of the whole scenario, which is not the part most people argue about."),
            ("Why multiply instead of averaging?",
             "Because the scenario needs every step, not an average step. If any one link fails, the scenario fails. The caveat is that the links are not independent — see the method note above, which states plainly that correlation would push the true number higher than the product."),
            ("Is this a prediction, or advice?",
             "Neither. It is a reasoning tool over a public dataset. It tells you what your own stated beliefs imply, and shows you where the evidence runs out."),
        ],
        "related": [("/progress-index", "AGI-2027 Thesis Tracker · the live score behind links 1–4"),
                    ("/agi-test", "Which real forecaster do you actually agree with?"),
                    ("/ai-tools", "All free tools")],
        "hEmbed": "Put this calculator on your page",
        "embedNote": "Copy this. The embed stays current — the four graded links update whenever a verdict changes.",
        "embedBtn": "Copy embed code",
        "bands": [(0.10, "Red Pill", "You think the film is roughly a live hypothesis."),
                  (0.01, "Serious Risk Case", "You treat it as a real tail, not a story."),
                  (0.0001, "Cautious Sceptic", "Possible in principle, priced very low."),
                  (0.0, "Screenplay Enjoyer", "You think this one is fiction, and the numbers agree with you.")],
        "of": "of",
        "asof": "Verdicts as of",
    },
    "zh": {
        "lang": "zh-Hans", "canon": f"{SITE}/zh/matrix-odds", "home": "/cn", "brand": "AGI 记分牌",
        "title": "黑客帝国概率计算器 —— 算你自己的数，不是我们的",
        "desc": "把「黑客帝国」剧本拆成五个必须同时成立的前提，你自己给每一环填概率，页面当场相乘。其中四环有本站的真实判定，第五环一条证据都没有。",
        "kicker": "免费工具 · 免注册 · 全部在你的浏览器里算",
        "h1": "AI 最后演成《黑客帝国》的概率有多大？",
        "lead": "没有人能诚实地给你这个数，所以这一页不给。它把剧本拆成五件必须<em>同时</em>为真的事，把本站对每一环的真实判定摆出来，概率由你自己填。乘法当着你的面做。",
        "capsule": "<b>先说结论：</b>这个剧本需要连着五件事都成立。其中四件对应本站正在判定的预测，每一条都有预先登记的翻转条件和一手信源。第五件——也就是让它成为「黑客帝国」而不是别的坏结局的那一件——<b>正反两个方向都没有证据</b>，本站没有，别处也没有。这个不对称才是真正的发现，而且无论你填什么数字，它都成立。",
        "hSet": "填你自己的五个概率",
        "hint": "每根滑块都从 50% 起步——那是空白默认值，不是本站的估计。本站对这五环中的任何一环都没有发布过概率。",
        "yours": "你的黑客帝国概率",
        "chain4": "你的前四环概率（也就是一般意义的「失控」）",
        "gap": "第五环承担了剩下的全部落差：这两个数之间差的就是它。",
        "evidenceOn": "本站在这一环上判定了什么",
        "noEvidence": "没有对应的追踪项。正反两个方向都没有可证伪的证据。",
        "reset": "全部归零到 50%",
        "share": "复制这个结果的链接",
        "copied": "已复制 ✓",
        "hMethod": "这个数是怎么算出来的",
        "method": "<p>五环按条件概率链相乘：P(黑客帝国) = P(AGI 出现) × P(智能爆炸 | AGI) × P(掌握物理层 | 智能爆炸) × P(人类失去控制 | 前述) × P(它选择圈养 | 前述)。一个「每一步都必须成立」的剧本，标准做法就是连乘；这也是为什么即使每一环单看都不算低，长链条也会得出很小的数。</p><p><b>这个方法的弱点，直说：</b>这五环并不完全独立，而连乘等于假定条件关系已经体现在你填的数里了。如果你认为有同一个底层原因同时推动好几环，那么你真实的联合概率会<em>高于</em>这个乘积。工具替你修不了这一点——但假装这个问题不存在，比把它说出来更糟。</p><p>第 1–4 环旁边的判定来自 <a href=\"/data.json\">/data.json</a>（CC BY 4.0），和 <a href=\"/zh/progress-index\">AGI-2027 命题追踪指数</a>背后是同一套八条判定，每条都有预先登记的翻转条件和一手信源。它们是关于<em>前提</em>的证据，不是这个剧本的概率，本页也从不把它们换算成概率。</p>",
        "hTimelines": "靠预测吃饭的人，对第 1 环实际是怎么说的",
        "timelinesNote": "逐条照抄自数据集——这个分歧幅度本身，就是第 1 环的真实状态。",
        "sub": "某一环判定变了的时候通知我",
        "subp": "五环里有四环是正在判定的活预测。任何一条翻转，追踪指数就会动，你这里算出的数也跟着变。这封邮件寄的是这个，不是一份泛泛的 AI 通讯。",
        "subbtn": "分数变动那天告诉我 →",
        "hFaq": "常见问题",
        "faqs": [
            ("本站认为黑客帝国剧本很可能发生吗？",
             "本站没有为它发布过任何概率，本页也刻意不给。你看到的每一个数字都是你自己填进去的。本站发布的是五环里前四环的判定证据，每条都有预先登记的翻转条件和一手信源。"),
            ("为什么第五环没有证据？",
             "因为确实没有，正反都没有。「超级智能会把人类活着养在模拟世界里」不是一个关于当下世界的可证伪命题——今天不存在任何一个观测能确认或推翻它。无视人类、消灭人类、与人类合作，在证据地位上完全相同。任何人给你报一个这一环的百分比，那个数都是编的。"),
            ("现在哪一环的证据最强？",
             "物理那一环。AI 资本开支已经<em>超额</em>兑现了原文的预测，算力扩张也在轨道上，两条都基于一手信源判定。整个剧本里最不玄的部分恰恰是基建——而那不是大多数人在争论的部分。"),
            ("为什么用连乘，不用取平均？",
             "因为这个剧本需要的是每一步都成立，不是「平均一步」。任何一环断了，剧本就不成立。要提醒的是各环并不独立——见上面的方法说明，那里已经写明相关性会让真实的数高于这个乘积。"),
            ("这算预测吗？算建议吗？",
             "都不算。它是一个架在公开数据集上的推理工具：告诉你你自己申报的信念意味着什么，并且指出证据在哪一步用完了。"),
        ],
        "related": [("/zh/progress-index", "AGI-2027 命题追踪指数 · 前四环背后的活分数"),
                    ("/zh/agi-test", "你其实站在哪位预言者那一边？"),
                    ("/zh/ai-tools", "全部免费工具")],
        "hEmbed": "把这个计算器放到你的页面上",
        "embedNote": "复制这段。嵌入版会保持最新——四条判定一旦变动，它跟着变。",
        "embedBtn": "复制嵌入代码",
        "bands": [(0.10, "红药丸", "你认为这部电影大体上是个还活着的假说。"),
                  (0.01, "认真的风险派", "你把它当成真实的尾部风险，不是故事。"),
                  (0.0001, "谨慎的怀疑者", "原理上可能，但定价极低。"),
                  (0.0, "剧本爱好者", "你认为这就是虚构，而算出来的数也同意你。")],
        "of": "共",
        "asof": "判定截至",
    },
}

# ---------------------------------------------------------------- CSS
CSS_EN = """
:root{--bg:#0a0a0b;--bg2:#141417;--border:#26262b;--border2:#33333a;--text:#e8e8ea;
--muted:#9a9aa3;--accent:#4fc3a1;--ok:#4fc3a1;--bad:#e5646d;--mid:#d9a441}
body{background:var(--bg);color:var(--text)}
a{color:var(--accent)}
.chip{background:var(--bg2);border:1px solid var(--border)}
"""
CSS_ZH = """
:root{--bg:#ffffff;--bg2:#f7f7f8;--border:rgba(0,0,0,.10);--border2:rgba(0,0,0,.16);
--text:#111114;--muted:#5a5a63;--accent:#002FA7;--ok:#0f7a52;--bad:#C8102E;--mid:#8a6d1f}
body{background:var(--bg);color:var(--text);font-family:'Noto Sans SC','PingFang SC',system-ui,sans-serif}
a{color:var(--accent)}
.chip{background:var(--bg2);border:1px solid var(--border)}
"""
CSS_SHARED = """
*{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,-apple-system,'Noto Sans SC','PingFang SC',sans-serif;
line-height:1.65;font-size:16px;-webkit-font-smoothing:antialiased}
.wrap{max-width:820px;margin:0 auto;padding:22px 18px 60px}
header{display:flex;gap:14px;align-items:center;font-size:13px;margin-bottom:18px}
.brand{font-weight:700;text-decoration:none}
header a{text-decoration:none}
.kicker{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
h1{font-size:30px;line-height:1.25;margin:6px 0 10px;font-weight:800}
h2{font-size:20px;margin:34px 0 10px;font-weight:700}
h3{font-size:16px;margin:0 0 6px}
.lead{font-size:17px;color:var(--muted);margin:0 0 16px}
.capsule{background:var(--bg2);border:1px solid var(--border);border-left:3px solid var(--accent);
border-radius:0 12px 12px 0;padding:14px 17px;font-size:14.5px;margin:16px 0 8px}
.hint{font-size:13px;color:var(--muted);margin:2px 0 16px}
.link{border-top:1px solid var(--border);padding:16px 0}
.link:first-of-type{border-top:0}
.lhead{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.num{font-weight:800;color:var(--muted);font-size:13px;min-width:20px}
.ltitle{font-weight:700;font-size:16.5px;flex:1;min-width:220px}
.val{font-variant-numeric:tabular-nums;font-weight:800;font-size:19px;min-width:64px;text-align:right}
input[type=range]{width:100%;margin:12px 0 4px;accent-color:var(--accent)}
.why{font-size:14px;color:var(--muted);margin:2px 0 10px}
.ev{font-size:13.5px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:10px 13px;margin-top:8px}
.ev b{font-weight:600}
.tag{display:inline-block;font-size:11.5px;font-weight:700;border-radius:99px;padding:1px 9px;margin-right:7px}
.tag.ok{color:var(--ok);border:1px solid var(--ok)}
.tag.bad{color:var(--bad);border:1px solid var(--bad)}
.tag.mid{color:var(--mid);border:1px solid var(--mid)}
.tag.none{color:var(--muted);border:1px dashed var(--border2)}
.panel{background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:18px 20px;margin:22px 0}
.big{font-size:40px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.1}
.band{font-size:19px;font-weight:700;margin:6px 0 2px}
.sub2{font-size:14px;color:var(--muted)}
.rowline{display:flex;flex-wrap:wrap;gap:8px 22px;align-items:baseline;margin-top:14px;
padding-top:12px;border-top:1px solid var(--border)}
.btn{display:inline-block;background:var(--accent);color:#fff;border:0;border-radius:8px;
padding:9px 18px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:inherit}
.btn.sec{background:transparent;color:var(--accent);border:1px solid var(--border2)}
table{width:100%;border-collapse:collapse;font-size:14px;margin-top:8px}
th,td{text-align:left;padding:7px 10px 7px 0;border-bottom:1px solid var(--border)}
th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
.faq-q{font-weight:700;margin-top:16px}
.rel{display:flex;flex-direction:column;gap:6px;font-size:14.5px;margin-top:8px}
.cta{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin:26px 0}
pre{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;
overflow-x:auto;font-size:12px;margin:10px 0}
footer{margin-top:40px;padding-top:16px;border-top:1px solid var(--border);font-size:13px;color:var(--muted)}
body.embed header,body.embed .marketing,body.embed footer,body.embed .capsule{display:none}
body.embed .wrap{padding:14px 12px 20px}
@media(max-width:640px){h1{font-size:24px}.big{font-size:32px}table{display:block;overflow-x:auto}}
"""

JS = r"""
var L=__STR__,LINKS=__LINKS__,BANDS=__BANDS__;
var p=LINKS.map(function(){return 50;});
(function(){try{var m=/[?&]p=([0-9\-]+)/.exec(location.search);if(!m)return;
var v=m[1].split('-').map(Number);
if(v.length===LINKS.length&&v.every(function(x){return isFinite(x)&&x>=0&&x<=100;}))p=v;}catch(e){}})();
function syncUrl(){try{var q=['p='+p.join('-')];
if(document.body.classList.contains('embed'))q.push('embed=1');
history.replaceState(null,'',location.pathname+'?'+q.join('&'));}catch(e){}}
function fmt(x){ // 极小概率不该显示成 0.0%——那等于谎报确定性
  if(x<=0)return '0%';
  if(x<0.0001)return (x*100).toExponential(1).replace('e','×10^')+'%';
  if(x<0.01)return (x*100).toFixed(3)+'%';
  if(x<1)return (x*100).toFixed(2)+'%';
  return (x*100).toFixed(1)+'%';}
function render(){
  for(var i=0;i<LINKS.length;i++){
    document.getElementById('r'+i).value=p[i];
    document.getElementById('v'+i).textContent=p[i]+'%';
  }
  var all=1,four=1;
  for(var j=0;j<p.length;j++){all*=p[j]/100;if(j<4)four*=p[j]/100;}
  document.getElementById('big').textContent=fmt(all);
  document.getElementById('four').textContent=fmt(four);
  var band=BANDS[BANDS.length-1];
  for(var k=0;k<BANDS.length;k++){if(all>=BANDS[k][0]){band=BANDS[k];break;}}
  document.getElementById('band').textContent=band[1];
  document.getElementById('bandnote').textContent=band[2];
  syncUrl();
}
function setP(i,v){p[i]=+v;render();
  try{gtag('event','tool_click',{location:'matrix_odds',label:LINKS[i]});}catch(e){}}
function resetAll(){p=LINKS.map(function(){return 50;});render();}
function shareLink(){try{navigator.clipboard.writeText(location.href).then(function(){
  var c=document.getElementById('shared');c.style.display='inline';
  setTimeout(function(){c.style.display='none'},2000);});
  gtag('event','matrix_result',{location:'matrix_odds',label:p.join('-')});}catch(e){}}
function copyEmbed(){var t=document.getElementById('embedcode');
  try{navigator.clipboard.writeText(t.textContent).then(function(){
  var c=document.getElementById('embedcopied');c.style.display='inline';
  setTimeout(function(){c.style.display='none'},2000);});
  gtag('event','embed_copy',{location:'matrix_odds'});}catch(e){}}
render();
"""

PAGE = """<!DOCTYPE html>
<html lang="__LANG__">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script async src="https://www.googletagmanager.com/gtag/js?id=__GA__"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','__GA__');</script>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230a0a0b'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%234fc3a1'/%3E%3C/svg%3E">
<title>__TITLE__</title>
<meta name="description" content="__DESC__">
<link rel="canonical" href="__CANON__">
<link rel="alternate" hreflang="en" href="__SITE__/matrix-odds">
<link rel="alternate" hreflang="zh-Hans" href="__SITE__/zh/matrix-odds">
<link rel="alternate" hreflang="x-default" href="__SITE__/matrix-odds">
<meta property="og:site_name" content="__BRAND__">
<meta property="og:title" content="__TITLE__">
<meta property="og:description" content="__DESC__">
<meta property="og:type" content="website">
<meta property="og:url" content="__CANON__">
<meta property="og:image" content="__SITE__/scorecard-summary.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+SC:wght@400;600;700;800&display=swap" rel="stylesheet">
__LD__
<style>__CSS____CSS_SHARED__</style>
</head>
<body>
<script>if(/[?&]embed=1/.test(location.search))document.body.classList.add('embed');</script>
<div class="wrap">
<header><a class="brand" href="__HOME__">__BRAND__</a><a href="__TOOLS__">__TOOLSLABEL__</a></header>
<div class="kicker">__KICKER__</div>
<h1>__H1__</h1>
<p class="lead">__LEAD__</p>
<div class="capsule">__CAPSULE__</div>

<h2>__H_SET__</h2>
<p class="hint">__HINT__</p>
__LINKS_HTML__

<div class="panel">
  <div class="kicker">__YOURS__</div>
  <div class="big" id="big">3.13%</div>
  <div class="band" id="band"></div>
  <div class="sub2" id="bandnote"></div>
  <div class="rowline">
    <span class="sub2">__CHAIN4__: <b id="four" style="font-variant-numeric:tabular-nums;color:var(--text)">6.25%</b></span>
    <span class="sub2">__GAP__</span>
  </div>
  <div style="margin-top:14px;display:flex;gap:9px;flex-wrap:wrap;align-items:center">
    <button type="button" class="btn" onclick="shareLink()">__SHARE__</button>
    <button type="button" class="btn sec" onclick="resetAll()">__RESET__</button>
    <span id="shared" style="display:none;font-size:13px;color:var(--ok)">__COPIED__</span>
  </div>
</div>

<div class="marketing">
<div class="cta">
  <b>__SUB__</b>
  <p style="margin:6px 0 10px;font-size:14px;color:var(--muted)">__SUBP__</p>
  <a class="btn" href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&amp;utm_medium=__UTM__" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'__SUBLOC__'});">__SUBBTN__</a>
  __SUBHINT__
</div>

<h2>__H_METHOD__</h2>
__METHOD__

<h2>__H_TIMELINES__</h2>
<p class="sub2">__TIMELINESNOTE__</p>
<table><tbody>__TIMELINES__</tbody></table>

<h2>__H_EMBED__</h2>
<p class="sub2">__EMBEDNOTE__</p>
<pre id="embedcode">__EMBEDCODE__</pre>
<button type="button" class="btn sec" onclick="copyEmbed()">__EMBEDBTN__</button>
<span id="embedcopied" style="display:none;font-size:13px;color:var(--ok);margin-left:8px">__COPIED__</span>

<h2>__H_FAQ__</h2>
__FAQ__

<h2>__H_REL__</h2>
<div class="rel">__REL__</div>
</div>

<footer>__ASOF__ __ASOFDATE__ · __FOOTER__</footer>
</div>
<script>__JS__</script>
</body>
</html>
"""

FOOT = {
    "en": 'Verdicts and sources: <a href="/data.json">/data.json</a> (CC BY 4.0). This page publishes no probability of its own; every figure above is one you entered. Not advice.',
    "zh": '判定与信源：<a href="/data.json">/data.json</a>（CC BY 4.0）。本页不发布任何属于自己的概率，上面每一个数字都是你自己填的。不构成任何建议。',
}
TOOLS_LABEL = {"en": "All free tools", "zh": "全部免费工具"}
TOOLS_HREF = {"en": "/ai-tools", "zh": "/zh/ai-tools"}
SUBHINT = {"en": "", "zh": '<p style="font-size:11.5px;color:var(--muted);margin:8px 0 0">订阅表单为英文：输入邮箱 → 点 Subscribe 即完成。</p>'}


def esc(x):
    return x.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def links_html(lang):
    c = C[lang]
    out = []
    for i, lk in enumerate(ALL):
        title = lk[lang]
        why = lk["zhWhy"] if lang == "zh" else lk["enWhy"]
        ev = ""
        if lk["ev"]:
            rows = []
            for e in lk["ev"]:
                v = VERDICT_ZH[e["verdict"]] if lang == "zh" else e["verdict"]
                rows.append(
                    f'<div style="margin-top:4px"><span class="tag {TONE[e["verdict"]]}">{v}</span>'
                    f'<b>{e["claim"]}</b> — {e["evidence"]}'
                    + (f' · <a href="{e["src"]}" target="_blank" rel="noopener">{e["srcName"]}</a>' if e["src"] else "")
                    + "</div>")
            ev = f'<div class="ev"><div class="kicker">{c["evidenceOn"]}</div>{"".join(rows)}</div>'
        else:
            ev = f'<div class="ev"><span class="tag none">{c["noEvidence"]}</span></div>'
        out.append(f"""<div class="link">
<div class="lhead"><span class="num">{i + 1}</span><span class="ltitle">{title}</span><span class="val" id="v{i}">50%</span></div>
<input type="range" id="r{i}" min="0" max="100" step="1" value="50"
  aria-label="{esc(title)}" oninput="setP({i},this.value)">
<div class="why">{why}</div>{ev}</div>""")
    return "\n".join(out)


def build(lang):
    c = C[lang]
    slug = "matrix-odds" if lang == "en" else "zh/matrix-odds"
    faq_html = "".join(f'<div class="faq-q">{q}</div><p>{a}</p>' for q, a in c["faqs"])
    rel_html = "".join(f'<a href="{h}">{t} →</a>' for h, t in c["related"])
    tl = "".join(f'<tr><td><b>{f["name"]}</b></td><td>{esc(f["position"])}</td></tr>' for f in FORECASTERS)
    embed = (f'&lt;iframe src="{c["canon"]}?embed=1" width="100%" height="900" '
             f'style="border:1px solid #33333a;border-radius:12px" loading="lazy" '
             f'title="{esc(c["title"])}"&gt;&lt;/iframe&gt;')

    ld = [
        {"@context": "https://schema.org", "@type": "WebApplication",
         "name": c["title"].split(" — ")[0], "url": c["canon"],
         "applicationCategory": "EducationalApplication", "operatingSystem": "Any (web browser)",
         "isAccessibleForFree": True,
         "offers": {"@type": "Offer", "price": 0, "priceCurrency": "USD"},
         "inLanguage": "zh-CN" if lang == "zh" else "en",
         "description": c["desc"],
         "featureList": [
             "Decomposes the Matrix scenario into five required preconditions",
             "Shows this site's graded verdict and primary source for four of them",
             "States plainly that the fifth has no falsifiable evidence in either direction",
             "Multiplies user-supplied conditional probabilities in the browser",
             "Shareable result deep-link and an embeddable iframe",
         ],
         "isPartOf": {"@type": "WebSite", "name": c["brand"], "url": SITE + ("/zh/ai-tools" if lang == "zh" else "/ai-tools")}},
        {"@context": "https://schema.org", "@type": "FAQPage",
         "mainEntity": [{"@type": "Question", "name": q,
                         "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in c["faqs"]]},
        {"@context": "https://schema.org", "@type": "BreadcrumbList",
         "itemListElement": [
             {"@type": "ListItem", "position": 1, "name": c["brand"], "item": SITE + c["home"]},
             {"@type": "ListItem", "position": 2, "name": TOOLS_LABEL[lang], "item": SITE + TOOLS_HREF[lang]},
             {"@type": "ListItem", "position": 3, "name": c["title"].split(" — ")[0], "item": c["canon"]}]},
    ]
    ld_html = "\n".join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False) + "</script>" for x in ld)

    js = (JS.replace("__STR__", json.dumps({}, ensure_ascii=False))
            .replace("__LINKS__", json.dumps([l["key"] for l in ALL]))
            .replace("__BANDS__", json.dumps(c["bands"], ensure_ascii=False)))

    html = (PAGE
            .replace("__LANG__", c["lang"]).replace("__GA__", GA)
            .replace("__TITLE__", c["title"]).replace("__DESC__", c["desc"])
            .replace("__CANON__", c["canon"]).replace("__SITE__", SITE)
            .replace("__BRAND__", c["brand"]).replace("__HOME__", c["home"])
            .replace("__TOOLS__", TOOLS_HREF[lang]).replace("__TOOLSLABEL__", TOOLS_LABEL[lang])
            .replace("__LD__", ld_html)
            .replace("__CSS_SHARED__", CSS_SHARED)
            .replace("__CSS__", CSS_ZH if lang == "zh" else CSS_EN)
            .replace("__KICKER__", c["kicker"]).replace("__H1__", c["h1"])
            .replace("__LEAD__", c["lead"]).replace("__CAPSULE__", c["capsule"])
            .replace("__H_SET__", c["hSet"]).replace("__HINT__", c["hint"])
            .replace("__LINKS_HTML__", links_html(lang))
            .replace("__YOURS__", c["yours"]).replace("__CHAIN4__", c["chain4"])
            .replace("__GAP__", c["gap"]).replace("__SHARE__", c["share"])
            .replace("__RESET__", c["reset"]).replace("__COPIED__", c["copied"])
            .replace("__SUBP__", c["subp"]).replace("__SUBBTN__", c["subbtn"]).replace("__SUB__", c["sub"])
            .replace("__SUBHINT__", SUBHINT[lang])
            .replace("__UTM__", "zh_matrix_odds" if lang == "zh" else "matrix_odds")
            .replace("__SUBLOC__", "zh_matrix_odds" if lang == "zh" else "matrix_odds")
            .replace("__H_METHOD__", c["hMethod"]).replace("__METHOD__", c["method"])
            .replace("__H_TIMELINES__", c["hTimelines"]).replace("__TIMELINESNOTE__", c["timelinesNote"])
            .replace("__TIMELINES__", tl)
            .replace("__H_EMBED__", c["hEmbed"]).replace("__EMBEDNOTE__", c["embedNote"])
            .replace("__EMBEDCODE__", embed).replace("__EMBEDBTN__", c["embedBtn"])
            .replace("__H_FAQ__", c["hFaq"]).replace("__FAQ__", faq_html)
            .replace("__H_REL__", "Related" if lang == "en" else "相关")
            .replace("__REL__", rel_html)
            .replace("__ASOFDATE__", ASOF).replace("__ASOF__", c["asof"])
            .replace("__FOOTER__", FOOT[lang])
            .replace("__JS__", js))

    path = os.path.join(ROOT, slug + ".html")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(html)
    print(f"{slug}.html  {len(html) // 1024}KB  ({len(ALL)} links, {sum(len(l['ev']) for l in ALL)} graded verdicts)")


def main():
    for lang in ("en", "zh"):
        build(lang)


if __name__ == "__main__":
    main()
