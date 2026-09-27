#!/usr/bin/env python3
"""/calibration — the evidence layer's own report card (v1 2026-08-08; v2 2026-09-26, generated from data).

v1 hard-coded every number and a DATE of 2026-08-08, then sat frozen for seven weeks while
the ledger it described kept moving. A calibration page that cannot update itself is the
opposite of what it claims to be. v2 reads:
  * sunwatch-track-record.json  — dated snapshot of invest.agiscorecard.com/api/track-record
                                   (refreshed by agi-odds.yml on the runner; never hand-edited)
  * data.json                    — the 8 verdicts and the Thesis Tracker
  * ots/manifest.json            — OpenTimestamps proofs (which records are anchored, status)
and states the one number v1 never stated: how many scored calls carry a structured
probability, i.e. the Brier-eligible n. NEVER pad n, NEVER show a curve before n>=20.

v3 2026-09-27 — click-to-verify. "Don't trust, verify" only builds trust if verifying is cheap,
and until today it needed a CLI install. The OTS section now carries a button that (only on
click) fetches /ots/manifest.json and every file it lists, hashes each with Web Crypto, checks
the hash against the listed versions and that the proof file's header commits to it, then
recomputes the Thesis Tracker from /data.json with the weights of tools/gen_index.py. Those
weights are read from gen_index.py's SOURCE (ast), never imported: gen_index writes data.json,
index-history.json and pages at import time (CLAUDE.md 生成器漂移). Byte-identity audit
2026-09-27: the deploy build (gen_feed / gen_agent_surfaces / gen_changelog / grader --check)
writes none of the six anchored JSON files and the worker's non-HTML branch passes them through
untouched, so nothing is excluded; if that ever changes, exclude the file here and say why.
Rerun after any ledger change: python3 tools/gen_calibration.py
"""
import ast
import datetime as dt
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_lib as g

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLISHED = "2026-08-08"
BRIER_N = 20


def load():
    sw = json.load(open(os.path.join(ROOT, "sunwatch-track-record.json"), encoding="utf-8"))
    d = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
    man = {}
    mp = os.path.join(ROOT, "ots", "manifest.json")
    if os.path.exists(mp):
        man = json.load(open(mp, encoding="utf-8")).get("files", {})
    return sw, d, man


def published_weights():
    """WEIGHT from tools/gen_index.py, parsed from its source — importing it would rewrite the site."""
    src = open(os.path.join(ROOT, "tools", "gen_index.py"), encoding="utf-8").read()
    for node in ast.parse(src).body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "WEIGHT" for t in node.targets):
            w = ast.literal_eval(node.value)
            if isinstance(w, dict) and w and all(isinstance(k, str) and isinstance(v, (int, float)) for k, v in w.items()):
                return {k: float(v) for k, v in w.items()}
    # the in-browser recompute is only honest if it uses the published method; never guess it
    sys.exit("gen_calibration: no literal WEIGHT dict in tools/gen_index.py — refusing to publish a recompute with guessed weights")


def recompute(d, weights):
    """Same arithmetic as gen_index.py (mean of weights x100; whole numbers stay whole, else round(,1))."""
    preds = d["predictions"]
    if not preds or any(p["verdict"] not in weights for p in preds):
        return None
    v = sum(weights[p["verdict"]] for p in preds) / len(preds) * 100
    return int(v) if v == int(v) else round(v, 1)


