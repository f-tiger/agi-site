"""Sync the reviewed public 13F simulation snapshot into all six citation surfaces.
Copy a reviewed aistock lib/data/copy-homework.json to ../copy-homework-snapshot.json first.
No fetching or inference. Keep this change coordinated with the Compass release.
"""
import json, re, html
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
d = json.loads((ROOT/'copy-homework-snapshot.json').read_text())
assert d['methodVersion'] == '13f-next-session-v2'
rows = {r['slug']: r for r in d['investors']}
D, B, W, T = [rows[k] for k in ['stanley-druckenmiller','warren-buffett','cathie-wood','david-tepper']]
pct = lambda n: f'{n:+.1f}%'
names = {'stanley-druckenmiller':('Stanley Druckenmiller','德鲁肯米勒'),'warren-buffett':('Warren Buffett','巴菲特'),'cathie-wood':('Cathie Wood','木头姐'),'david-tepper':('David Tepper','泰珀'),'bill-ackman':('Bill Ackman','阿克曼'),'philippe-laffont':('Philippe Laffont','Laffont')}
method = [
 'Version 13f-next-session-v2 uses the first completed trading-session close after the filing date, excludes Put/Call and principal rows, and requires complete adjusted prices on matching dates and contiguous quarters. These are gross historical simulations before costs, taxes and slippage, not live returns. Current-universe selection and survivorship bias remain; original filings do not reconstruct all amendments or confidential disclosures.',
 '13f-next-session-v2 从申报日之后的首个完整交易日收盘换仓，排除 Put/Call 期权和本金类记录，要求所有标的在同一执行日有复权价格、各期连续。这是未扣成本、税费和滑点的历史毛收益模拟，不是实盘盈利。当前名单仍有选择与幸存者偏差；未完整重建修订及保密披露。']
summary = [
 f'As of {d["generated"]}, over {D["quarters"]} rebalances: Druckenmiller {pct(D["cumulativeReturn"])} vs QQQ {pct(D["benchmarkQQQ"])}; Buffett {pct(B["cumulativeReturn"])} vs QQQ {pct(B["benchmarkQQQ"])} ({D["entryDate"]} to {D["exitDate"]}). Wood {pct(W["cumulativeReturn"])} vs her own-window QQQ {pct(W["benchmarkQQQ"])}; Tepper {pct(T["cumulativeReturn"])} vs QQQ {pct(T["benchmarkQQQ"])}. Different managers can have different windows. These results do not establish future alpha.',
 f'截至 {d["generated"]} 重算，{D["quarters"]} 次换仓：德鲁肯米勒 {pct(D["cumulativeReturn"])} / 同窗 QQQ {pct(D["benchmarkQQQ"])}；巴菲特 {pct(B["cumulativeReturn"])} / QQQ {pct(B["benchmarkQQQ"])}（{D["entryDate"]} 至 {D["exitDate"]}）。木头姐 {pct(W["cumulativeReturn"])} / 其自身窗口 QQQ {pct(W["benchmarkQQQ"])}；泰珀 {pct(T["cumulativeReturn"])} / QQQ {pct(T["benchmarkQQQ"])}。各经理窗口可能不同，结果不能证明未来超额收益。']
# The established home cards keep their styles and event identifiers.
for path, zh in [('index.html',False),('cn.html',True)]:
 p=ROOT/path;s=p.read_text()
 marker='cn_home_trackrecord' if zh else 'home_trackrecord'
 matches=list(re.finditer(r'<a\b[^>]*>.*?</a>',s,re.S));m=next(m for m in matches if marker in m.group())
 old=m.group();opening=old[:old.index('>')+1]
 title='公开持仓的历史模拟：收益与风险要一起看' if zh else 'What does the historical AI-sleeve simulation show?'
 intro='申报日后的首个交易日收盘计价，排除期权，完整价格覆盖。历史毛收益未扣成本，不是实盘盈利或未来收益证明。' if zh else 'Next-session closing prices after disclosure, equity-only holdings and complete price coverage. Historical gross returns exclude costs; they are not live profits or proof of future returns.'
 detail=f'德鲁肯米勒 AI 切片 / 同窗 QQQ {pct(D["benchmarkQQQ"])} / 巴菲特 {pct(B["cumulativeReturn"])}' if zh else f'Druckenmiller AI slice / matched QQQ {pct(D["benchmarkQQQ"])} / Buffett {pct(B["cumulativeReturn"])}'
 c=opening+f'<div style="font-size:12px;color:var(--muted);">{d["generated"]} · {"历史毛收益模拟" if zh else "Gross historical simulation"}</div><div style="font-weight:700;font-size:19px;margin:6px 0;">{title}</div><p style="font-size:14px;color:var(--muted);">{intro}</p><div style="font-size:26px;font-weight:800;">{pct(D["cumulativeReturn"])}</div><div style="font-size:13px;color:var(--muted);">{detail}<br>{D["entryDate"]} → {D["exitDate"]}</div><div style="margin-top:10px;font-weight:600;">{"核对方法与逐期记录 →" if zh else "Inspect the method and period records →"}</div></a>'
 s=s[:m.start()]+c+s[m.end():];p.write_text(s)
