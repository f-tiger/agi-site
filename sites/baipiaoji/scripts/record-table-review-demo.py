from pathlib import Path
from playwright.sync_api import sync_playwright
import mimetypes,time,json,os
root=Path(__file__).resolve().parents[1]/'dist'; out=Path('/tmp/bpj-table-review-video');out.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('WORKBENCH_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 c=b.new_context(viewport={'width':720,'height':1280},record_video_dir=str(out),record_video_size={'width':720,'height':1280},accept_downloads=True)
 def route(r):
  from urllib.parse import urlparse,unquote
  u=urlparse(r.request.url)
  if u.netloc!='baipiaoji.com':return r.abort()
  if u.path.startswith('/api/'):return r.fulfill(status=200,json={'ok':True})
  f=root/unquote(u.path).lstrip('/')
  if u.path.endswith('/'):f=f/'index.html'
  elif not f.suffix:f=Path(str(f)+'.html')
  if not f.is_file():return r.fulfill(status=404,body='')
  mime='application/javascript' if f.suffix=='.mjs' else mimetypes.guess_type(str(f))[0] or 'application/octet-stream'
  return r.fulfill(body=f.read_bytes(),content_type=mime)
 c.route('**/*',route)
 page=c.new_page();page.goto('https://baipiaoji.com/en/studio/table-review?__ci=1')
 page.locator('#demo').wait_for()
 page.add_style_tag(content='''#recording-caption{position:fixed;z-index:2147483647;top:0;left:0;right:0;min-height:160px;padding:32px 40px 22px;background:#102e3c;color:white;font:700 34px/1.23 Arial;box-shadow:0 3px 15px #173b4b22;pointer-events:none}#recording-caption small{display:block;font:600 17px/1.4 Arial;color:#b7e5ef;margin-top:12px}#recording-note{position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#102e3c;color:white;padding:16px 30px;font:16px/1.4 Arial;pointer-events:none}#recording-pointer{position:fixed;width:24px;height:24px;background:#f6ba35aa;border:3px solid #b27400;border-radius:50%;pointer-events:none;z-index:2147483646;transform:translate(-50%,-50%)}''')
 page.evaluate('''() => {for(const id of ['caption','note','pointer']){const n=document.createElement('div');n.id='recording-'+id;document.body.append(n);}document.querySelector('#recording-note').textContent='Fictional data • Real tool demo • Files stay in your browser';document.addEventListener('mousemove',e=>{const n=document.querySelector('#recording-pointer');n.style.left=e.clientX+'px';n.style.top=e.clientY+'px';});}''')
 def caption(title,sub='BPJ · AI table rewrite review'):
  page.evaluate('''([title,sub])=>{const n=document.querySelector('#recording-caption');n.textContent=title;const s=document.createElement('small');s.textContent=sub;n.append(s);}''',[title,sub])
 def scroll(selector,offset=195):
  page.evaluate('''([s,offset])=>window.scrollTo({top:document.querySelector(s).getBoundingClientRect().top+scrollY-offset,behavior:'smooth'})''',[selector,offset]);page.wait_for_timeout(900)
 def point(selector,click=False):
  box=page.locator(selector).bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+min(box['height']/2,30),steps=25)
  if click:page.locator(selector).click()
 steps=[];start=time.monotonic()
 def stamp(label):steps.append({'second':round(time.monotonic()-start,2),'step':label})
 caption('Keep the rewrite.\nCheck the numbers.');scroll('#demo',300);stamp('Opening');page.wait_for_timeout(2200)
 point('#demo',True);caption('A fictional CSV with two changed numbers','Synthetic errors: 12 → 120 and 1990.00 → 19900.00');scroll('#source',260);stamp('Load built-in synthetic example');page.wait_for_timeout(2500)
 caption('Choose which columns may change','Here: title and note. People and budget stay locked.');scroll('#rules');stamp('Rules');point('#columns input[value="title"]');page.wait_for_timeout(2200)
 page.locator('#columns input[value="title"]').uncheck();page.locator('#columns input[value="title"]').check();point('#check',True);caption('Match rows by unique ID','Row order can change. Column names must match.');scroll('#result');stamp('Compare');page.wait_for_timeout(3500)
 caption('Restore the original numbers','Keep allowed text edits for your manual review.');page.locator('#changes').evaluate('e=>e.scrollLeft=0');point('#changes table:first-of-type');stamp('Review differences');page.wait_for_timeout(2800)
 scroll('#repair',330);point('#repair',True);caption('Repair locked fields and preview','Original 12 and 1990.00 are restored.');scroll('#preview');stamp('Preview');page.wait_for_timeout(3500)
 caption('Review the wording before export','This checks exact fields, not facts or translation quality.');scroll('#approve',650);point('#approve',True);page.wait_for_timeout(2200)
 with page.expect_download() as d:point('#download',True)
 d.value.save_as(out/'synthetic-reviewed.csv');stamp('Actual CSV download');page.wait_for_timeout(1800)
 caption('Try the free local CSV tool','baipiaoji.com/en/studio/table-review');scroll('#preview',240);page.wait_for_timeout(3800);stamp('End')
 page.screenshot(path=str(out/'recording-end.png'))
 video=page.video;page.close();c.close();video.save_as(str(out/'table-review-recording.webm'));b.close()
 (out/'steps.json').write_text(json.dumps(steps,indent=2))
 print(json.dumps({'video':str(out/'table-review-recording.webm'),'steps':steps}))
