#!/usr/bin/env python3
"""Regression tests for the committed research snapshot; needs a local static preview.

Usage: TIANYA_PREVIEW_ORIGIN=http://127.0.0.1:8779 python3 tools/tianya/research-browser.py
Screenshots go to /tmp/agi-tianya-research-qa, never the public site directory.
"""
import os
from pathlib import Path
SITE = os.environ.get('TIANYA_PREVIEW_ORIGIN', 'http://127.0.0.1:8779').rstrip('/')
PAGE = SITE + '/zh/tianya-research.html?__qa=1'
ASSETS = SITE + '/tianya-research'
Path('/tmp/agi-tianya-research-qa').mkdir(exist_ok=True)

import json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('window._tools={};Object.defineProperty(document,"modelContext",{value:{registerTool(t){window._tools[t.name]=t;}}});')
 page.goto(PAGE,wait_until='networkidle')
 assert page.locator('#future').is_visible()
 assert page.locator('#temporal-title').is_visible()
 assert page.locator('#temporal-model option').count()==12
 page.locator('#temporal-horizon').select_option('12')
 page.locator('#temporal-model').select_option('Chronos-2')
 assert '尚无合格完整窗口' in page.locator('#temporal-output').inner_text()
 assert '2027-08' in page.locator('#temporal-output').inner_text()
 page.locator('#temporal-series').select_option('CES6054150001')
 page.locator('#temporal-model').select_option('auto')
 assert '2027-09' in page.locator('#temporal-output').inner_text()
 assert 'ARIMA' in page.locator('#temporal-output').inner_text()
 page.locator('#temporal-horizon').select_option('1')
 assert '2026-10' in page.locator('#temporal-output').inner_text()
 page.locator('#temporal-model').select_option('trees')
 assert 'ExtraTrees' in page.locator('#temporal-output svg').get_attribute('aria-label')
 temporal=page.evaluate('window._tools.read_tianya_analysis.execute({}).outlook.temporal')
 assert len(temporal['run']['results'])==5
 assert page.request.get(ASSETS+'/temporal-outlook.json').json()==temporal
 audit=page.request.get(ASSETS+'/temporal-audit.json').json()
 assert len(audit['replay'])==90 and not audit['failures']
 assert '12 个月：主线 1.47%' in page.request.get(ASSETS+'/temporal-outlook.txt').text()
 page.locator('#temporal-horizon').select_option('3')
 page.locator('#temporal-model').select_option('auto')
 page.locator('#temporal-series').select_option('IPG334S')
 assert page.locator('.neural-update').count()==6
 assert 'Chronos-2' in page.locator('#neural-chart').inner_text()
 page.locator('#neural-series').select_option('IPG2211A2N')
 assert '未季调' in page.locator('#neural-chart').inner_text()
 page.locator('#neural-model').select_option('Chronos-Bolt')
 assert 'Chronos-Bolt' in page.locator('#neural-chart').inner_text()
 assert '气公用事业' in page.locator('#neural-chart svg').get_attribute('aria-label')
 page.locator('#neural-series').select_option('IPG334S')
 page.locator('#neural-model').select_option('Chronos-2')
 neural_payload=page.evaluate('window._tools.read_tianya_analysis.execute({}).outlook.neural')
 assert len(neural_payload['run']['results'])==5
 assert page.request.get(ASSETS+'/neural-outlook.json').json()==neural_payload
 assert '三基线选择组合 0.87%' in page.request.get(ASSETS+'/neural-outlook.txt').text()
 assert page.locator('.opportunity-card:visible').count()==12
 page.locator('#opportunity-kind').select_option('adjacent')
 assert page.locator('.opportunity-card:visible').count()==6
 assert '6' in page.locator('#opportunity-count').inner_text()
 page.locator('#opportunity-kind').select_option('hot')
 assert page.locator('.opportunity-card:visible').count()==6
 page.locator('#opportunity-kind').select_option('all')
 payload=page.evaluate('window._tools.read_tianya_analysis.execute({})')
 assert len(payload['outlook']['opportunities']['directions'])==12
 assert page.request.get(ASSETS+'/opportunities.json').json()==payload['outlook']['opportunities']
 assert '智能体身份' in page.request.get(ASSETS+'/future.txt').text()
 assert page.locator('.future-card').count()==8
 assert page.locator('#future-gate').get_attribute('data-state')=='unknown'
 for select in page.locator('[data-future-condition]').all():select.select_option('yes')
 assert page.locator('#future-gate').get_attribute('data-state')=='conditional'
 assert '仍可能不发生' in page.locator('#future-gate').inner_text()
 page.locator('[data-future-condition="1"]').select_option('no')
 assert page.locator('#future-gate').get_attribute('data-state')=='blocked'
 page.locator('#future-scenario').select_option('housing')
 assert page.locator('#future-gate').get_attribute('data-state')=='unknown'
 assert page.locator('[data-future-condition]').count()==3
 with page.expect_download() as future_report:page.locator('a[href="/tianya-research/future.txt"]').first.click()
 assert future_report.value.suggested_filename=='天涯回声-未来条件推演.txt'
 page.evaluate('scrollTo(0,0)')
 page.screenshot(path='/tmp/agi-tianya-research-qa/future-first-view.png')
 page.locator('[data-tab=conclusions]').click()
 assert page.locator('#conclusions').is_visible()
 assert page.locator('#stats').is_hidden()
 assert page.locator('.conclusion-final > article').count()==3
 assert '两轮交叉核验版' in page.locator('#conclusions .conclusion-lead').inner_text()
 assert page.locator('.conclusion-domains .conclusion-card').count()==8
 assert page.locator('.conclusion-corrections article').count()==6
 assert not page.evaluate("performance.getEntriesByType('resource').some(r=>r.name.includes('processed-floors.json'))")
 with page.expect_download() as report:page.locator('a[href="/tianya-research/conclusions.txt"]').click()
 assert report.value.suggested_filename=='天涯旧帖回溯结论.txt'
 page.locator('.conclusion-card details summary').first.click()
 page.locator('.conclusion-card [data-record]').first.click()
 assert page.locator('#audit').is_visible() and page.locator('#stats').is_visible()
 page.locator('[data-tab=conclusions]').click()
 assert page.locator('#stats').is_hidden()
 page.locator('.conclusion-scope summary').last.click()
 page.locator('[data-open-view=processing]').click()
 page.wait_for_function('document.querySelector("#processing-results").textContent.includes("144 条匹配")')
 assert page.locator('#processing').is_visible()
 assert '144 条匹配' in page.locator('.processed-result-heading').inner_text()
 assert page.locator('.processed-row').count()==20
 page.screenshot(path='/tmp/agi-tianya-research-qa/round5-desktop.png',full_page=True)
 first=page.locator('.processed-row').first.inner_text()
 page.locator('[data-process-page="2"]').click();assert page.locator('.processed-row').first.inner_text()!=first
 page.locator('#processing-mode').select_option('all');page.locator('#processing-query').fill('公租房')
 assert page.locator('.processed-row').count()>0
 page.locator('#processing-year').select_option('2010');assert all('2010' in t for t in page.locator('.processed-location time').all_text_contents())
 page.locator('#processing-query').fill('不存在xx关键词');assert page.locator('#processing-results .empty').is_visible()
 page.locator('#processing-query').fill('');page.locator('#processing-year').select_option('all');page.locator('#processing-mode').select_option('host-candidate');page.locator('#processing-topic').select_option('Web3');assert page.locator('#processing-results .empty').is_visible()
 page.locator('#processing-topic').select_option('all');page.locator('#processing-mode').select_option('quotes');assert '1,244 条匹配' in page.locator('.processed-result-heading').inner_text()
 page.locator('[data-pview="pdf"]').click();page.wait_for_function('document.querySelector("#processing-results").textContent.includes("348 条匹配")')
 assert page.locator('#processing-mode').is_hidden()
 page.locator('#processing-topic').select_option('Web3');assert '127 条匹配' in page.locator('.processed-result-heading').inner_text()
 assert '#page=' in page.locator('.processed-row>a').first.get_attribute('href')
 page.locator('[data-pview="quality"]').click();assert page.locator('#processing-quality').is_visible();assert '正文空页' in page.locator('#processing-quality').inner_text()
 page.locator('[data-pview="html"]').click();page.locator('#processing-mode').select_option('host');page.locator('#processing-query').fill('51')
 page.locator('#processing-results [data-record="kk-public-rent"]').click();assert '公租房' in page.locator('#detail h2').inner_text()
 page.locator('.archive-proof summary').click();assert '第 51 楼' in page.locator('.archive-proof').inner_text()
 page.locator('[data-tab="archive"]').click();assert '438 份匹配' in page.locator('.archive-result-heading').inner_text()
 page.locator('#archive-status').select_option('read');assert page.locator('.archive-item').count()==4
 page.locator('[data-tab="frontiers"]').click();page.locator('[data-domain="Web3"]').click();assert page.locator('.sample').count()==3
 page.locator('.sample[data-record="crypto-fiat"]').click();page.locator('.archive-proof summary').click();assert '13、14' in page.locator('.archive-proof').inner_text()
 result=page.evaluate('window._tools.read_tianya_analysis.execute({})');assert len(result['outlook']['scenarios'])==8 and result['summary']['n']==60 and result['processing']['summary']['unique_floor_versions']==14110
 page.locator('[data-tab=method]').click()
 with page.expect_download() as info:page.locator('#export').click()
 assert info.value.suggested_filename=='tianya-deep-conclusions-2026-10-05.json'
 mobile=browser.new_page(viewport={'width':390,'height':844});mobile.on('pageerror',lambda e:errors.append(str(e)))
 mobile.goto(PAGE,wait_until='networkidle');assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
 mobile.screenshot(path='/tmp/agi-tianya-research-qa/round5-mobile.png',full_page=True)
 mobile.locator('[data-tab=processing]').click()
 mobile.locator('[data-pview="quality"]').click();assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
 # Failure is visible and retry recovers, rather than silently showing a complete-looking preview.
 broken=browser.new_page();broken.route('**/processed-floors.json',lambda route:route.abort());broken.goto(PAGE,wait_until='networkidle');broken.locator('[data-tab=processing]').click();broken.wait_for_selector('[data-process-retry]');assert broken.locator('[data-process-retry]').is_visible()
 broken.unroute('**/processed-floors.json');broken.locator('[data-process-retry]').click();broken.wait_for_function('document.querySelector("#processing-results").textContent.includes("144 条匹配")')
 page.locator('[data-tab=audit]').click()
 page.locator('#domain-filter').select_option('教育');assert page.locator('.sample').count()==1
 page.locator('.sample').click();assert '教育培训' in page.locator('#detail h2').inner_text()
 page.locator('#domain-filter').select_option('新能源汽车');assert page.locator('.sample').count()==1
 page.locator('.sample').click();assert '新能源汽车' in page.locator('#detail h2').inner_text()
 page.locator('[data-tab=conclusions]').click()
 page.screenshot(path='/tmp/agi-tianya-research-qa/deep-first-view.png')
 assert page.locator('#agi-nav').count()==1
 assert page.locator('.research-workbench').get_attribute('href')=='/zh/tianya'
 assert page.locator('link[rel=canonical]').get_attribute('href')=='https://agiscorecard.com/zh/tianya-research'
 assert page.evaluate('getComputedStyle(document.body).backgroundColor')=='rgb(255, 255, 255)'
 assert page.locator('.research-context time').inner_text()=='2026-10-05'
 mobile.set_viewport_size({'width':320,'height':844})
 mobile.locator('[data-tab=future]').click()
 assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 print(json.dumps({'status':'passed','htmlMetadataRows':14110,'hostReadingQueue':144,'pdfReadingPages':348,'filters':'checked','sourceLinks':'checked','analysisClaims':60,'loadFailureAndRetry':'checked','mobileOverflow':False,'runtimeErrors':errors},ensure_ascii=False))
 browser.close()

