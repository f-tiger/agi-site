# -*- coding: utf-8 -*-
"""Generate /ai-stock-exposure (EN) and /zh/ai-stock-exposure (zh).

The tool scores a basket of AI stocks against the site's own AGI-2027 Thesis
Tracker. That linkage is the whole point: the Tracker is a mean of the eight
verdict weights, so a basket built from the same weights lands on the same 0-100
scale and can be read directly against the thesis score itself. Nobody else can
build this, because nobody else publishes the index.

Two rules this file exists to enforce:

1. Verdict weights are READ FROM data.json, never typed in here. When a verdict
   flips, regenerating this page moves every basket score with it. That is what
   makes the tool worth returning to — and it is the hook the paid tier is built
   on later.

2. Holdings are the ones already audited into the repo from public 13F filings
   (tools/gen_invest_profiles.py). Where a legend has no line-by-line filing on
   the site, the tool SAYS SO rather than implying coverage it does not have.

The ticker-to-prediction mapping is editorial and labelled as such on the page.
It is an argument about what each company's AI valuation rides on, not a data
claim, and it is the one part a reader should push back on.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GA = "G-FZXLMBB5QB"

# Verdict -> weight, matching data.json's published Thesis Tracker method exactly.
VERDICT_WEIGHT = {
    "On track": 1.0, "Exceeded": 1.0,
    "Open": 0.5, "Pending": 0.5, "Unresolved": 0.5,
    "Wrong": 0.0, "Refuted": 0.0,
}

# Short labels for the eight predictions, so a basket breakdown stays readable.
PRED_LABEL = {
    "knowledge-work": ("Knowledge work", "模型胜过大学毕业生"),
    "compute-scaling": ("Compute scaling", "算力与算法按趋势推进"),
    "capex": ("AI capex", "AI 资本开支狂潮"),
    "open-source-fades": ("Open source fades", "开源退场、闭源护城河"),
    "agi-2027": ("AGI by 2027", "2027 年 AGI"),
    "the-project": ("The Project", "美国政府 AGI 计划"),
    "intelligence-explosion": ("Intelligence explosion", "智能爆炸"),
    "superintelligence": ("Superintelligence", "超级智能"),
}

# coverage: how much of this company's AI story the eight predictions actually
# reach. "low" is not a criticism of the stock — it means the score below speaks
# to a smaller slice of it, and the page says so instead of hiding it.
# links: (prediction id, weight, direction). direction -1 = pays off when the
# prediction FAILS. Weights sum to 1 within each ticker.
TICKERS = [
    {"t": "NVDA", "n": "Nvidia", "cov": "high",
     "links": [("compute-scaling", .45, 1), ("capex", .45, 1), ("intelligence-explosion", .10, 1)],
     "en": "Sells the shovels for both the scaling curve and the capex wave — the purest listed proxy for two of the three predictions currently graded supportive.",
     "zh": "同时卖铲子给「算力按趋势推进」和「资本开支狂潮」——这是目前判定成立的三项里，两项的最纯上市代理。"},
    {"t": "AMD", "n": "AMD", "cov": "high",
     "links": [("compute-scaling", .40, 1), ("capex", .60, 1)],
     "en": "The second-source accelerator bet: it needs the spending to keep going more than it needs any particular capability milestone.",
     "zh": "第二供应商的加速卡押注：它更依赖开支继续，而不是某个具体的能力里程碑。"},
    {"t": "TSM", "n": "TSMC", "cov": "high",
     "links": [("compute-scaling", .50, 1), ("capex", .50, 1)],
     "en": "Everything above is fabricated here. The exposure is to the physical scaling curve, one layer below whose logo is on the chip.",
     "zh": "上面所有芯片都在这里制造。敞口落在物理层的扩张曲线上，比「谁家 logo」低一层。"},
    {"t": "AVGO", "n": "Broadcom", "cov": "high",
     "links": [("capex", .60, 1), ("compute-scaling", .40, 1)],
     "en": "Custom accelerators and the networking between them — a capex-cycle position more than a frontier-capability one.",
     "zh": "定制加速卡与它们之间的网络——更像资本开支周期的仓位，而不是前沿能力的仓位。"},
    {"t": "MSFT", "n": "Microsoft", "cov": "high",
     "links": [("capex", .50, 1), ("knowledge-work", .50, 1)],
     "en": "Spends on the buildout and sells the knowledge-work product on top of it. Exposed to both the money and the capability.",
     "zh": "一边出钱建基建，一边在上面卖知识工作产品。钱和能力两头都有敞口。"},
    {"t": "GOOGL", "n": "Alphabet", "cov": "high",
     "links": [("knowledge-work", .40, 1), ("compute-scaling", .30, 1), ("capex", .30, 1)],
     "en": "Full stack — own models, own TPUs, own distribution. Berkshire raised this 225% in Q1 2026 and added again in Q2, its clearest AI statement.",
     "zh": "全栈——自家模型、自家 TPU、自家分发。伯克希尔 2026 Q1 加仓 225%、Q2 再度加仓，是其最明确的 AI 表态。"},
    {"t": "AMZN", "n": "Amazon", "cov": "high",
     "links": [("capex", .50, 1), ("knowledge-work", .50, 1)],
     "en": "Cloud capex plus the agent products running on it. Berkshire exited it entirely the same quarter ARK was adding.",
     "zh": "云的资本开支，加上跑在上面的智能体产品。伯克希尔清仓的同一季度，木头姐在加仓。"},
    {"t": "META", "n": "Meta", "cov": "medium", "inverse": True,
     "links": [("open-source-fades", 1.0, -1)],
     "en": "The one position on this list that pays off when a prediction FAILS. Meta's AI strategy is open weights — it gains exactly where Aschenbrenner said the moat would hold. That prediction is already graded Wrong.",
     "zh": "这张表上唯一一个「预测失败才赚钱」的仓位。Meta 的 AI 路线是开放权重——阿申布伦纳说护城河会守住的地方，正是它获利的地方。而那一条已经判定为「落空」。"},
    {"t": "BABA", "n": "Alibaba", "cov": "medium", "inverse": True,
     "links": [("open-source-fades", 1.0, -1)],
     "en": "Qwen is open-weight and near-frontier. Like Meta, it is long the failure of the moat prediction — which is the one the scorecard has already called.",
     "zh": "通义千问是开放权重、且逼近前沿。和 Meta 一样，它做多的是「护城河预测落空」——而这一条记分牌已经判了。"},
    {"t": "PLTR", "n": "Palantir", "cov": "medium",
     "links": [("knowledge-work", .70, 1), ("the-project", .30, 1)],
     "en": "Deployed government and enterprise AI. The closest listed proxy for The Project, though a contractor is not the same thing as a national programme.",
     "zh": "已落地的政府与企业 AI。是「美国政府 AGI 计划」最接近的上市代理——但承包商不等于国家级计划。"},
    {"t": "CRWV", "n": "CoreWeave", "cov": "high",
     "links": [("capex", 1.0, 1)],
     "en": "Pure capex beta. If the spending slows, there is no second story here — which is what makes it the cleanest read on that one prediction.",
     "zh": "纯资本开支 beta。开支一旦放缓，它没有第二个故事——这也正是它对那一条预测读数最干净的原因。"},
    {"t": "MU", "n": "Micron", "cov": "high",
     "links": [("compute-scaling", .50, 1), ("capex", .50, 1)],
     "en": "Memory is the bottleneck the scaling curve keeps running into. Cyclical in a way the software names are not.",
     "zh": "内存是扩张曲线反复撞上的瓶颈。它的周期性是软件类标的没有的。"},
    {"t": "VRT", "n": "Vertiv", "cov": "medium",
     "links": [("capex", 1.0, 1)],
     "en": "Power and cooling for the buildout. Exposed to how many racks get installed, not to what the models can do.",
     "zh": "为基建提供供电与散热。它的敞口是「装了多少机柜」，不是「模型能做什么」。"},
    {"t": "CEG", "n": "Constellation Energy", "cov": "low",
     "links": [("capex", 1.0, 1)],
     "en": "Compute demand shows up downstream as electricity demand. Real linkage, but a utility has a large business that has nothing to do with any of this.",
     "zh": "算力需求向下游表现为电力需求。链路真实，但公用事业公司有一大块业务与这一切无关。"},
    {"t": "TSLA", "n": "Tesla", "cov": "low",
     "links": [("knowledge-work", .50, 1), ("agi-2027", .50, 1)],
     "en": "Robotaxi and physical AI are not among the eight predictions. The honest linkage is thin — and it is ARK's largest holding at 7.5%.",
     "zh": "Robotaxi 与具身智能不在这 8 条预测里。诚实地说链路很薄——而它是 ARK 的第一大持仓（7.5%）。"},
    {"t": "TEM", "n": "Tempus AI", "cov": "low",
     "links": [("knowledge-work", 1.0, 1)],
     "en": "AI applied to healthcare data. Rides the capability prediction, but through a regulated market with its own clock.",
     "zh": "把 AI 用在医疗数据上。搭的是能力那一条，但要穿过一个有自己节奏的强监管市场。"},
    {"t": "AAPL", "n": "Apple", "cov": "low",
     "links": [("knowledge-work", 1.0, 1)],
     "en": "The weakest linkage on the list, and deliberately kept: it is Berkshire's largest holding at 22%, and a basket full of it is barely an AGI bet at all.",
     "zh": "全表链路最弱的一个，故意留着：它是伯克希尔第一大持仓（22%），而一个装满它的组合，其实几乎不是 AGI 押注。"},
]

# Public 13F filings, Q2 2026 (holdings 2026-06-30, filed 2026-08-14) —
# line-by-line per SEC EDGAR, synced from the aistock repo's 13f-edgar.json.
# Only the two investors with line-by-line filings on the site appear here.
# "add" is reserved for moves attested by the filing narrative (Alphabet was
# added two quarters running); positions merely present in Q2 are "hold", and
# Amazon stays "exit" — exited in Q1, confirmed not rebought in Q2.
HOLDINGS = {
    "Berkshire (Buffett)": {"AAPL": "hold", "GOOGL": "add", "AMZN": "exit"},
    "ARK (Cathie Wood)": {"TSLA": "hold", "AMD": "hold", "PLTR": "hold",
                          "AMZN": "hold", "CRWV": "hold", "TEM": "hold",
                          "NVDA": "hold"},
}


def load_predictions():
    with open(os.path.join(ROOT, "data.json"), encoding="utf-8") as fh:
        data = json.load(fh)
    preds = {}
    for p in data["predictions"]:
        preds[p["id"]] = {
            "id": p["id"],
            "verdict": p["verdict"],
            "w": VERDICT_WEIGHT[p["verdict"]],
            "en": PRED_LABEL[p["id"]][0],
            "zh": PRED_LABEL[p["id"]][1],
            "detail": p["detail"],
            "text": p["prediction"],
        }
    return preds, data["thesisTracker"]["score"], data["thesisTracker"]["asOf"]


def js_payload(preds, lang):
    """Everything the page needs, as one JSON blob — no second source of truth."""
    return json.dumps({
        "preds": [
            {"id": p["id"], "label": p[lang], "verdict": p["verdict"],
             "w": p["w"], "detail": p["detail"]}
            for p in preds.values()
        ],
        "tickers": [
            {"t": t["t"], "n": t["n"], "cov": t["cov"], "note": t[lang],
             "inv": bool(t.get("inverse")),
             "links": [{"p": pid, "w": w, "d": d} for pid, w, d in t["links"]]}
            for t in TICKERS
        ],
        "holdings": HOLDINGS,
    }, ensure_ascii=False, separators=(",", ":"))


# --- shared page logic ----------------------------------------------------
# One implementation, two skins. The maths must not diverge between languages:
# a Chinese reader and an English reader looking at the same basket have to get
# the same number, or the tool is not auditable in either language.
SCRIPT = r"""
var D=__DATA__,L=__STR__,BASE=__BASE__,CANON=__CANON__;
// The four predictions that have not resolved. Exposure to these is the only
// part of a basket that is genuinely a bet on AGI rather than on the buildout.
var FAR=['agi-2027','the-project','intelligence-explosion','superintelligence'];
var sel={},W={};
D.preds.forEach(function(p){W[p.id]=p.w;});