def stats(sw, d):
    """Pure: the numbers the page shows, all derived, none typed in."""
    ents = sw.get("entries", [])
    scored = [e for e in ents if e.get("verdict") in ("hit", "miss")]
    hits = [e for e in scored if e["verdict"] == "hit"]
    pending = [e for e in ents if e.get("verdict") == "pending"]
    brier_eligible = [e for e in scored if isinstance(e.get("odds"), (int, float))]
    open_odds = [e for e in pending if isinstance(e.get("odds"), (int, float))]
    tally = {}
    for p in d["predictions"]:
        tally[p["verdict"]] = tally.get(p["verdict"], 0) + 1
    with_flip = sum(1 for p in d["predictions"] if p.get("flip"))
    with_watch = sum(1 for p in d["predictions"] if p.get("watch") and not p.get("flip"))
    with_resolves = sum(1 for p in d["predictions"] if p.get("resolves") and not p.get("flip"))
    with_pending = sum(1 for p in d["predictions"] if p.get("pending_reason") and not p.get("flip"))
    n = len(scored)
    # the ledger's own hitRate (63 for 5/8) rather than Python's banker's rounding (62)
    rate = sw.get("hitRate") if isinstance(sw.get("hitRate"), (int, float)) else (int(100 * len(hits) / n + 0.5) if n else None)
    # Wilson 95% interval for the hit rate (same statistic v1 quoted by hand)
    lo = hi = None
    if n:
        z = 1.96
        ph = len(hits) / n
        den = 1 + z * z / n
        cen = (ph + z * z / (2 * n)) / den
        half = z * ((ph * (1 - ph) / n + z * z / (4 * n * n)) ** 0.5) / den
        lo, hi = round(100 * (cen - half)), round(100 * (cen + half))
    return {"n_scored": n, "n_hit": len(hits), "n_pending": len(pending), "hit_rate": rate, "wilson": (lo, hi),
            "brier_eligible": len(brier_eligible), "open_odds": len(open_odds),
            "prose_pct": sum(1 for e in scored if re.search(r"\d{1,2}%", e.get("call_en") or "")),
            "open_odds_range": (min(e["odds"] for e in open_odds), max(e["odds"] for e in open_odds)) if open_odds else None,
            "tally": tally, "with_flip": with_flip, "with_watch": with_watch, "with_resolves": with_resolves,
            "with_pending": with_pending, "n_pred": len(d["predictions"]),
            "tracker": d["thesisTracker"]["score"], "tracker_asof": d["thesisTracker"]["asOf"],
            "ledger_asof": sw.get("asOf"), "fetched": sw.get("fetched", "")[:10]}


# Scoped to the verify block (+ the proof table, whose 40-char proof names pushed a phone-width page to 625px);
# uses only the page's existing tokens (gen_lib STYLE).
VERIFY_CSS = """  .verify{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:1.1rem 1.25rem;margin:1rem 0 1.4rem;}
  .verify-btn{background:var(--accent);color:#fff;border:0;border-radius:8px;padding:10px 20px;font:500 14px var(--font);cursor:pointer;}
  .verify-btn[disabled]{opacity:.6;cursor:progress;}
  .verify-sum{margin:.9rem 0 0;font-weight:600;}
  .verify-out{list-style:none;margin:.5rem 0 0;padding:0;font-size:13.5px;}
  .verify-out li{padding:8px 0;border-top:1px solid var(--border);overflow-wrap:anywhere;}
  .verify-out li.warn{border-left:3px solid var(--warn);padding-left:10px;}
  .verify code{font-family:var(--mono);font-size:12.5px;}
  .vr-ok{color:var(--accent2);font-weight:600;}.vr-new{color:var(--text);font-weight:600;}.vr-warn{color:var(--warn);font-weight:600;}
  .verify-score{margin:.9rem 0 0;font-size:14px;}.verify-score.diff{color:var(--warn);}
  .ots-wrap{overflow-x:auto;}.ots-proofs td{overflow-wrap:anywhere;}
"""