import json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(PAGE,wait_until='networkidle')
 assert page.locator('#practice-title').is_visible()
 assert '未开始' in page.locator('.practice-facts').inner_text()
 assert '0' in page.locator('.practice-facts').inner_text()
 assert page.locator('#startup-plan').is_visible() and page.locator('#investment-plan').is_visible()
 assert page.locator('.investment-watchlist details').count()==6
 page.locator('#paper-calculator summary').click()
 assert '50 股' in page.locator('#paper-result').inner_text()
 assert '409.60' in page.locator('#paper-result').inner_text()
 page.locator('#paper-exit').fill('101');assert page.locator('#paper-result').get_attribute('data-valid')=='false'
 page.locator('#paper-form button[type=reset]').click()
 page.wait_for_function("document.querySelector('#paper-result').dataset.valid==='true'")
 page.locator('#practice-calculator summary').click()
 out=page.locator('#practice-result')
 assert out.get_attribute('data-state')=='illustrative-pass'
 assert '16.33' in out.inner_text() and '7.62' in out.inner_text() and '32.11' in out.inner_text()
 assert '-985.33' in out.inner_text() and '274 件' in out.inner_text()
 page.locator('#pilot-quoteCNY').fill('1');assert '没有可计算的盈亏平衡量' in out.inner_text()
 page.locator('#pilot-quoteCNY').fill('12')
 page.locator('#pilot-majorErrors').fill('1')
 assert out.get_attribute('data-state')=='do-not-expand'
 page.locator('#pilot-majorErrors').fill('0')
 page.locator('#pilot-trialPass').fill('48')
 assert '低于基线' in out.inner_text()
 page.locator('#pilot-trialPass').fill('')
 assert out.get_attribute('data-valid')=='false' and '空白不能按 0' in out.inner_text()
 page.locator('#practice-form button[type=reset]').click()
 page.wait_for_function("document.querySelector('#practice-result').dataset.state==='illustrative-pass'")
 with page.expect_download() as downloaded:page.locator('#practice-download').click()
 calculation=json.load(open(downloaded.value.path()))
 assert calculation['kind']=='illustrative-calculation-not-measured'
 assert calculation['result']['measured']==False
 ledger=page.request.get(ASSETS+'/practice-ledger.json').json()
 assert len(ledger['entries'])==20 and sum(r['primaryProspective'] for r in ledger['entries'])==15
 page.locator('#practice-ledger summary').click()
 assert page.locator('#practice-ledger tbody tr').count()==20
 for file in ['practice-plan.txt','practice-plan.json','practice-experiment.json','practice-tasks.csv','practice-ledger.csv','investment-protocol.json','investment-journal.csv']:
  assert page.request.get(ASSETS+'/'+file).status==200
 full=page.request.get(ASSETS+'/future.json').json()
 assert full['practice']['ledger']==ledger
 assert '产品创业' in page.request.get(ASSETS+'/future.txt').text()
 assert page.locator('meta[name=robots]').get_attribute('content')=='index,follow'
 page.evaluate('scrollTo(0,0)');page.screenshot(path='/tmp/agi-tianya-research-qa/practice-desktop.png')
 page.set_viewport_size({'width':390,'height':844})
 for anchor in ['practice-title','investment-details','paper-calculator','practice-calculator','practice-ledger']:
  page.locator('#'+anchor).scroll_into_view_if_needed()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),anchor
 page.evaluate('scrollTo(0,0)');page.screenshot(path='/tmp/agi-tianya-research-qa/practice-mobile.png')
 assert not errors,errors
 browser.close()
 print('PASS: practice controls, download semantics, ledger/export parity, public AGI indexing and mobile layout; zero JavaScript errors')