// The basket lives in the URL. That single decision does four jobs: the result
// becomes linkable, a reader can bookmark their own basket, content pages can
// deep-link a relevant preset, and "your saved basket" — which the paid tier is
// built on — becomes a real object instead of a promise.
var VALID={};D.tickers.forEach(function(t){VALID[t.t]=1;});
(function(){try{
  var m=/[?&]b=([A-Za-z0-9\-]+)/.exec(location.search);
  if(!m)return;
  m[1].toUpperCase().split('-').forEach(function(k){if(VALID[k])sel[k]=1;});
}catch(e){}})();
function syncUrl(){try{
  var ks=Object.keys(sel),q=[];
  if(ks.length)q.push('b='+ks.join('-'));
  if(document.body.classList.contains('embed'))q.push('embed=1');
  history.replaceState(null,'',location.pathname+(q.length?'?'+q.join('&'):''));
}catch(e){}}
function shareUrl(){var ks=Object.keys(sel);
  return CANON+(ks.length?'?b='+ks.join('-'):'');}
function pw(o){return o;}
function tScore(t,w){var s=0;t.links.forEach(function(l){var v=w[l.p];s+=l.w*(l.d>0?v:1-v);});return s;}
function basket(w){var ks=Object.keys(sel);if(!ks.length)return null;var s=0;
  ks.forEach(function(k){s+=tScore(byT(k),w);});return s/ks.length;}
function byT(k){for(var i=0;i<D.tickers.length;i++){if(D.tickers[i].t===k)return D.tickers[i];}return null;}
function alt(id,v){var w={};for(var k in W)w[k]=W[k];w[id]=v;return w;}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
function fmt(n){return (Math.round(n*10)/10).toFixed(1);}

function chips(){
  var h='';
  D.tickers.forEach(function(t){
    h+='<button type="button" class="chip'+(sel[t.t]?' on':'')+'" data-t="'+t.t+'">'
      +'<b>'+t.t+'</b><span>'+esc(t.n)+'</span></button>';
  });
  document.getElementById('chips').innerHTML=h;
  Array.prototype.forEach.call(document.querySelectorAll('.chip'),function(b){
    b.onclick=function(){var k=b.getAttribute('data-t');
      if(sel[k])delete sel[k];else sel[k]=1;render();};
  });
}