# The in-browser half of `ots verify`. Nothing is fetched until the click. Every string that
# reaches the DOM goes through textContent (manifest and file names are data, not markup), and
# a name outside [A-Za-z0-9._-] is never turned into a URL. The proof check reads the detached
# proof header (python-opentimestamps DetachedTimestampFile: 31-byte HEADER_MAGIC, version 1,
# file-hash op 0x08 = SHA-256, then the 32-byte digest) — it shows the proof is ABOUT these
# bytes; walking it to a block header stays with `ots verify`. round1() reproduces Python's
# round(v, 1) (exact decimal value, ties to even) so a tie like 56.25 cannot read as a diff.
# Measurement: the worker keeps ?utm_source=verify fetches out of `pageviews` (they would otherwise
# satisfy agi-ots-verified-1124 ② / agi-consensus-mcp-1124 ② on one click); the run is one verify_run
# event. QA: open the page with ?ci=1 and the fetches carry ci=1 too and no event is sent.
VERIFY_JS = r"""(function(){
var W=__WEIGHTS__;
var box=document.getElementById('verify'),btn=document.getElementById('verify-run'),out=document.getElementById('verify-out'),
    sum=document.getElementById('verify-sum'),sc=document.getElementById('verify-score');
if(!box||!btn||!out)return;
if(!(window.crypto&&crypto.subtle&&window.fetch&&window.TextDecoder)){
  box.hidden=false;btn.hidden=true;
  sum.textContent='This browser does not expose Web Crypto here, so the check cannot run in the page; use the command-line steps above.';
  return;
}
box.hidden=false;
var SAFE=/^[A-Za-z0-9][A-Za-z0-9._-]*$/,QA=/(?:^|[?&])ci=1(?:&|$)/.test(location.search);
var MAGIC='004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294';
var own=function(o,k){return Object.prototype.hasOwnProperty.call(o,k);};
function hex(buf){var b=new Uint8Array(buf),s='';for(var i=0;i<b.length;i++){s+=(b[i]<16?'0':'')+b[i].toString(16);}return s;}
async function get(path){
  var r=await fetch(path+'?utm_source=verify'+(QA?'&ci=1':''),{cache:'no-store'});
  if(!r.ok)throw new Error('HTTP '+r.status);
  return r.arrayBuffer();
}
function parse(buf){return JSON.parse(new TextDecoder().decode(buf));}
// the file's own date: first dated key of the object, or of the last row of a history array
function ownDate(j){
  var o=Array.isArray(j)?j[j.length-1]:j,ks=['dateModified','updated','asOf','fetched','generated','date'];
  if(!o||typeof o!=='object')return null;
  for(var i=0;i<ks.length;i++){var v=o[ks[i]];if(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}/.test(v))return v.slice(0,10);}
  return null;
}
function commits(buf,digest){
  var b=new Uint8Array(buf);
  if(b.length<65)return false;
  return hex(b.slice(0,31))===MAGIC&&b[31]===1&&b[32]===8&&hex(b.slice(33,65))===digest;
}
function round1(v){
  var m=/^(\d+)\.(\d)50*$/.exec(v.toFixed(100));
  if(m&&(+m[2])%2===0)return +(m[1]+'.'+m[2]);
  return +v.toFixed(1);
}
function row(kind,name,head,tail){
  var li=document.createElement('li');if(kind==='warn')li.className='warn';
  var c=document.createElement('code');c.textContent=name;li.appendChild(c);
  li.appendChild(document.createTextNode(': '));
  var h=document.createElement('span');h.className='vr-'+kind;h.textContent=head;li.appendChild(h);
  if(tail)li.appendChild(document.createTextNode(' '+tail));
  out.appendChild(li);
}
btn.addEventListener('click',async function(){
  btn.disabled=true;btn.textContent='Checking…';out.textContent='';sum.textContent='';sc.textContent='';sc.className='verify-score';
  var matched=0,total=0,bufs={},man=null,st='err';
  try{man=parse(await get('/ots/manifest.json')).files||{};}
  catch(e){sum.textContent='Could not load /ots/manifest.json ('+e.message+'); no record was checked.';}
  if(man){
    var names=Object.keys(man).sort();
    for(var i=0;i<names.length;i++){
      var f=names[i],ents=man[f];
      if(!Array.isArray(ents)||!ents.length)continue;
      total++;
      if(!SAFE.test(f)){row('warn',f,'skipped','(unexpected file name in the manifest).');continue;}
      var buf;
      try{buf=await get('/'+f);bufs[f]=buf;}catch(e){row('warn',f,'could not be fetched','('+e.message+').');continue;}
      var d=hex(await crypto.subtle.digest('SHA-256',buf)),k=-1,last=ents[ents.length-1];
      for(var j=0;j<ents.length;j++){if(ents[j].sha256===d)k=j;}
      if(k>=0){
        var e=ents[k],meta=e.status+', stamped '+e.stamped;
        if(e.status==='bitcoin'&&e.confirmed)meta+=', in a Bitcoin block by '+e.confirmed;
        if(e.status==='pending')meta+=', calendar receipt only, not in a block yet';
        var ok=false,why='';
        if(SAFE.test(e.proof||'')){try{ok=commits(await get('/ots/'+e.proof),d);}catch(x){why=x.message;}}
        if(ok){
          matched++;
          row('ok',f,'matches proof '+e.proof,'('+meta+'); the proof file itself commits to this SHA-256'+
              (k<ents.length-1?'. This is an earlier listed version; the latest listed one was stamped '+last.stamped+'.':'.'));
        }else{
          row('warn',f,'hash is listed, but the proof file '+(e.proof||'(none)')+' does not commit to it',
              why?'(proof '+why+').':'(check it with ots verify).');
        }
      }else{
        var own_d=null;try{own_d=ownDate(parse(buf));}catch(x){}
        if(own_d&&own_d>=last.stamped){
          row('new',f,'this version is newer than the last stamp (records are stamped daily)',
              '— its own date, '+own_d+', is on or after the last stamp, '+last.stamped+'. SHA-256 '+d.slice(0,12)+'…');
        }else{
          row('warn',f,'does not match any listed version',
              '— SHA-256 '+d.slice(0,12)+'… is not in the manifest, and '+(own_d?'its own date, '+own_d+', is before':'it carries no date of its own later than')+
              ' the last stamp, '+last.stamped+'. Either it was edited without its date moving, or the bytes served are not the bytes stamped; the public git log settles which.');
        }
      }
    }
    sum.textContent=matched+' of '+total+' records match a listed proof (checked in this browser, '+new Date().toISOString().slice(0,16).replace('T',' ')+' UTC).';
  }
  try{
    var dj=parse(bufs['data.json']||await get('/data.json')),preds=dj.predictions||[],tt=dj.thesisTracker||{},raw=0,cnt={},bad=[];
    preds.forEach(function(p){if(own(W,p.verdict)){raw+=W[p.verdict];cnt[W[p.verdict]]=(cnt[W[p.verdict]]||0)+1;}else bad.push(String(p.verdict));});
    if(!preds.length||bad.length){
      st='diff';sc.className='verify-score diff';
      sc.textContent='Thesis Tracker: cannot recompute — '+(bad.length?'verdict label(s) with no published weight: '+bad.join(', '):'no verdicts in /data.json')+'. Published: '+tt.score+'.';
    }else{
      var v=raw/preds.length*100,rec=v===Math.trunc(v)?v:round1(v),pub=tt.score;
      var parts=Object.keys(cnt).sort(function(a,b){return b-a;}).map(function(w){return cnt[w]+' × '+w;}).join(', ');
      st=rec===pub?'ok':'diff';
      if(st==='diff')sc.className='verify-score diff';
      sc.textContent='Thesis Tracker, recomputed in this browser from /data.json: '+rec+' / published '+pub+
        (st==='ok'?' — they agree.':' — they differ: the score published in /data.json does not follow from the verdicts in the same file under the published weights.')+
        ' Mean of '+preds.length+' verdict weights ('+parts+') × 100'+(tt.asOf?'; published as of '+tt.asOf:'')+'.';
    }
  }catch(e){sc.className='verify-score diff';sc.textContent='Thesis Tracker: could not read /data.json ('+e.message+'); nothing recomputed.';}
  if(!QA&&typeof gtag==='function'){try{gtag('event','verify_run',{location:'calibration',label:matched+'/'+total+'|score:'+st});}catch(e){}}
  btn.disabled=false;btn.textContent='Run the check again';
});
})();"""