for path,zh in [('invest.html',False),('zh/invest.html',True)]:
 p=ROOT/path;s=p.read_text()
 pattern=r'<p style="margin:0 0 \.7rem;font-size:14px;color:var\(--muted\);">(?:A 13F|13F).*?</p>'
 replacement='<p style="margin:0 0 .7rem;font-size:14px;color:var(--muted);">'+html.escape(method[int(zh)]+' '+summary[int(zh)])+'</p>'
 # Subsequent runs identify the method version rather than the removed old wording.
 if not re.search(pattern,s,re.S):pattern=r'<p style="margin:0 0 \.7rem;font-size:14px;color:var\(--muted\);">(?:Version 13f|13f-next).*?</p>'
 s,n=re.subn(pattern,lambda m:replacement,s,count=1,flags=re.S);assert n==1,path
 s=s.replace('Before asking what they hold, ask whether copying them actually paid.','Read the historical simulation and its assumptions.').replace('先别问他们持有什么，先问：抄他们的作业，真赚到钱了吗？','先核对历史模拟的方法、窗口与反证。')
 p.write_text(s)
# Question pages use one source for body, FAQ schema and metadata.
for path,zh in [('does-copying-13f-work.html',False),('zh/does-copying-13f-work.html',True)]:
 i=int(zh);p=ROOT/path;s=p.read_text();title=['Does copying 13F filings work? A revised historical simulation','抄 13F 持仓能赚钱吗？先看修正后的历史模拟'][i]
 questions=[('Does this prove that copying will make money?', 'No. '+summary[0]),('Why use a later execution price?', 'A filing-day close can precede a post-market disclosure. The revised simulation waits until the next completed trading-session close. This remains a price assumption, not proof of an actual fill.'),('What is excluded?', method[0]),('Where can I inspect the data?', f'The dated JSON snapshot records each filing source, execution dates, price coverage and exclusions. {len(d["investors"])} managers have complete histories; other attempts are listed under failures. Use each manager own-window benchmark.')]
 if zh:questions=[('这能证明跟随持仓可以赚钱吗？','不能。'+summary[1]),('为什么推迟到下一个交易日计价？','申报日收盘价可能早于盘后披露。新版等到下一个完整交易日收盘再模拟成交。这仍是模型价格，不是实际成交证明。'),('哪些因素没有被完整纳入？',method[1]),('在哪里核对原始结果？',f'带日期 JSON 保存各期申报来源、实际执行日、覆盖率及失败原因。{len(d["investors"])} 位经理有完整历史，其余尝试列入 failures；比较时要用各自相同窗口的基准。')]
 bodyrows=''.join('<tr><td>'+html.escape(names[r['slug']][i])+'</td><td>'+r['entryDate']+' → '+r['exitDate']+'</td><td>'+pct(r['cumulativeReturn'])+'</td><td>'+pct(r['benchmarkQQQ'])+'</td></tr>' for r in d['investors'])
 headers=['Investor','Execution window','Gross return','QQQ, same window'] if not zh else ['经理 AI 切片','模拟执行区间','历史毛收益','同窗 QQQ']
 faq=''.join('<h3>'+q+'</h3><p>'+html.escape(a)+'</p>' for q,a in questions)
 body=f'''<article><div class="eyebrow">{'可复核的历史研究' if zh else 'Auditable historical research'}</div><h1>{title}</h1>
<div class="updated">{d['generated']} · 13f-next-session-v2</div>
<div class="capsule"><span class="verdict">{'历史模拟不能证明未来赚钱。' if zh else 'A historical simulation does not prove future profits.'}</span> {html.escape(method[i])}</div>
<h2>{'逐经理、同窗口比较' if zh else 'Compare each manager with its own-window benchmark'}</h2>
<div style="overflow-x:auto"><table><thead><tr>{''.join('<th>'+h+'</th>' for h in headers)}</tr></thead><tbody>{bodyrows}</tbody></table></div>
<p>{html.escape(summary[i])}</p><p>{'缺少完整数据的记录不参与排名，原因保留在下载文件的 failures 中。旧版同日收盘及期权处理有缺陷，本页数字已重新计算。' if zh else 'Incomplete histories are excluded, with reasons retained under failures. The old same-day-close and option handling had defects; the figures here have been recomputed.'}</p>
<p><a href="/copy-homework-snapshot.json">{'下载本页的完整来源与计算快照' if zh else 'Download this page source and calculation snapshot'}</a> · <a href="https://compass.agiscorecard.com/{'zh' if zh else 'en'}/track-record">{'打开罗盘研究计算器' if zh else 'Open Compass research calculator'}</a></p>
<h2>{'方法问题' if zh else 'Method questions'}</h2>{faq}
<p><a href="https://www.sec.gov/rules-regulations/staff-guidance/division-investment-management-frequently-asked-questions/frequently-asked-questions-about-form-13f">SEC 13F FAQ</a> · <a href="/{'zh/' if zh else ''}invest#research-workbench">{'建立自己的研究与反证记录' if zh else 'Create your own thesis and counterevidence record'}</a></p>
<p>{'仅供研究。不是个股推荐、实盘业绩或收益承诺。' if zh else 'Research only. Not a stock recommendation, live track record or return promise.'}</p></article>'''
 s,n=re.subn(r'<article>.*?</article>',lambda m:body,s,count=1,flags=re.S);assert n==1
 faqdata={'@context':'https://schema.org','@type':'FAQPage','mainEntity':[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in questions]}
 def schema(m):
  try:v=json.loads(m[1])
  except ValueError:return m[0]
  if v.get('@type')=='FAQPage':return '<script type="application/ld+json">'+json.dumps(faqdata,ensure_ascii=False)+'</script>'
  return m[0]
 s=re.sub(r'<script type="application/ld\+json">(.*?)</script>',schema,s,flags=re.S)
 desc=html.escape(method[i],quote=True)
 s=re.sub(r'(<meta (?:name="description"|property="og:description") content=")[^"]*(">)',lambda m:m[1]+desc+m[2],s)
 s=re.sub(r'<title>.*?</title>',lambda m:'<title>'+title+' | AGI Scorecard</title>',s)
 p.write_text(s)
print('synced six investor citation surfaces from',d['methodVersion'])