function render(){
  chips();
  var out=document.getElementById('out'),ks=Object.keys(sel);
  if(!ks.length){out.innerHTML='<p class="hint">'+L.empty+'</p>';return;}
  var b=basket(W),score=b*100,diff=score-BASE;

  // Which predictions the basket actually rides on, and in which direction.
  var expo={},cov={high:0,medium:0,low:0};
  ks.forEach(function(k){var t=byT(k);cov[t.cov]++;
    t.links.forEach(function(l){var e=expo[l.p]||(expo[l.p]={w:0,d:l.d});e.w+=l.w/ks.length;});});
  var rows=D.preds.filter(function(p){return expo[p.id];})
    .sort(function(a,c){return expo[c.id].w-expo[a.id].w;})
    .map(function(p){var e=expo[p.id];
      return '<tr><td><a href="'+p.detail+'">'+esc(p.label)+'</a>'
        +(e.d<0?' <span class="inv">'+L.inverse+'</span>':'')+'</td>'
        +'<td class="num">'+Math.round(e.w*100)+'%</td>'
        +'<td><span class="v v'+Math.round(p.w*2)+'">'+esc(p.verdict)+'</span></td></tr>';}).join('');

  // Sensitivity: the 2027 verdict is the one that actually resolves, so it is
  // the only one worth modelling. Anything else would be inventing scenarios.
  var yes=basket(alt('agi-2027',1))*100,no=basket(alt('agi-2027',0))*100;
  var broken=expo['open-source-fades'];

  var who='';
  for(var inv in D.holdings){
    var hits=ks.filter(function(k){return D.holdings[inv][k];});
    if(!hits.length)continue;
    who+='<tr><td>'+esc(inv)+'</td><td>'+hits.map(function(k){
      var a=D.holdings[inv][k];return '<span class="h h-'+a+'">'+k+' '+L.act[a]+'</span>';}).join(' ')+'</td></tr>';
  }
  who=who?'<table class="tbl"><thead><tr><th>'+L.investor+'</th><th>'+L.position+'</th></tr></thead><tbody>'+who+'</tbody></table>'
       +'<p class="fine">'+L.holdnote+'</p>'
     :'<p class="fine">'+L.nohold+'</p>';

  var covWarn=(cov.low>=ks.length/2)?'<p class="warn">'+L.covwarn+'</p>':'';

  // The alignment score alone sits near 100 for almost any basket, because
  // listed AI equities ride the three predictions already graded supportive.
  // That is the finding, not a bug — so the share riding on the four unresolved
  // predictions is shown next to it, and it is the number that discriminates.
  var far=0;
  ks.forEach(function(k){byT(k).links.forEach(function(l){
    if(FAR.indexOf(l.p)>-1)far+=l.w/ks.length;});});
  far*=100;
  // Inverse exposure is checked first: a basket that is mostly long the failure
  // of the moat prediction is a different animal from one that simply owns the
  // buildout, and collapsing the two would lose the most interesting reader.
  var invw=0;
  ks.forEach(function(k){byT(k).links.forEach(function(l){if(l.d<0)invw+=l.w/ks.length;});});
  var kind=invw>=.5?'anti':(far>=25?'own':(far>=8?'mixed':'capex'));

  // One-tap bind, no email. The site's email form has converted 0 of 246 pageviews,
  // and a confirmation mail cannot even be sent today (no BEEHIIV key), so Telegram is
  // the only identity channel here that can actually deliver what it promises. The
  // payload is the basket itself; Telegram caps `start` at 64 chars, so an oversized
  // basket hides the button rather than silently watching a truncated one.
  var tgp='b_'+ks.join('-');
  var tgBtn=(tgp.length<=64)
    ?'<a class="btn sec" style="margin-left:8px" href="https://t.me/sunwatchBot?start='+tgp
      +'" target="_blank" rel="noopener" onclick="gtag(\'event\',\'invest_tool_click\',{location:\''
      +L.loc+'_tg_watch\',label:\''+ks.join('-')+'\'});">'+L.tgbtn+'</a>'
      +'<p class="fine" style="margin:8px 0 0">'+L.tgnote+'</p>'
    :'<p class="fine" style="margin:8px 0 0">'+L.tglong+'</p>';

  out.innerHTML=
    '<div class="stats"><div class="stat"><span>'+L.score_label+'</span>'
    +'<div class="big">'+fmt(score)+'<i>/100</i></div>'
    +'<div class="bar"><i style="width:'+Math.max(2,Math.min(100,score))+'%"></i>'
    +'<u style="left:'+BASE+'%"></u></div>'
    +'<div class="cmp">'+L.vs.replace('{b}',BASE).replace('{d}',(diff>=0?'+':'')+fmt(diff))+'</div></div>'
    +'<div class="stat"><span>'+L.far_label+'</span>'
    +'<div class="big">'+Math.round(far)+'<i>%</i></div>'
    +'<div class="cmp">'+L.farnote+'</div></div></div>'
    +'<p class="kind k-'+kind+'"><b>'+L.names[kind]+L.namesep+'</b>'+L.kinds[kind]+'</p>'
    +'<div class="share"><button type="button" class="btn sec" onclick="copyLink()">'+L.copybtn
      +'</button><span id="linkcopied">&#10003;</span>'
      +'<a class="btn sec" id="xshare" target="_blank" rel="noopener">'+L.xbtn+'</a></div>'
    +'<p class="fine">'+L.sharenote+'</p>'
    +'<div class="cta resultcta"><b>'+L.ctahead
        .replace('{s}',fmt(score)).replace('{f}',Math.round(far))+'</b>'
      +'<p style="margin:6px 0 10px;font-size:14px">'+L.ctabody+'</p>'
      +'<a class="btn" href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&amp;utm_medium='
      +L.utm+'_result" target="_blank" rel="noopener" '
      +'onclick="gtag(\'event\',\'subscribe_click\',{location:\''+L.loc+'_result\'});">'+L.ctabtn+'</a>'+tgBtn+'</div>'
    +covWarn
    +'<h3>'+L.h_break+'</h3>'
    +'<div class="scroll"><table class="tbl"><thead><tr><th>'+L.prediction+'</th><th class="num">'+L.share+'</th><th>'+L.verdict+'</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    +'<h3>'+L.h_sens+'</h3>'
    +'<div class="sens"><div><span>'+L.if_yes+'</span><b>'+fmt(yes)+'</b></div>'
    +'<div><span>'+L.if_no+'</span><b>'+fmt(no)+'</b></div></div>'
    +'<p class="fine">'+(Math.abs(yes-no)<0.05?L.sensnone
        :L.sensnote.replace('{r}',fmt(Math.abs(yes-no))))+'</p>'
    +(broken?'<p class="broken">'+L.broken.replace('{p}',Math.round(broken.w*100))
        +(broken.d<0?' '+L.brokengood:' '+L.brokenbad)+'</p>':'<p class="broken">'+L.nobroken+'</p>')
    +'<h3>'+L.h_who+'</h3>'+who;

  syncUrl();
  var u=shareUrl(),txt=L.sharetext.replace('{n}',L.names[kind])
    .replace('{s}',fmt(score)).replace('{f}',Math.round(far));
  var x=document.getElementById('xshare');
  if(x)x.href='https://twitter.com/intent/tweet?text='+encodeURIComponent(txt)+'&url='+encodeURIComponent(u);
  var e=document.getElementById('embedcode');
  if(e)e.value=e.value.replace(/src="[^"]*"/,'src="'+u+(u.indexOf('?')>-1?'&':'?')+'embed=1"');
  if(window.gtag)gtag('event','exposure_score',{location:L.loc,label:String(ks.length)});
}

function copyLink(){var u=shareUrl();
  navigator.clipboard.writeText(u).then(function(){
    var c=document.getElementById('linkcopied');if(!c)return;
    c.style.display='inline';setTimeout(function(){c.style.display='none'},2000);});
  if(window.gtag)gtag('event','challenge_share',{location:L.loc,label:'copy_link'});}

function preset(list){sel={};list.forEach(function(k){sel[k]=1;});render();
  if(window.gtag)gtag('event','tool_click',{location:L.loc,label:'preset'});}
function clearAll(){sel={};render();}
document.addEventListener('click',function(ev){
  var a=ev.target.closest?ev.target.closest('#xshare'):null;
  if(a&&window.gtag)gtag('event','x_share',{location:L.loc});},true);