def verify_block(weights):
    """Click-to-verify: static copy (what is and is not proven) + button + noscript CLI fallback."""
    groups = {}
    for k, w in weights.items():
        groups.setdefault(w, []).append(k)
    wtext = "; ".join(f"{', '.join(v)} = {w:g}" for w, v in sorted(groups.items(), key=lambda kv: -kv[0]))
    js = VERIFY_JS.replace("__WEIGHTS__", json.dumps(weights, ensure_ascii=False).replace("</", "<\\/"))
    return f"""<h3>Check them yourself, in this browser</h3>
<p>“Don't trust, verify” only builds trust if verifying is cheap. The button below runs the first half of the command-line
check with nothing to install: it downloads <a href="/ots/manifest.json">the manifest</a> and every record it lists, hashes each
one with your browser's own SHA-256 (Web Crypto), and looks that hash up among the listed versions; for a match it also downloads
the proof and checks that the proof file commits to that same hash. It then recomputes the Thesis Tracker from
<a href="/data.json">/data.json</a> with the published weights ({wtext}; mean ×100) and compares it with the score the same file
publishes. Nothing is fetched until you click. Those downloads are tagged <code>?utm_source=verify</code> and are not counted as
visits to the files; the run leaves one event with no identifiers (how many records matched, whether the score agreed).</p>
<p><strong>What a match proves:</strong> the bytes served to you are the bytes a listed proof was made for, and once that proof has a
Bitcoin attestation, those bytes existed no later than that block. <strong>What it does not prove:</strong> that any verdict is right,
that a source was read correctly, or that nothing was left out; an agreeing recompute only shows the score is the stated arithmetic
of the verdicts. The button does not walk the proof up to a Bitcoin block header: <code>ots verify</code> or the verifier at
opentimestamps.org does that against headers it fetches itself. A record changed since the last daily stamp is reported as newer,
not as a failure, when its own date says so. These files are served exactly as committed (checked 2026-09-27: neither the deploy
build nor the edge worker rewrites them), so a stamped version should match byte for byte.</p>
<div class="verify" id="verify" hidden>
<button type="button" class="verify-btn" id="verify-run">Verify these records in your browser</button>
<p class="verify-sum" id="verify-sum" aria-live="polite"></p>
<ul class="verify-out" id="verify-out"></ul>
<p class="verify-score" id="verify-score" aria-live="polite"></p>
</div>
<noscript><p style="font-size:13px;color:var(--muted);">JavaScript is off, so the in-browser check cannot run. The same check from a
terminal: download a record (<code>curl -sO https://agiscorecard.com/data.json</code>), hash it (<code>sha256sum data.json</code>),
find that hash in <a href="/ots/manifest.json">/ots/manifest.json</a>, download the proof it names from <code>/ots/</code>, then run
<code>ots verify &lt;proof&gt; -f data.json</code>.</p></noscript>
<script>{js}</script>"""


