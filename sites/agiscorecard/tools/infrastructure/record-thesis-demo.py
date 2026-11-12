"""Continuous, labelled demonstration of the deployed tool; no inference or orders."""
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
import json, mimetypes, os, sys, time

out = Path('/tmp/agi-thesis-watch-video'); out.mkdir(exist_ok=True)
root = Path(__file__).resolve().parents[2]
local = '--local' in sys.argv
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('WORKBENCH_CHROMIUM'), headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
    def route(r):
        u = urlparse(r.request.url)
        if u.netloc != 'agiscorecard.com' or r.request.method != 'GET':
            return r.abort()
        if not local:
            return r.continue_()
        if u.path.startswith('/api/'):
            return r.fulfill(status=200, json={'ok': True, 'ready': False})
        f = root / unquote(u.path).lstrip('/')
        if not f.suffix:
            f = Path(str(f) + '.html')
        if not f.is_file() or root not in f.resolve().parents:
            return r.fulfill(status=404, body='')
        return r.fulfill(body=f.read_bytes(), content_type='application/javascript' if f.suffix == '.mjs' else mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
    # Real production Chinese mobile check before the English demonstration.
    c = browser.new_context(viewport={'width': 390, 'height': 844}, accept_downloads=True)
    c.route('**/*', route); page = c.new_page(); errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('https://agiscorecard.com/zh/ai-infrastructure?__qa=1')
    page.locator('[data-ticker=MSFT]').click(); page.locator('#thesis-example').click()
    assert page.locator('.thesis-result.unknown').count() == 0
    page.locator('#thesis-check').click()
    assert '年度期间' in page.locator('#thesis-results').inner_text()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    with page.expect_download() as d:
        page.locator('#thesis-export').click()
    d.value.save_as(out / 'msft-check-zh.md')
    assert 'www.sec.gov' in (out / 'msft-check-zh.md').read_text()
    page.locator('#thesis-watch').screenshot(path=str(out / 'live-zh-mobile.png'))
    assert not errors, errors
    c.close()

    c = browser.new_context(viewport={'width': 720, 'height': 1280}, record_video_dir=str(out), record_video_size={'width': 720, 'height': 1280}, accept_downloads=True)
    c.route('**/*', route); page = c.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('https://agiscorecard.com/ai-infrastructure?__qa=1')
    page.locator('[data-ticker=MSFT]').click()
    page.add_style_tag(content='''#recording-caption{position:fixed;z-index:2147483647;top:0;left:0;right:0;padding:28px 36px 24px;background:#112e51;color:white;font:700 34px/1.2 Arial;pointer-events:none}#recording-caption small{display:block;font:500 17px/1.4 Arial;color:#cfdef3;margin-top:12px}#recording-note{position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#112e51;color:white;padding:16px 28px;font:16px/1.4 Arial;pointer-events:none}#recording-pointer{position:fixed;width:24px;height:24px;background:#ecc06299;border:3px solid #946a17;border-radius:50%;pointer-events:none;z-index:2147483646;transform:translate(-50%,-50%)}''')
    page.evaluate('''()=>{for(const id of ['caption','note','pointer']){const n=document.createElement('div');n.id='recording-'+id;document.body.append(n);}document.querySelector('#recording-note').textContent='Example threshold · Annual company figures · Not a trade recommendation';document.addEventListener('mousemove',e=>{const n=document.querySelector('#recording-pointer');n.style.left=e.clientX+'px';n.style.top=e.clientY+'px';});}''')
    def caption(title, sub='AGI · Investment thesis checks'):
        page.evaluate('''([title,sub])=>{const n=document.querySelector('#recording-caption');n.textContent=title;const s=document.createElement('small');s.textContent=sub;n.append(s);}''', [title, sub])
    def scroll(selector, offset=210):
        page.evaluate('''([s,y])=>scrollTo({top:document.querySelector(s).getBoundingClientRect().top+scrollY-y,behavior:'smooth'})''', [selector, offset]); page.wait_for_timeout(800)
    def click(selector):
        box = page.locator(selector).bounding_box()
        page.mouse.move(box['x'] + box['width']/2, box['y'] + box['height']/2, steps=20)
        page.locator(selector).click()
    steps = []; start = time.monotonic()
    def stamp(label): steps.append({'second': round(time.monotonic()-start, 2), 'step': label})
    caption('What would change your AI investment thesis?', 'Microsoft example · Dated SEC annual filings')
    scroll('#thesis-watch'); stamp('Opening'); page.wait_for_timeout(2200)
    scroll('#thesis-example', 420); click('#thesis-example')
    caption('Start with a clearly labelled condition', 'Example: cash property capex / operating cash flow above 50%')
    scroll('#thesis-results'); stamp('Example condition'); page.wait_for_timeout(3500)
    assert page.locator('.thesis-result.unknown').count() == 0
    assert 'Example threshold' in page.locator('#thesis-results').inner_text()
    caption('Inspect the ratio and annual period', 'Company-wide cash figures. This does not isolate AI spending.')
    click('#thesis-results details summary'); stamp('Open source links'); page.wait_for_timeout(3300)
    assert all(h.startswith('https://www.sec.gov/Archives/') for h in page.locator('#thesis-results a').evaluate_all('(els)=>els.map(a=>a.href)'))
    caption('Record the evidence you reviewed', 'Your checkpoint stays unchanged until you review again.')
    scroll('[data-rule-review="0"]', 650); click('[data-rule-review="0"]'); stamp('Record review'); page.wait_for_timeout(2800)
    caption('Save your conditions on this device', 'Local saving and source-linked reports are free.')
    scroll('#save-local', 440); click('#save-local'); stamp('Save locally'); page.wait_for_timeout(1800)
    assert page.evaluate('!!localStorage.getItem("agi-infrastructure-v1")')
    caption('Download the source-linked check', 'Keep your review alongside the filing dates and calculation.')
    scroll('#thesis-export', 520)
    with page.expect_download() as d:
        click('#thesis-export')
    d.value.save_as(out / 'msft-check-en.md'); stamp('Actual report download'); page.wait_for_timeout(2200)
    assert 'www.sec.gov' in (out / 'msft-check-en.md').read_text()
    caption('Write a rule. Check the evidence. Revisit it.', 'Try it: agiscorecard.com/ai-infrastructure')
    scroll('#thesis-results'); page.wait_for_timeout(3500); stamp('End')
    page.screenshot(path=str(out / 'recording-end.png'))
    assert not errors, errors
    video = page.video; page.close(); c.close(); video.save_as(str(out / 'thesis-recording.webm')); browser.close()
    (out / 'steps.json').write_text(json.dumps({'mode': 'local-check' if local else 'live', 'steps': steps}, indent=2))
    print(json.dumps({'mode': 'local-check' if local else 'live', 'steps': steps}))