render();
"""

CSS_SHARED = """
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 6px}
.chip{cursor:pointer;border-radius:10px;padding:8px 11px;font:inherit;font-size:13px;line-height:1.25;text-align:left;display:flex;flex-direction:column;gap:1px}
.chip b{font-size:14px;letter-spacing:.02em}
.chip span{font-size:11px;opacity:.72}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
.tbl{width:100%;border-collapse:collapse;font-size:14px;margin:10px 0 4px}
.tbl th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;padding:8px 10px}
.tbl td{padding:9px 10px;vertical-align:top}
.tbl .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.stats{display:flex;gap:16px;flex-wrap:wrap}
.stat{flex:1 1 210px;min-width:0}
.stat>span{display:block;font-size:11px;letter-spacing:.07em;text-transform:uppercase;margin-bottom:4px}
.big{font-size:46px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
.big i{font-size:18px;font-weight:600;opacity:.55;margin-left:3px;font-style:normal}
.kind{font-size:15px;margin:16px 0 0;padding:11px 13px;border-radius:9px}
.kind b{font-weight:800}
.share{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 0;align-items:center}
.share .btn{font-size:14px;padding:9px 15px}
#linkcopied{display:none;font-size:13px}
.resultcta{margin:16px 0 0}
.resultcta b{font-size:15.5px}
.bar{position:relative;height:9px;border-radius:99px;margin:14px 0 8px;overflow:visible}
.bar i{display:block;height:100%;border-radius:99px}
.bar u{position:absolute;top:-5px;width:2px;height:19px;text-decoration:none}
.cmp{font-size:14px}
.sens{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0 4px}
.sens>div{flex:1 1 150px;border-radius:10px;padding:11px 13px}
.sens span{display:block;font-size:12px;margin-bottom:3px}
.sens b{font-size:26px;font-variant-numeric:tabular-nums}
.h{display:inline-block;font-size:12px;padding:2px 7px;border-radius:6px;margin:1px 3px 1px 0;white-space:nowrap}
.fine{font-size:12.5px;margin:8px 0}
.hint{font-size:14px;padding:16px 0}
.warn,.broken{font-size:13.5px;border-radius:9px;padding:10px 12px;margin:12px 0}
.inv{font-size:11px;padding:1px 5px;border-radius:5px}
.v{font-size:12px;padding:2px 7px;border-radius:6px;white-space:nowrap}
@media(max-width:520px){.big{font-size:42px}}
"""


CSS_EN = """
:root{--bg:#0e0e14;--bg2:#16151f;--bg3:#1e1c28;--border:#26232f;--text:#f4f4f8;--muted:#a8a4c4;--accent:#7c6af5;--accent2:#4fc3a1;--warn:#e8a040;--danger:#e05555}
*{margin:0;padding:0;box-sizing:border-box}
body{background:radial-gradient(900px 520px at 30% -5%,#1a1830,#0e0e14);color:var(--text);font:16px/1.65 -apple-system,'Segoe UI',Roboto,sans-serif;min-height:100vh}
.wrap{max-width:760px;margin:0 auto;padding:26px 20px 64px}
a{color:var(--accent);text-decoration:none}a:hover{opacity:.85}
header{display:flex;justify-content:space-between;align-items:center;font-size:14px;margin-bottom:26px}
header .brand{font-weight:700;color:var(--text)}
.kicker{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
h1{font-size:34px;line-height:1.15;margin:10px 0 12px;letter-spacing:-.01em}
h2{font-size:22px;margin:36px 0 10px}
h3{font-size:16px;margin:22px 0 6px}
p{margin:0 0 12px}
.lead{color:var(--muted);font-size:17px}
.capsule{background:var(--bg2);border:1px solid var(--border);border-left:3px solid var(--accent2);border-radius:0 12px 12px 0;padding:14px 16px;margin:18px 0}
.panel{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:18px}
.chip{background:var(--bg3);border:1px solid var(--border);color:var(--text)}
.chip.on{background:rgba(124,106,245,.18);border-color:var(--accent)}
.tbl th{color:var(--muted);border-bottom:1px solid var(--border)}
.tbl td{border-bottom:1px solid var(--border)}
.bar{background:var(--bg3)}
.bar i{background:linear-gradient(90deg,var(--accent),var(--accent2))}
.bar u{background:var(--warn)}
.cmp,.fine,.hint{color:var(--muted)}
.sens>div{background:var(--bg3);border:1px solid var(--border)}
.sens span{color:var(--muted)}
.v2{background:rgba(79,195,161,.16);color:var(--accent2)}
.v1{background:rgba(124,106,245,.16);color:var(--accent)}
.v0{background:rgba(224,85,85,.16);color:var(--danger)}
.inv{background:rgba(232,160,64,.16);color:var(--warn)}
.h-add{background:rgba(79,195,161,.16);color:var(--accent2)}
.h-hold{background:var(--bg3);color:var(--muted)}
.h-exit{background:rgba(224,85,85,.16);color:var(--danger)}
.warn{background:rgba(232,160,64,.1);border:1px solid rgba(232,160,64,.3);color:#f0c082}
.k-own{background:rgba(124,106,245,.14);color:#c3b9ff}
.k-mixed{background:rgba(79,195,161,.12);color:#9fe3cd}
.k-capex{background:rgba(232,160,64,.12);color:#f0c082}
.broken{background:var(--bg3);border:1px solid var(--border);color:var(--muted)}
.btn{display:inline-block;background:#6350d9;color:#fff;border:0;border-radius:10px;padding:11px 18px;font:inherit;font-size:15px;font-weight:600;cursor:pointer}
.btn.sec{background:var(--bg3);color:var(--text);border:1px solid var(--border)}
.row{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}
.cta{background:linear-gradient(135deg,rgba(124,106,245,.1),rgba(79,195,161,.07));border:1px solid rgba(124,106,245,.25);border-radius:14px;padding:18px;margin:26px 0}
.pro{border:1px dashed var(--border2,#3a3550);border-radius:14px;padding:18px;margin:22px 0;background:var(--bg2)}
.pro ul{margin:8px 0 10px 1.1rem}.pro li{margin-bottom:5px;font-size:14.5px}
.embedbox textarea{width:100%;height:70px;background:var(--bg);color:var(--muted);border:1px solid var(--border);border-radius:8px;padding:10px;font:12px/1.5 monospace;resize:vertical;margin:8px 0}
.faq b{display:block;margin:16px 0 4px}
footer{border-top:1px solid var(--border);margin-top:36px;padding-top:18px;font-size:12.5px;color:var(--muted)}
.embed-brand{display:none;text-align:center;margin:16px 0 2px;font-size:13px}
body.embed{background:#0e0e14}
body.embed header,body.embed .lead,body.embed .marketing{display:none}
body.embed h1{font-size:25px}
body.embed .embed-brand{display:block}
#embedcopied{display:none;color:var(--accent2);font-size:13px;margin-left:8px}
"""

CSS_ZH = """
:root{--bg:#ffffff;--bg2:#f7f7f8;--bg3:#eeeef1;--border:rgba(0,0,0,0.10);--border2:rgba(0,0,0,0.18);--text:#0a0a0b;--muted:#63636e;--accent:#002FA7;--accent2:#0f7a52;--warn:#8a5a00;--danger:#C8102E}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-variant-numeric:tabular-nums;font-family:'Noto Sans SC','PingFang SC','Microsoft YaHei',-apple-system,sans-serif;font-size:16px;line-height:1.75}
.wrap{max-width:760px;margin:0 auto;padding:26px 20px 64px}
a{color:var(--accent);text-decoration:none}a:hover{opacity:.8}
header{display:flex;justify-content:space-between;align-items:center;font-size:14px;padding-bottom:14px;border-bottom:1px solid var(--border);margin-bottom:24px}
header .brand{font-weight:700;color:var(--text)}
.kicker{font-size:12px;letter-spacing:.1em;color:var(--muted)}
h1{font-size:31px;line-height:1.25;margin:8px 0 12px;letter-spacing:-.01em}
h2{font-size:20px;margin:34px 0 10px}
h3{font-size:15.5px;margin:22px 0 6px}
p{margin:0 0 12px}
.lead{color:var(--muted);font-size:16px}
.capsule{background:var(--bg2);border-left:3px solid var(--accent);padding:13px 16px;margin:18px 0}
.panel{border:1px solid var(--border);border-radius:2px;padding:18px;background:var(--bg2)}
.chip{background:#fff;border:1px solid var(--border2);color:var(--text)}
.chip.on{background:var(--accent);border-color:var(--accent);color:#fff}
.chip.on span{opacity:.85}
.tbl th{color:var(--muted);border-bottom:1px solid var(--border2)}
.tbl td{border-bottom:1px solid var(--border)}
.bar{background:var(--bg3)}
.bar i{background:var(--accent)}
.bar u{background:var(--text)}
.cmp,.fine,.hint{color:var(--muted)}
.sens>div{background:var(--bg2);border:1px solid var(--border)}
.sens span{color:var(--muted)}
.v2{color:var(--accent2)}
.v1{color:var(--muted)}
.v0{color:var(--danger)}
.inv{background:var(--bg3);color:var(--warn)}
.h-add{color:var(--accent2)}
.h-hold{color:var(--muted)}
.h-exit{color:var(--danger)}
.warn{background:var(--bg2);border:1px solid var(--border2);color:var(--warn)}
.k-own{background:var(--bg2);border-left:3px solid var(--accent);border-radius:0}
.k-mixed{background:var(--bg2);border-left:3px solid var(--accent2);border-radius:0}
.k-capex{background:var(--bg2);border-left:3px solid var(--warn);border-radius:0}
.broken{background:var(--bg2);border:1px solid var(--border);color:var(--muted)}
.btn{display:inline-block;background:var(--accent);color:#fff;border:0;border-radius:2px;padding:11px 18px;font:inherit;font-size:15px;font-weight:600;cursor:pointer}
.btn.sec{background:#fff;color:var(--text);border:1px solid var(--border2)}
.row{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}
.cta{border:1px solid var(--border2);padding:18px;margin:26px 0;background:var(--bg2)}
.pro{border:1px dashed var(--border2);padding:18px;margin:22px 0}
.pro ul{margin:8px 0 10px 1.1rem}.pro li{margin-bottom:5px;font-size:14.5px}
.embedbox textarea{width:100%;height:70px;background:#fff;color:var(--muted);border:1px solid var(--border);border-radius:2px;padding:10px;font:12px/1.5 monospace;resize:vertical;margin:8px 0}
.faq b{display:block;margin:16px 0 4px}
footer{border-top:1px solid var(--border);margin-top:36px;padding-top:18px;font-size:12.5px;color:var(--muted)}
.embed-brand{display:none;text-align:center;margin:16px 0 2px;font-size:13px}
body.embed header,body.embed .lead,body.embed .marketing{display:none}
body.embed h1{font-size:24px}
body.embed .embed-brand{display:block}
#embedcopied{display:none;color:var(--accent2);font-size:13px;margin-left:8px}
"""


PRESETS = [
    ("infra", ["NVDA", "AMD", "TSM", "AVGO", "MU"]),
    ("mega", ["MSFT", "GOOGL", "AMZN", "AAPL", "META"]),
    ("ark", ["TSLA", "AMD", "PLTR", "AMZN", "CRWV", "TEM"]),
    ("brk", ["AAPL", "GOOGL"]),
]

COPY = {
"en": {
 "lang": "en", "dir": "/", "slug": "ai-stock-exposure", "alt": "/zh/ai-stock-exposure",
 "altlabel": "中文版", "loc": "exposure_en",
 "title": "AI Stock Exposure Check — Score Your AI Basket",
 "desc": "Pick the AI stocks you hold and get one auditable 0-100 score: how much of your basket rides on AGI predictions that are actually holding up.",
 "kicker": "AGI Scorecard · Invest",
 "h1": "AI Stock Exposure Check",
 "lead": "Pick the AI names you hold. Get one number on the same 0&ndash;100 scale as our AGI-2027 Thesis Tracker &mdash; so you can read your basket directly against the thesis it is priced on.",
 "capsule": "<strong>You almost certainly cannot buy the AGI-2027 thesis.</strong> It scores <strong>__BASE__/100</strong> today. A standard AI infrastructure basket scores <strong>99</strong> against it &mdash; while about <strong>2%</strong> of its weight rides on whether AGI actually arrives. The other 98% is the buildout: capex, compute, and knowledge-work capability that is already shipping. High score, different bet. This tool tells you which one you are holding.",
 "names": {
   "own": "The Thesis Owner",
   "mixed": "The Tail Holder",
   "capex": "The Capex Landlord",
   "anti": "The Anti-Thesis"
 },
 "namesep": ". ",
 "sharetext": "My AI basket: {n}. It scores {s}/100 against the AGI-2027 thesis \u2014 but only {f}% of it actually rides on AGI arriving. Score yours:",
 "copybtn": "Copy my basket link",
 "xbtn": "Share on X",
 "sharenote": "The link carries your basket, nothing else &mdash; no account, no cookie, no email. Bookmark it and the same page will show you what changed when a verdict moves.",
 "ctahead": "Your basket: {s}/100, with {f}% riding on AGI itself.",
 "ctabody": "That number only changes when a verdict actually changes. We will tell you the day it does &mdash; which is also the day every position above re-scores.",
 "ctabtn": "Tell me when my score moves &rarr;",
 "utm": "exposure_en",
 "score_label": "Thesis alignment",
 "far_label": "Priced on AGI itself",
 "farnote": "The rest is priced on the buildout &mdash; capex, compute and the knowledge-work capability already shipping.",
 "kinds": {
   "own": "This basket genuinely owns the 2027 bet. A quarter or more of it rides on predictions that have not resolved &mdash; which is where the loss lives if they resolve badly.",
   "mixed": "Mostly buildout, with a real tail on AGI itself. If the 2027 verdict lands, you will feel it, but it will not be the whole position.",
   "capex": "This is a capex position wearing an AGI label. Almost none of it rides on whether AGI arrives &mdash; it rides on the spending continuing, which is a different bet with a different way of going wrong.",
   "anti": "Most of this basket pays off when the thesis FAILS, not when it holds. That is a coherent position and a rare one &mdash; and it is currently the winning side of the only prediction that has actually been called."
 },
 "h_pick": "Pick what you hold",
 "presets": {"infra": "Infrastructure", "mega": "Mega-cap AI", "ark": "ARK's AI book (13F)", "brk": "Berkshire's AI exposure (13F)"},
 "clear": "Clear",
 "empty": "Pick one or more tickers above. Nothing is sent anywhere &mdash; the whole calculation runs in this browser.",
 "vs": "The AGI-2027 thesis itself scores <b>{b}</b>. Your basket is <b>{d}</b> against it.",
 "h_break": "What your basket is actually betting on",
 "prediction": "Prediction", "share": "Share", "verdict": "Verdict",
 "inverse": "inverse",
 "h_sens": "If the 2027 verdict resolves",
 "if_yes": "AGI by 2027 = YES", "if_no": "AGI by 2027 = NO",
 "sensnone": "No swing at all. Nothing in this basket resolves on the 2027 date &mdash; whichever way that verdict lands, none of these positions is directly on the other side of it.",
 "sensnote": "A {r}-point swing. That range is the part of your basket that is genuinely a bet on the 2027 date, rather than on the buildout that is already funded.",
 "broken": "{p}% of your basket rides on the one prediction already graded <b>Wrong</b> (open source fades).",
 "brokengood": "You are on the winning side of it.",
 "brokenbad": "You are on the losing side of it.",
 "nobroken": "None of your basket rides on the one prediction already graded Wrong (open source fades) &mdash; in either direction. Nothing here pays off if the thesis breaks.",
 "h_who": "Who else holds these",
 "investor": "Investor", "position": "Position (Q2 2026 13F)",
 "act": {"add": "added", "hold": "held", "exit": "exited"},
 "holdnote": "From public Q2 2026 13F filings — holdings as of 2026-06-30, filed 2026-08-14. Only Berkshire and ARK have line-by-line filings on this site; the other six investors on <a href=\"/invest\">/invest</a> are summarised qualitatively, so they are not shown here rather than guessed at.",
 "nohold": "Neither of the two investors with line-by-line 13F filings on this site holds any of these. Six more are tracked qualitatively on <a href=\"/invest\">/invest</a>.",
 "covwarn": "Most of what you picked has <b>low coverage</b>: the eight predictions only reach a small part of these companies' stories. The score above is about that part, not the whole stock.",
 "h_method": "How the score is computed",
 "method": "<p>Each prediction carries the same weight the <a href=\"/progress-index\">Thesis Tracker</a> gives it: supportive&nbsp;=&nbsp;1, open or pending&nbsp;=&nbsp;0.5, refuted&nbsp;=&nbsp;0. A ticker's score is the weighted average of the predictions its AI valuation rides on; a basket is the average of its tickers. Inverse positions score <code>1&nbsp;&minus;&nbsp;weight</code>, because they pay off when the prediction fails.</p><p>That is deliberately the same arithmetic as the Tracker, which is why <strong>__BASE__</strong> is a meaningful line to compare against rather than an arbitrary benchmark. Verdicts come from <a href=\"/data.json\">/data.json</a> (CC BY 4.0) and this page is regenerated whenever one changes.</p><p><strong>The part to argue with:</strong> which predictions each ticker is mapped to is an editorial judgement, not a filing. It is an argument about what a company's AI valuation depends on. Holdings are not &mdash; those come straight from public 13F filings and nothing is inferred beyond them. There are no prices here and no performance claims: this measures what a basket is <em>exposed</em> to, not what it is worth.</p>",
 "h_pro": "What a paid tier would add",
 "pro": "<p>This tool is free and stays free. The recurring version is a different product, and it is not built yet:</p><ul><li>An alert the day a verdict flips &mdash; that is the day every basket score on this page moves.</li><li>Quarterly 13F diffs against the basket in your saved link, filed within days of each deadline.</li><li>The full ticker map rather than the seventeen names here.</li></ul><p>There is no waitlist form and no pre-order. The briefing below is where it would be announced, and subscribers get asked what it should cost before anything is priced.</p>",
 "h_bridge": "The one paid product that does exist",
 "bridge": "<p>Separately from this page, one live subscription runs on this domain, and it is deliberately not the same thing. <a href=\"https://invest.agiscorecard.com/en\" target=\"_blank\" rel=\"noopener\" onclick=\"gtag('event','invest_tool_click',{location:'__BRIDGELOC__'});\">SunWatch</a> writes market judgements as falsifiable price triggers, watches them by machine across the US, Hong Kong and A&#8209;share sessions, and files every one in public &mdash; <a href=\"https://invest.agiscorecard.com/en/track-record\" target=\"_blank\" rel=\"noopener\" onclick=\"gtag('event','invest_tool_click',{location:'__BRIDGELOC___record'});\">hits and misses side by side</a>, losers never deleted. The free tier is a daily Telegram preview; Pro is &yen;199/month (&asymp;$28, paid in USDT, no account and no card on file) for the specific entry and stop levels and the real-time trigger alerts.</p><p>It does not score baskets and it will not tell you what this page tells you. If you want the exposure map, stay here &mdash; it is free and it stays free. If you want a dated, auditable position on names like these <em>this week</em>, that is what is over there.</p>",
 "bridgebtn": "See the public track record &rarr;",
 "tgbtn": "Watch it on Telegram &rarr;",
 "tgnote": "One tap, no email and no account. The bot confirms the tickers back to you, then sends the free daily preview and one message the day the Tracker score moves \u2014 which is the day this basket re-scores.",
 "tglong": "Pick 10 tickers or fewer to have this basket watched on Telegram \u2014 the link that carries it has a length limit, and a truncated basket would be the wrong one to watch.",
 "sub": "Get told when the score moves",
 "subp": "The score only changes when a verdict actually changes &mdash; so this is a low-frequency email, not a newsletter treadmill. Free.",
 "subbtn": "Subscribe free &rarr;",
 "h_embed": "Embed this tool",
 "embedp": "Free to embed on any site. It carries one link back here.",
 "embedbtn": "Copy embed code",
 "h_faq": "Frequently asked questions",
 "faq": [
   ("Is this investment advice?",
    "No. There are no prices, no targets, no buy or sell calls, and no performance claims anywhere in this tool. It measures one narrow thing: how much of a basket's story depends on AGI predictions that are currently holding up, using verdicts published openly at /data.json. What you do with that is your decision, and you should talk to someone licensed before acting on any of it."),
   ("Where do the holdings come from?",
    "Public SEC 13F filings for Q2 2026 — holdings as of June 30, 2026, filed August 14, 2026 — already audited into this site's investor profiles. Only Berkshire Hathaway and ARK Invest have line-by-line filings here; the other six investors tracked on /invest have qualitative stances only, so they are left out of the holdings table rather than guessed at."),
   ("Why does my infrastructure basket score higher than the thesis?",
    "Because the two predictions those companies ride on — compute scaling and AI capex — are both currently graded supportive, and capex is graded as exceeded. The capability predictions further out, including AGI by 2027 itself, are still unresolved and score 0.5. A high score means your basket is levered to the parts already working, not that it is safe."),
   ("What happens to the score if a verdict changes?",
    "Every basket moves. The page is regenerated from /data.json, so a verdict flip propagates to this tool, the Thesis Tracker and the homepage in the same commit. The one prediction already graded Wrong — that open source would fade — is why inverse positions like Meta and Alibaba score the way they do."),
   ("Can I save or share my basket?",
    "Yes, and it needs no account. Your basket is written into the page URL as you pick — copy the link and it reopens exactly as you left it, for you or for anyone you send it to. There is no cookie, no login and no email involved. Bookmarking that link is also what makes the planned alert useful: when a verdict changes, the same URL will show you a different score."),
 ],
 "disclaimer": "Not investment advice. No prices, targets or performance claims. Holdings are from public 13F filings as of 2026-06-30 and may be out of date; the prediction mapping is editorial. Do your own research.",
 "related": "Related", "rel": [
   ("/invest", "The Invest section — how 8 legends are positioned"),
   ("/progress-index", "AGI-2027 Thesis Tracker — the score this is read against"),
   ("/is-the-ai-capex-a-bubble", "Is the AI capex a bubble?"),
   ("/aschenbrenner-fund-collapse", "The fund that bet the thesis, and blew up"),
   ("/ai-tools", "All free tools"),
 ],
 "brand": "AGI Scorecard", "home": "← Live scorecard",
 "embedbrand": "📈 <b>AI Stock Exposure Check</b> · ",
 "embedbrandlink": "Run the full tool on AGI Scorecard →",
 "foot": "Every verdict is published with sources at <a href=\"/\">agiscorecard.com</a>. Dataset: <a href=\"/data.json\">/data.json</a> (CC BY 4.0).",
},
"zh": {
 "lang": "zh-Hans", "dir": "/zh/", "slug": "ai-stock-exposure", "alt": "/ai-stock-exposure",
 "altlabel": "English", "loc": "exposure_zh",
 "title": "AI 持仓敞口自查 — 你押的是哪条 AGI 命题",
 "desc": "选出你持有的 AI 标的，得到一个 0-100 的可审计分数：你的组合有多少押在「目前仍然成立」的 AGI 预测上。",
 "kicker": "AGI 记分牌 · 投资",
 "h1": "AI 持仓敞口自查",
 "lead": "选出你手上的 AI 标的，得到一个分数——和我们的 AGI-2027 追踪指数<strong>同一把尺子</strong>，可以直接和它定价所依赖的那条命题对读。",
 "capsule": "<strong>你大概率买不到 AGI-2027 这条命题。</strong>它今天的分数是 <strong>__BASE__/100</strong>。一个标准的 AI 基建组合对照它能打到 <strong>99</strong> 分——但其中只有约 <strong>2%</strong> 的权重真正压在「AGI 会不会到来」上，另外 98% 压的是基建：资本开支、算力，以及已经在出货的知识工作能力。分数很高，赌的却是另一件事。这个工具告诉你，你手上的是哪一个。",
 "names": {
   "own": "命题持有者",
   "mixed": "留了尾巴的人",
   "capex": "基建包租公",
   "anti": "反向押注者"
 },
 "namesep": "。",
 "sharetext": "我的 AI 组合是「{n}」——对照 AGI-2027 命题打 {s}/100 分，但真正押在「AGI 会不会到来」上的只有 {f}%。测测你的：",
 "copybtn": "复制我的组合链接",
 "xbtn": "分享到 X",
 "sharenote": "链接里只有你的组合，没有别的——不需要账号、不写 cookie、不要邮箱。存下来，判定一变，同一个链接会告诉你变了什么。",
 "ctahead": "你的组合：{s}/100，其中 {f}% 押在 AGI 本身。",
 "ctabody": "这个数只有在判定真的变化时才会动。它变的那天我们告诉你——那天也是上面每一个仓位重新计分的那天。",
 "ctabtn": "分数变动时通知我 &rarr;",
 "utm": "exposure_zh",
 "score_label": "命题一致度",
 "far_label": "押在 AGI 本身",
 "farnote": "剩下的部分押的是基建——资本开支、算力，以及已经在出货的知识工作能力。",
 "kinds": {
   "own": "这个组合是真的在押 2027。有四分之一以上压在尚未落地的预测上——判定一旦转向不利，亏损就出在这里。",
   "mixed": "以基建为主，但对 AGI 本身留了一条真实的尾巴。2027 判定落地时你会有感觉，只是它不会是仓位的全部。",
   "capex": "这是一个披着 AGI 外衣的资本开支仓位。它几乎完全没有押 AGI 会不会来——它押的是开支继续，那是另一场赌局，出错的方式也完全不同。",
   "anti": "这个组合大部分是在命题<strong>失败</strong>时获利，而不是成立时。这是一个自洽而且少见的仓位——而且它目前站在唯一一条已经落地的判定的赢面上。"
 },
 "h_pick": "选出你持有的",
 "presets": {"infra": "基建组合", "mega": "大盘 AI", "ark": "木头姐的 AI 持仓（13F）", "brk": "伯克希尔的 AI 敞口（13F）"},
 "clear": "清空",
 "empty": "在上面选一个或多个标的。数据不会离开你的浏览器——全部计算都在本地完成。",
 "vs": "AGI-2027 命题本身是 <b>{b}</b> 分。你的组合相对它 <b>{d}</b>。",
 "h_break": "你的组合实际押在什么上",
 "prediction": "预测", "share": "占比", "verdict": "判定",
 "inverse": "反向",
 "h_sens": "如果 2027 判定落地",
 "if_yes": "2027 年 AGI = 成立", "if_no": "2027 年 AGI = 落空",
 "sensnone": "完全没有区间。这个组合里没有任何东西是在 2027 这个日期上结算的——判定无论转向哪边，这些仓位都不直接站在它的对面。",
 "sensnote": "区间 {r} 分。这个区间才是你组合里真正押「2027 这个日期」的部分；区间之外押的是已经拿到钱的基建。",
 "broken": "你的组合有 {p}% 押在唯一一条已判定<b>落空</b>的预测上（开源退场）。",
 "brokengood": "你站在它赢的那一边。",
 "brokenbad": "你站在它输的那一边。",
 "nobroken": "你的组合完全没有押在唯一一条已判定落空的预测上（开源退场）——正反两个方向都没有。也就是说，命题一旦破裂，这里没有任何东西会赚钱。",
 "h_who": "还有谁持有这些",
 "investor": "投资者", "position": "仓位（2026 Q2 13F）",
 "act": {"add": "加仓", "hold": "持有", "exit": "清仓"},
 "holdnote": "来自 2026 年 Q2 公开 13F 文件——持仓截至 2026-06-30，申报于 2026-08-14。本站只有伯克希尔与 ARK 有逐笔持仓；<a href=\"/zh/invest\">/zh/invest</a> 上另外 6 位只有定性描述，因此这里不列出，而不是靠猜。",
 "nohold": "本站有逐笔 13F 的两位投资者都不持有这些标的。另有 6 位在 <a href=\"/zh/invest\">/zh/invest</a> 以定性方式跟踪。",
 "covwarn": "你选的大多数标的<b>链路较弱</b>：这 8 条预测只能覆盖它们故事的一小部分。上面的分数说的是那一部分，不是整只股票。",
 "h_method": "分数怎么算出来的",
 "method": "<p>每条预测的权重与<a href=\"/zh/progress-index\">追踪指数</a>完全一致：成立&nbsp;=&nbsp;1，未决或待定&nbsp;=&nbsp;0.5，落空&nbsp;=&nbsp;0。单个标的的分数，是它的 AI 估值所依赖的那些预测的加权平均；组合分数是各标的的平均。反向仓位按 <code>1&nbsp;&minus;&nbsp;权重</code> 计分，因为它们是在预测失败时获利。</p><p>这套算术和追踪指数<strong>刻意保持一致</strong>——所以 <strong>__BASE__</strong> 是一条有意义的对照线，而不是随便找来的基准。判定来自 <a href=\"/data.json\">/data.json</a>（CC BY 4.0），任何一条判定变动，本页都会重新生成。</p><p><strong>该被质疑的部分：</strong>每个标的映射到哪几条预测，是编辑判断，不是文件事实——它是一个关于「这家公司的 AI 估值到底依赖什么」的论证。持仓不是：那部分直接来自公开 13F，没有任何超出文件的推断。这里没有价格，也没有任何收益率主张：它衡量的是组合<em>暴露在什么上</em>，不是它值多少钱。</p>",
 "h_pro": "如果做成付费版，会多什么",
 "pro": "<p>这个工具免费，而且会一直免费。真正可以订阅的是另一件东西，目前<strong>还没做</strong>：</p><ul><li>判定翻转当天的提醒——那一天，本页所有组合分数都会变。</li><li>按季度把新 13F 与你保存的那个链接里的组合做差分，截止日后几天内出。</li><li>完整标的映射，而不是这里的 17 个。</li></ul><p>没有等待名单表单，也没有预售。要发布的话会发在下面这份简报里，而且定价之前会先问订阅者应该定多少。</p>",
 "h_bridge": "本域名下唯一一个真的在收费的产品",
 "bridge": "<p>和这个页面分开，本域名下确实跑着一个可以订阅的付费产品，而且它<strong>刻意</strong>不是同一件事。<a href=\"https://invest.agiscorecard.com/\" target=\"_blank\" rel=\"noopener\" onclick=\"gtag('event','invest_tool_click',{location:'__BRIDGELOC__'});\">SunWatch</a> 把市场判断写成可证伪的价格触发条件，用机器跨美股 / 港股 / A 股三个时段盯盘，每一条都公开建档——<a href=\"https://invest.agiscorecard.com/track-record\" target=\"_blank\" rel=\"noopener\" onclick=\"gtag('event','invest_tool_click',{location:'__BRIDGELOC___record'});\">命中与失误同等展示</a>，失误从不删除。免费档是每日一条 Telegram 预告；Pro 是 &yen;199/月（USDT 支付，无需注册、不留卡号），解锁具体买卖价位、止损线和实时触发报警。</p><p>它不算组合分数，也给不了你这个页面给你的东西。想要暴露度地图，就留在这里——免费，而且会一直免费。想要的是<em>本周</em>对这类标的一条有日期、可回查的仓位判断，那在那边。</p>",
 "bridgebtn": "去看公开战绩 &rarr;",
 "tgbtn": "用 Telegram 盯住它 &rarr;",
 "tgnote": "一次点击，不用邮箱、不用注册。bot 会把标的原样念回来确认，然后发每日免费预告，以及追踪指数分数变动那天的一条消息——那一天这个组合会重新计分。",
 "tglong": "标的选到 10 个以内才能用 Telegram 盯住：承载它的链接有长度上限，而盯一个被截断的组合是错的。",
 "sub": "分数变动时通知你",
 "subp": "只有判定真的变化，分数才会动——所以这是一封低频邮件，不是每周硬发的新闻信。免费。（订阅页为英文表单，填邮箱即可）",
 "subbtn": "免费订阅 &rarr;",
 "h_embed": "嵌入这个工具",
 "embedp": "可自由嵌入任何网站，会带一条回链。",
 "embedbtn": "复制嵌入代码",
 "h_faq": "常见问题",
 "faq": [
   ("这算投资建议吗？",
    "不算。整个工具里没有价格、没有目标价、没有买卖建议，也没有任何收益率主张。它只衡量一件很窄的事：一个组合的故事，有多少依赖于目前仍然成立的 AGI 预测——判定全部公开在 /data.json。至于你据此做什么，是你自己的决定，行动前请咨询有牌照的专业人士。"),
   ("持仓数据是哪来的？",
    "来自 2026 年 Q2 的公开 SEC 13F 文件——持仓截至 2026 年 6 月 30 日，申报于 2026 年 8 月 14 日，已经审入本站的投资者档案页。本站只有伯克希尔与 ARK 有逐笔持仓；/zh/invest 上跟踪的另外 6 位只有定性立场，因此不进持仓表，而不是拿定性描述当持仓用。"),
   ("为什么我的基建组合分数比命题本身还高？",
    "因为这些公司依赖的两条预测——算力按趋势推进、AI 资本开支——目前都判定成立，其中资本开支还判定为「超出」。更靠后的能力类预测，包括「2027 年 AGI」本身，都还未决，计 0.5 分。分数高意味着你的组合杠杆压在已经跑通的那部分上，不意味着它安全。"),
   ("判定变了，分数会怎样？",
    "所有组合都会动。本页从 /data.json 重新生成，因此一条判定翻转会在同一次提交里同时传导到这个工具、追踪指数和首页。唯一一条已判定落空的预测——「开源会退场」——正是 Meta、阿里这类反向仓位分数如此的原因。"),
   ("能保存或分享我的组合吗？",
    "可以，而且不需要账号。你每选一次，组合就写进页面网址——复制链接，它会原样打开，对你自己和对你发给的人都一样。整个过程没有 cookie、没有登录、不要邮箱。把这个链接存下来，也正是未来那个提醒有用的原因：判定一变，同一个网址会给你一个不同的分数。"),
 ],
 "disclaimer": "非投资建议。无价格、无目标价、无收益率主张。持仓来自截至 2026-06-30 的公开 13F，可能已过时；预测映射为编辑判断。请自行研究。",
 "related": "相关", "rel": [
   ("/zh/invest", "AI 投资板块 — 8 位传奇的真实仓位"),
   ("/zh/progress-index", "AGI-2027 追踪指数 — 本页对照的那条线"),
   ("/zh/is-agi-just-hype", "AGI 是不是炒作？"),
   ("/cn", "中文主页"),
   ("/zh/ai-tools", "全部免费工具"),
 ],
 "brand": "AGI 记分牌", "home": "← 返回记分牌",
 "embedbrand": "📈 <b>AI 持仓敞口自查</b> · ",
 "embedbrandlink": "在 AGI 记分牌上使用完整版 →",
 "foot": "每条判定都在 <a href=\"/cn\">agiscorecard.com</a> 附信源公开。数据集：<a href=\"/data.json\">/data.json</a>（CC BY 4.0）。",
},
}


PAGE = """<!DOCTYPE html>
<html lang="__LANG__">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=__GA__"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '__GA__');
</script>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230a0a0b'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%234fc3a1'/%3E%3C/svg%3E">
<title>__TITLE__</title>
<meta name="description" content="__DESC__">
<link rel="canonical" href="__CANON__">
<link rel="alternate" hreflang="en" href="https://agiscorecard.com/ai-stock-exposure">
<link rel="alternate" hreflang="zh-Hans" href="https://agiscorecard.com/zh/ai-stock-exposure">
<link rel="alternate" hreflang="x-default" href="https://agiscorecard.com/ai-stock-exposure">
<meta property="og:site_name" content="__BRAND__">
<meta property="og:title" content="__TITLE__">
<meta property="og:description" content="__DESC__">
<meta property="og:type" content="website">
<meta property="og:url" content="__CANON__">
<meta property="og:image" content="https://agiscorecard.com/scorecard-summary.png">
<meta name="twitter:card" content="summary_large_image">
__LD__
<style>__CSS____CSS_SHARED__</style>
</head>
<body>
<script>if(location.search.indexOf('embed')>-1||location.hash.indexOf('embed')>-1){document.body.classList.add('embed');}</script>
<div class="wrap">
<header><a class="brand" href="__HOMEHREF__">__BRAND__</a><a href="__HOMEHREF__">__HOME__</a></header>
<div class="kicker">__KICKER__</div>
<h1>__H1__</h1>
<p class="lead">__LEAD__</p>
<div class="capsule">__CAPSULE__</div>

<h2>__H_PICK__</h2>
<div class="row">__PRESETS__<button type="button" class="btn sec" onclick="clearAll()">__CLEAR__</button></div>
<div class="chips" id="chips"></div>
<div class="panel" id="out"></div>

<div class="cta marketing">
  <b>__SUB__</b>
  <p style="margin:6px 0 10px">__SUBP__</p>
  <a class="btn" href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&amp;utm_medium=__UTM__" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'__SUBLOC__'});">__SUBBTN__</a>
</div>

<div class="marketing">
<h2>__H_METHOD__</h2>
__METHOD__

<div class="pro">
<h3 style="margin-top:0">__H_PRO__</h3>
__PRO__
<a class="btn sec" href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&amp;utm_medium=__UTM___pro" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'__PROLOC__'});">__SUBBTN__</a>
</div>

<div class="pro">
<h3 style="margin-top:0">__H_BRIDGE__</h3>
__BRIDGE__
<a class="btn sec" href="https://invest.agiscorecard.com/__BRIDGEPATH__" target="_blank" rel="noopener" onclick="gtag('event','invest_tool_click',{location:'__BRIDGELOC___btn'});">__BRIDGEBTN__</a>
</div>

<h2>__H_EMBED__</h2>
<p>__EMBEDP__</p>
<div class="embedbox">
  <textarea id="embedcode" readonly>&lt;iframe src="__CANON__?embed=1" width="100%" height="900" style="border:1px solid #26232f;border-radius:12px;max-width:720px" title="__TITLE__" loading="lazy"&gt;&lt;/iframe&gt;</textarea>
  <button class="btn sec" onclick="copyEmbed()">__EMBEDBTN__</button><span id="embedcopied">&#10003;</span>
</div>

<h2>__H_FAQ__</h2>
<div class="faq">__FAQ__</div>

<h2>__RELATED__</h2>
<p>__REL__</p>
</div>

<div class="embed-brand">__EMBEDBRAND__<a href="__CANON__?utm_source=tool_embed&amp;utm_medium=iframe" target="_blank" rel="noopener" onclick="gtag('event','embed_brand_click',{location:'__SUBLOC__'});">__EMBEDBRANDLINK__</a></div>

<footer><p>__FOOT__</p><p style="margin-top:8px">__DISCLAIMER__</p></footer>
</div>
<script>__SCRIPT__
function copyEmbed(){var t=document.getElementById('embedcode');navigator.clipboard.writeText(t.value).then(function(){var c=document.getElementById('embedcopied');c.style.display='inline';setTimeout(function(){c.style.display='none'},2000)});gtag('event','embed_copy',{location:'__SUBLOC__'});}
</script>
</body>
</html>
"""


def build(lang, preds, base, asof):
    c = COPY[lang]
    canon = "https://agiscorecard.com" + c["dir"] + c["slug"]
    strings = {k: c[k] for k in (
        "empty", "vs", "h_break", "prediction", "share", "verdict", "inverse",
        "h_sens", "if_yes", "if_no", "sensnote", "broken", "brokengood",
        "brokenbad", "nobroken", "h_who", "investor", "position", "act",
        "holdnote", "nohold", "covwarn", "loc", "sensnone",
        "score_label", "far_label", "farnote", "kinds", "names", "namesep", "sharetext",
        "copybtn", "xbtn", "sharenote", "ctahead", "ctabody", "ctabtn", "utm",
        "tgbtn", "tgnote", "tglong")}

    script = (SCRIPT
              .replace("__DATA__", js_payload(preds, lang))
              .replace("__STR__", json.dumps(strings, ensure_ascii=False, separators=(",", ":")))
              .replace("__BASE__", str(base))
              .replace("__CANON__", json.dumps(canon)))

    presets = "".join(
        '<button type="button" class="btn sec" onclick=\'preset(%s)\'>%s</button>'
        % (json.dumps(t), c["presets"][k]) for k, t in PRESETS)

    faq_html = "".join("<b>%s</b><p>%s</p>" % (q, a) for q, a in c["faq"])
    rel = " · ".join('<a href="%s">%s</a>' % (u, t) for u, t in c["rel"])

    ld = [
        {"@context": "https://schema.org", "@type": "WebApplication",
         "name": c["h1"], "url": canon, "description": c["desc"],
         "applicationCategory": "FinanceApplication", "operatingSystem": "Any (web browser)",
         "browserRequirements": "Requires JavaScript", "isAccessibleForFree": True,
         "inLanguage": c["lang"],
         "featureList": ["17 AI tickers mapped to eight graded AGI predictions",
                         "Basket score on the same 0-100 scale as the AGI-2027 Thesis Tracker",
                         "Public Q2 2026 13F holdings for Berkshire and ARK",
                         "Embeddable via ?embed=1"],
         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
         "publisher": {"@type": "Organization", "name": "AGI Scorecard", "url": "https://agiscorecard.com/"},
         "isPartOf": {"@type": "CollectionPage", "name": "Free AI & AGI tools",
                      "url": "https://agiscorecard.com" + ("/zh/ai-tools" if lang == "zh" else "/ai-tools")}},
        {"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": c["lang"],
         "mainEntity": [{"@type": "Question", "name": q,
                         "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in c["faq"]]},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": c["brand"],
             "item": "https://agiscorecard.com" + ("/cn" if lang == "zh" else "/")},
            {"@type": "ListItem", "position": 2, "name": "Invest",
             "item": "https://agiscorecard.com" + ("/zh/invest" if lang == "zh" else "/invest")},
            {"@type": "ListItem", "position": 3, "name": c["h1"], "item": canon}]},
    ]
    ld_html = "\n".join('<script type="application/ld+json">%s</script>'
                        % json.dumps(x, ensure_ascii=False, separators=(",", ":")) for x in ld)

    html = PAGE
    for k, v in [
        ("__LANG__", c["lang"]), ("__GA__", GA), ("__TITLE__", c["title"]),
        ("__DESC__", c["desc"]), ("__CANON__", canon), ("__BRAND__", c["brand"]),
        ("__LD__", ld_html), ("__CSS_SHARED__", CSS_SHARED),
        ("__CSS__", CSS_ZH if lang == "zh" else CSS_EN),
        ("__HOMEHREF__", "/cn" if lang == "zh" else "/"), ("__HOME__", c["home"]),
        ("__KICKER__", c["kicker"]), ("__H1__", c["h1"]), ("__LEAD__", c["lead"]),
        ("__CAPSULE__", c["capsule"]), ("__H_PICK__", c["h_pick"]),
        ("__PRESETS__", presets), ("__CLEAR__", c["clear"]),
        ("__SUB__", c["sub"]), ("__SUBP__", c["subp"]), ("__SUBBTN__", c["subbtn"]),
        ("__UTM__", "exposure_" + lang), ("__SUBLOC__", c["loc"]),
        ("__PROLOC__", c["loc"] + "_pro"),
        ("__H_METHOD__", c["h_method"]), ("__METHOD__", c["method"]),
        ("__H_PRO__", c["h_pro"]), ("__PRO__", c["pro"]),
        ("__H_BRIDGE__", c["h_bridge"]), ("__BRIDGE__", c["bridge"]),
        ("__BRIDGEBTN__", c["bridgebtn"]),
        ("__BRIDGEPATH__", "" if lang == "zh" else "en"),
        ("__BRIDGELOC__", c["loc"] + "_sunwatch"),
        ("__H_EMBED__", c["h_embed"]), ("__EMBEDP__", c["embedp"]),
        ("__EMBEDBTN__", c["embedbtn"]), ("__H_FAQ__", c["h_faq"]), ("__FAQ__", faq_html),
        ("__RELATED__", c["related"]), ("__REL__", rel),
        ("__EMBEDBRAND__", c["embedbrand"]), ("__EMBEDBRANDLINK__", c["embedbrandlink"]),
        ("__FOOT__", c["foot"]), ("__DISCLAIMER__", c["disclaimer"]),
        ("__SCRIPT__", script), ("__BASE__", str(base)),
    ]:
        html = html.replace(k, v)

    out = os.path.join(ROOT, c["dir"].strip("/"), c["slug"] + ".html") if lang == "zh" \
        else os.path.join(ROOT, c["slug"] + ".html")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(html)
    return out


def main():
    preds, base, asof = load_predictions()
    for lang in ("en", "zh"):
        print("wrote", build(lang, preds, base, asof))
    print("tracker score", base, "as of", asof)


if __name__ == "__main__":
    main()