def render(s, man, weights):
    tally = " · ".join(f"{v} {k.lower()}" for k, v in sorted(s["tally"].items(), key=lambda kv: -kv[1]))
    wl, wh = s["wilson"]
    rng = s["open_odds_range"]
    ots_rows = ""
    for fname, ents in sorted(man.items()):
        if not ents:
            continue
        last = ents[-1]
        ots_rows += (f"<tr><td><a href='/{fname}'>{fname}</a></td><td class='nowrap'>{len(ents)}</td>"
                     f"<td class='nowrap'>{last['stamped']}</td><td>{last['status']}</td>"
                     f"<td><a href='/ots/{last['proof']}'>{last['proof']}</a></td></tr>")
    ots_html = ""
    if ots_rows:
        n_all = sum(len(e) for e in man.values())
        n_btc = sum(1 for e in man.values() for x in e if x.get("status") == "bitcoin")
        n_pend = sum(1 for e in man.values() for x in e if x.get("status") == "pending")
        ots_html = f"""<h2>Timestamp proofs: which versions can no longer be backdated</h2>
<p>Versions of the records below stamped since 2026-09-26 carry an <a href="https://opentimestamps.org/" rel="nofollow noopener">OpenTimestamps</a>
proof: the file's SHA-256 is submitted to public calendars and, once their aggregate transaction confirms, sits in a Bitcoin block.
Status today: <strong>{n_all}</strong> version(s) listed, <strong>{n_btc}</strong> with a Bitcoin block attestation, <strong>{n_pend}</strong> pending
(calendar receipt only, not in a block yet). A proof shows that those exact bytes existed no later than the block it names; it says
nothing about whether a verdict is right, and versions before 2026-09-26 rest on the public git log only. Index: <a href="/ots/manifest.json">/ots/manifest.json</a>.</p>
<div class="ots-wrap"><table class="ots-proofs"><thead><tr><th>Record</th><th>Versions</th><th>Latest stamped</th><th>Status</th><th>Proof</th></tr></thead><tbody>{ots_rows}</tbody></table></div>
<p style="font-size:13px;color:var(--muted);">Verify: <code>ots verify &lt;proof&gt; -f &lt;file&gt;</code> (client or web verifier at opentimestamps.org); pick the manifest entry whose sha256 matches the file you downloaded. We issue no coin, hold no coin and pay nothing; the calendars are free public services.</p>
{verify_block(weights)}"""
    return f"""<h2>What we grade, today</h2>
<table><thead><tr><th>Ledger</th><th>Type</th><th>Current state</th></tr></thead><tbody>
<tr><td><a href="/situational-awareness-predictions">{s['n_pred']} Situational Awareness verdicts</a></td><td>Categorical verdicts; {s['with_flip']} of {s['n_pred']} carry a written flip condition, {s['with_resolves']} a resolution date, {s['with_watch']} a watch item, {s['with_pending']} a stated blocker (all in <a href="/data.json">data.json</a>)</td><td>{tally} → <a href="/progress-index">Thesis Tracker {s['tracker']}/100</a> as of {s['tracker_asof']}</td></tr>
<tr><td><a href="https://invest.agiscorecard.com/track-record">SunWatch market-call ledger</a></td><td>Dated, falsifiable market calls</td><td>{s['n_scored']} scored, {s['n_hit']} hits ({s['hit_rate']}%), {s['n_pending']} pending, ledger as of {s['ledger_asof']}. n={s['n_scored']} is small: the Wilson 95% interval is roughly {wl}–{wh}%, so this is a work-in-progress sample, not proof of skill.</td></tr>
<tr><td><a href="https://invest.agiscorecard.com/red-team">Red-team survival odds</a></td><td>Editorial probabilities on open calls</td><td>{s['open_odds']} open calls carry a stated probability{f' ({rng[0]}–{rng[1]}%)' if rng else ''}; confidence cuts are published the day counter-evidence lands.</td></tr>
<tr><td><a href="/agi-prediction-markets">AGI consensus board</a></td><td>Third-party forecasts, not ours</td><td>Cross-venue median and spread, recomputable from the published snapshot; it is a reference we quote, not a call we are scored on.</td></tr>
</tbody></table>
<h2>The number nobody wants to print: Brier-eligible n = {s['brier_eligible']}</h2>
<p>A Brier score needs a stated probability <em>and</em> an outcome. Of the {s['n_scored']} scored calls, <strong>{s['brier_eligible']}</strong>
carried a probability in the ledger's <code>odds</code> field; {s['prose_pct']} of them state a scenario percentage in prose,
which we do not Brier-score because a scenario weight is not a calibrated call. The {s['open_odds']} calls that do carry a
structured probability are still open. So the honest reading is: the hit rate above is real, the calibration curve does not
exist yet, and it cannot exist until {BRIER_N} probability-bearing calls have resolved.</p>
<h2>The commitment</h2>
<p>When the pool of <em>scored probability calls</em> reaches <strong>n≥{BRIER_N}</strong>, this page publishes a Brier score and a
calibration curve (stated probability vs realized frequency), recomputed on every ledger change — the same way the
<a href="/progress-index">Thesis Tracker</a> recomputes on every verdict change. The commitment is itself pre-registered
as a dated line in the public bet ledger of this site's repository; if the pool never gets there, the line settles as
<em>insufficient</em> and says so here. The forecast ledger is public and timestamped, so anyone can compute it before we do.</p>
{ots_html}
<h2>Why this page exists</h2>
<p>Every AI-era answer engine can generate confident takes; almost none can show you a scored history. Being auditable —
misses kept on the page next to hits, flip conditions registered before outcomes, probabilities graded against reality,
new versions timestamped so they cannot be quietly rewritten — is this network's entire moat. This page is that moat made
explicit, including the part where the sample is still too small.</p>"""


def main():
    sw, d, man = load()
    s = stats(sw, d)
    weights = published_weights()
    # build-time twin of the in-browser recompute: a mismatch is not hidden (the page will say it live), but say it here too
    rec = recompute(d, weights)
    if rec != s["tracker"]:
        print(f"::warning::gen_calibration: Thesis Tracker recomputes to {rec} from data.json verdicts, data.json publishes {s['tracker']}")
    # the visible/JSON-LD date moves only when a number can have moved: ledger asOf, tracker asOf or a new/upgraded proof —
    # never the snapshot's fetch time (that would bump the page every Monday with nothing changed).
    stamps = [x.get("confirmed") or x.get("stamped") for e in man.values() for x in e if x.get("stamped")]
    day = max([s["ledger_asof"] or PUBLISHED, s["tracker_asof"] or PUBLISHED, PUBLISHED] + [x for x in stamps if x])
    faqs = [
        ("What is a Brier score?",
         "A measure of probability-forecast accuracy: the mean squared difference between stated probabilities and outcomes "
         "(0 = perfect, 0.25 = coin-flip guessing on binary events). We publish ours once scored probability calls reach n≥20."),
        ("Why not publish a calibration curve now?",
         f"Because the Brier-eligible sample is {s['brier_eligible']}: the {s['n_scored']} scored calls were graded hit/miss "
         f"without a structured probability, and the {s['open_odds']} probability-bearing calls have not resolved. Publishing a curve "
         "from that would be theater. The raw ledger is public and timestamped, so nothing is hidden in the meantime."),
        ("Who grades the calls?",
         "Outcomes are graded against pre-registered falsification conditions written before the outcome, with dated multi-source "
         "verification, and misses stay published with their lesson. The grading rules are public in the eight-layer method, "
         "including the red-team layer."),
        ("How do I check that a record was not backdated?",
         f"Versions of {', '.join(sorted(man)) or 'the listed records'} stamped since 2026-09-26 carry an "
         "OpenTimestamps proof under /ots/ (the manifest lists each proof's status: pending until the calendar's transaction is in a "
         "Bitcoin block). The “Verify these records in your browser” button on this page downloads each listed file, hashes it "
         "locally and checks the hash against the manifest and the proof file; to follow a proof to its Bitcoin block, run the free "
         "client against the entry whose sha256 matches your download. That proves when those bytes existed, not that they are "
         "correct; earlier history rests on the public git log."),
    ]
    related = [("/progress-index", "AGI-2027 Thesis Tracker"),
               ("/prediction-receipts", "Every dated AGI call, on the clock"),
               ("/agi-prediction-markets", "AGI consensus board"),
               ("/forecaster-leaderboard", "Forecaster leaderboard")]
    html = g.build(
        slug="calibration",
        title="Calibration: We Score Our Own Predictions in Public",
        desc=(f"Every probability the AGI Scorecard network states, inventoried: {s['n_pred']} graded verdicts, a {s['n_scored']}-call "
              f"market ledger ({s['n_hit']} hits, n small), Brier-eligible n={s['brier_eligible']}, OpenTimestamps proofs listed per version. "
              "Brier score published at n≥20."),
        og_title="Calibration — the evidence layer's own report card",
        eyebrow="Accountability",
        h1="Calibration: we score our own predictions in public",
        capsule=('<span class="verdict">We score our own predictions in public — and the sample is still small.</span> '
                 'This page inventories every probability-shaped claim the AGI Scorecard network makes, states how many of '
                 f'them can actually be Brier-scored today (<strong>{s["brier_eligible"]}</strong>), and pre-commits to publishing a '
                 f'Brier score and calibration curve once scored probability calls reach n≥{BRIER_N}. '
                 'We would rather show a small honest n than a big fake curve.'),
        body_html=render(s, man, weights), faqs=faqs, related=related,
    )
    if man:
        assert html.count("</style>\n</head>") == 1, "gen_lib head changed: cannot place the verify block's CSS"
        html = html.replace("</style>\n</head>", VERIFY_CSS + "</style>\n</head>", 1)
    html = html.replace('"datePublished": "2026-06-30", "dateModified": "2026-06-30"',
                        f'"datePublished": "{PUBLISHED}", "dateModified": "{day}"')
    visible = dt.date.fromisoformat(day).strftime("%B %-d, %Y")
    html = html.replace("Last updated: June 30, 2026", f"Last updated: {visible}")
    open(os.path.join(ROOT, "calibration.html"), "w", encoding="utf-8").write(html)
    print(f"calibration.html written · scored {s['n_scored']} · brier-eligible {s['brier_eligible']} · as of {day}")


if __name__ == "__main__":
    main()
