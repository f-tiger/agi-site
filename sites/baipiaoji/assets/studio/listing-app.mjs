import {EDITION,LIMITS,FIELDS,FIELD_LABELS,SAMPLE_CSV,SAMPLE_DRAFTS,parseCatalog,checkCatalog,createHandoff,parseDrafts,reviewDrafts,buildFiles,issueText} from './listing-core.mjs';

const root=document.getElementById('listing-workspace'),lang=root.dataset.lang,zh=lang==='zh',s=(cn,en)=>zh?cn:en,$=id=>document.getElementById('lp-'+id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const params=new URLSearchParams(location.search),isQA=['__ci','ci','qa','__qa','__probe'].some(k=>params.has(k))||navigator.webdriver;
const actions=new Set(['import','check','handoff','draft','review','export','inquiry']);
let products=[],drafts=[],mode='own',sourceChecked='',draftChecked='',review=null,images=[],busy=false,revision=0,serial=0;
let available=false,pendingInquiry=null,currentReceipt=null,inquiryBusy=false;
const urls=new Set();
const savedInquiries=new Set();
const exampleProducts=parseCatalog(SAMPLE_CSV);
// Keep our own example identifiable when its source CSV is imported again.
function isBuiltinExample(rows){return rows.some(row=>exampleProducts.some(example=>row.sku===example.sku&&(FIELDS.every(field=>row[field]===example[field])||/虚构示例资料|fictional example/i.test(row.source))));}

function emit(action){
  try{
    if(!actions.has(action)||location.hostname!=='baipiaoji.com'||isQA||navigator.doNotTrack==='1'||navigator.globalPrivacyControl||localStorage.getItem('fleet_ga4_choice_v1')==='denied')return;
    window.bpjEv?.('listing','/listing/'+action+'/'+mode);
    window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'listing_'+action+'_'+mode}}));
  }catch{}
}
function status(text,error=false){$('status').textContent=text;$('status').dataset.error=String(error);}
function fail(error){status(issueText(error,lang),true);}
function makeError(cn,en){return Object.assign(new Error(en),{zh:cn,en});}
function invalidateReview(){review=null;$('reviewed').checked=false;revision++;sync();}
function validSource(){return products.length>0&&sourceChecked===$('source').value&&checkCatalog(products).ok;}
function validDraft(){return validSource()&&drafts.length===products.length&&draftChecked===$('drafts').value&&reviewDrafts(products,drafts).ok;}
function imagesReady(){return images.every(item=>products.some(p=>p.sku===item.sku));}
function sync(){
  const source=validSource(),draft=validDraft();
  $('mode').textContent=mode==='demo'?s('虚构示例 · 编辑后仍按示例计量','Fictional example · edits remain example activity'):s('自己的资料 · 内容仅在本机处理','Your data · contents stay in this browser');
  $('mode').parentElement.dataset.demo=String(mode==='demo');
  $('handoff').disabled=busy||!source;$('apply-drafts').disabled=busy||!source;$('images').disabled=busy||!source;
  $('reviewed').disabled=busy||!draft||!imagesReady();$('export').disabled=busy||!draft||!imagesReady()||review!==revision||!$('reviewed').checked;
  $('count').textContent=source?s('已检查 ','Checked ')+products.length+' SKU':'';
  $('export-state').textContent=!draft?s('先检查商品资料，再导回并检查英文草稿。','Check source facts, then import and check English drafts.'):!imagesReady()?s('为每张图片选择对应 SKU，或移除未归属图片。','Assign every image to a SKU, or remove unassigned images.'):review!==revision?s('逐项核对当前版本，再勾选审核确认；任何修改都会撤销确认。','Review this version and confirm below. Any edit clears that confirmation.'):s('已记录你对当前版本的审核确认。仍需按目标平台要求检查。','Your review confirmation is recorded for this version. Destination-platform checks still apply.');
}
function download(name,data,type='text/plain;charset=utf-8'){
  const blob=data instanceof Blob?data:new Blob([data],{type}),url=URL.createObjectURL(blob);urls.add(url);
  const a=document.createElement('a');a.href=url;a.download=name;a.hidden=true;document.body.append(a);a.click();a.remove();
  // Keep the object URL long enough for the browser to start the download.
  setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},60000);
}
function fieldName(key){return FIELD_LABELS?.[key]?.[zh?0:1]||key;}
function factList(product){return `<dl>${FIELDS.filter(k=>k!=='sku').map(key=>`<dt>${esc(fieldName(key))}</dt><dd>${esc(product[key]||s('未填写','Not supplied'))}</dd>`).join('')}</dl>`;}
function showIssues(target,result){
  target.innerHTML=`<div class="lp-issues" data-ok="${result.ok}"><strong>${result.ok?s('结构检查通过；仍需核对事实','Structure checks passed; verify the facts'):s('请先处理以下问题','Resolve these issues first')}</strong>${result.issues.length?`<ul>${result.issues.map(i=>`<li>${i.sku?`<code>${esc(i.sku)}</code> · `:''}${esc(i[lang]||i.en)}</li>`).join('')}</ul>`:`<p class="lp-help">${s('没有发现本工具能识别的结构问题。这不证明内容准确或符合平台规则。','No structural issue detectable by this tool was found. This does not prove accuracy or platform compliance.')}</p>`}</div>`;
}
function showFacts(){
  const result=checkCatalog(products);showIssues($('source-issues'),result);
  $('facts').innerHTML=products.map((p,i)=>`<details class="lp-fact" ${i===0?'open':''}><summary><code>${esc(p.sku)}</code><span>${esc(p.name)}</span></summary>${factList(p)}</details>`).join('');
  $('source-result').hidden=false;
}
function showDrafts(){
  const result=reviewDrafts(products,drafts);showIssues($('draft-issues'),result);
  $('preview').innerHTML=drafts.map(d=>{const p=products.find(p=>p.sku===d.sku);return `<article class="lp-preview"><h3>SKU · ${esc(d.sku)}</h3><div class="lp-preview-grid"><div><h4>${s('原始商品事实','SOURCE PRODUCT FACTS')}</h4>${factList(p)}</div><div><h4>${s('英文草稿 · 待人工确认','ENGLISH DRAFT · HUMAN REVIEW')}</h4><p class="lp-preview-title">${esc(d.title)}</p><ul>${d.bullets.map(b=>`<li>${esc(b)}</li>`).join('')}</ul><p>${esc(d.description)}</p>${d.missing.length?`<p class="lp-help">${s('草稿标注缺失：','Draft-reported missing facts: ')}${d.missing.map(fieldName).map(esc).join(' · ')}</p>`:''}</div></div></article>`;}).join('');
  $('draft-result').hidden=false;
}
function clearImages(){for(const image of images)URL.revokeObjectURL(image.preview);images=[];renderImages();}
function clearResults(){products=[];drafts=[];sourceChecked='';draftChecked='';$('source-result').hidden=true;$('draft-result').hidden=true;invalidateReview();}
function loadCatalog(text,nextMode){
  const next=parseCatalog(text);clearImages();$('source').value=text;products=next;mode=isBuiltinExample(next)?'demo':nextMode;sourceChecked=$('source').value;drafts=[];draftChecked='';$('drafts').value='';$('draft-result').hidden=true;invalidateReview();showFacts();sync();
  status(checkCatalog(products).ok?s('商品资料已检查。下一步下载 AI 任务。','Product facts checked. Download the AI brief next.'):s('资料已读取，请补全标出的必需信息。','Product facts loaded. Complete the required information shown.'));
}
function applyDrafts(){
  if(!validSource())throw makeError('请先重新检查商品资料。','Recheck the product facts first.');
  const next=parseDrafts($('drafts').value,products);drafts=next;draftChecked=$('drafts').value;invalidateReview();showDrafts();sync();emit('draft');
  status(s('草稿已对应到商品。请逐项核对原始事实与英文表达。','Drafts matched to products. Review the source facts and English wording.'));
}
function event(id,fn){$(id).addEventListener('click',async()=>{if(busy)return;try{await fn();}catch(error){fail(error);}});}
event('new',()=>{serial++;clearImages();$('source').value='';$('drafts').value='';mode='own';clearResults();status(s('可以导入自己的商品资料。','Ready for your own product facts.'));$('source').focus();});
event('example',()=>{serial++;loadCatalog(SAMPLE_CSV,'demo');$('drafts').value=SAMPLE_DRAFTS;applyDrafts();status(s('这是两件虚构商品的完整示范。不会生成真实客户或营收记录。','This is a complete example with two fictional products. It creates no customer or revenue record.'));emit('import');});
event('template',()=>download('bpj-listing-template.csv','\uFEFF'+FIELDS.join(',')+'\r\n','text/csv;charset=utf-8'));
event('check',()=>{const next=parseCatalog($('source').value);products=next;if(isBuiltinExample(next))mode='demo';sourceChecked=$('source').value;drafts=[];draftChecked='';$('draft-result').hidden=true;invalidateReview();showFacts();renderImages();sync();if(checkCatalog(products).ok){emit('check');status(s('商品资料已检查。缺失项会一同交给助手，不能编造补齐。','Product facts checked. Missing facts travel with the brief and must not be invented.'));}else status(s('请补全标出的必需信息，再重新检查。','Complete the required facts shown, then check again.'),true);});
event('handoff',()=>{if(!validSource())return;download('bpj-listing-ai-brief.txt',createHandoff(products));emit('handoff');status(s('AI 任务已下载。确认资料可以外发后，再交给你选择的助手。','AI brief downloaded. Confirm the data may be shared before giving it to your chosen assistant.'));});
event('apply-drafts',applyDrafts);
$('source').addEventListener('input',()=>{serial++;clearResults();status(s('商品资料已修改，请重新检查。旧草稿需重新导回核对。','Source facts changed. Check them again and recheck the draft.'));});
$('drafts').addEventListener('input',()=>{serial++;drafts=[];draftChecked='';$('draft-result').hidden=true;invalidateReview();status(s('草稿已修改，请重新核对。','Draft changed. Check it again.'));});
async function readTextFile(file,max){if(file.size>max)throw makeError('文件超过 256 KB，请拆成小批次。','The file exceeds 256 KB. Split it into smaller batches.');try{return new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());}catch{throw makeError('无法读取 UTF-8 文本，请另存为 UTF-8 后重试。','Could not read UTF-8 text. Save the file as UTF-8 and retry.');}}
$('catalog-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file||busy)return;const token=++serial;try{const text=await readTextFile(file,LIMITS.catalogBytes);if(token!==serial)return;loadCatalog(text,'own');emit('import');}catch(error){fail(error);}});
$('draft-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file||busy)return;const token=++serial;try{if(!validSource())throw makeError('请先检查商品资料。','Check product facts first.');const text=await readTextFile(file,LIMITS.draftBytes);if(token!==serial)return;$('drafts').value=text;drafts=[];draftChecked='';invalidateReview();applyDrafts();}catch(error){fail(error);}});
$('reviewed').addEventListener('change',()=>{if($('reviewed').checked&&validDraft()&&imagesReady()){review=revision;emit('review');}else{review=null;revision++;}sync();});

const IMAGE_LIMIT={count:20,total:50*1024*1024,each:8*1024*1024,pixels:16000000};
async function imageInfo(file){
  if(file.size>IMAGE_LIMIT.each)throw makeError('每张图片最多 8 MB。','Each image must be at most 8 MB.');
  const b=new Uint8Array(await file.slice(0,16).arrayBuffer());let ext;
  if(b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)ext='jpg';
  else if([137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v))ext='png';
  else if(String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')ext='webp';
  else throw makeError('只支持实际的 JPG、PNG 或 WebP 图片。','Only actual JPG, PNG or WebP images are supported.');
  let image;
  try{image=await createImageBitmap(file);}catch{throw makeError('图片无法解码，请使用有效的 JPG、PNG 或 WebP。','The image cannot be decoded. Use a valid JPG, PNG or WebP.');}
  const width=image.width,height=image.height;image.close();
  if(!width||!height||width*height>IMAGE_LIMIT.pixels)throw makeError('图片最多 1600 万像素。','Images must not exceed 16 megapixels.');
  return {ext,width,height};
}
function renderImages(){
  $('image-list').innerHTML=images.map((item,index)=>`<li class="lp-image" data-image="${index}"><img src="${esc(item.preview)}" alt="${esc(s('原图预览','Original image preview'))}"><span>${esc(item.file.name)}<small>${item.width} × ${item.height} · ${(item.file.size/1024).toFixed(0)} KB</small></span><label>${s('对应商品','Product SKU')}<select data-image-sku aria-label="${esc(s('图片对应 SKU：','Image SKU: ')+item.file.name)}"><option value="">${s('选择 SKU','Choose SKU')}</option>${products.map(p=>`<option value="${esc(p.sku)}" ${p.sku===item.sku?'selected':''}>${esc(p.sku+' · '+p.name)}</option>`).join('')}</select></label><button type="button" data-image-remove>${s('移除','Remove')}</button></li>`).join('');
}
$('images').addEventListener('change',async event=>{
  const files=Array.from(event.target.files);event.target.value='';if(!files.length||busy||!validSource())return;
  const token=++serial;let newImages=[];
  try{
    if(images.length+files.length>IMAGE_LIMIT.count||images.reduce((n,i)=>n+i.file.size,0)+files.reduce((n,f)=>n+f.size,0)>IMAGE_LIMIT.total)throw makeError('最多 20 张图片，合计不超过 50 MB。','Use at most 20 images, up to 50 MB total.');
    busy=true;invalidateReview();status(s('正在检查图片…','Checking images…'));
    for(const file of files){const info=await imageInfo(file);if(token!==serial)return;newImages.push({file,...info,sku:products.length===1?products[0].sku:'',preview:URL.createObjectURL(file)});}
    if(token!==serial)return;images.push(...newImages);newImages=[];renderImages();status(s('图片已添加。请为每张图片选择 SKU。','Images added. Assign each image to a SKU.'));
  }catch(error){fail(error);}finally{for(const image of newImages)URL.revokeObjectURL(image.preview);busy=false;sync();}
});
$('image-list').addEventListener('change',event=>{const select=event.target.closest('[data-image-sku]');if(!select||busy)return;const i=Number(select.closest('[data-image]').dataset.image);images[i].sku=select.value;invalidateReview();});
$('image-list').addEventListener('click',event=>{const button=event.target.closest('[data-image-remove]');if(!button||busy)return;const i=Number(button.closest('[data-image]').dataset.image);const [image]=images.splice(i,1);URL.revokeObjectURL(image.preview);renderImages();invalidateReview();});
const csvCell=value=>'"'+String(value??'').replace(/^[\s]*[=+\-@]/,m=>"'"+m).replaceAll('"','""')+'"';
event('export',async()=>{
  if(!validDraft()||!imagesReady()||review!==revision||!$('reviewed').checked)throw makeError('请重新检查并确认当前版本。','Recheck and confirm the current version.');
  const token=revision,snapshot={products:structuredClone(products),drafts:structuredClone(drafts),mode,images:[...images]};busy=true;sync();status(s('正在打包…','Preparing your pack…'));
  try{
    const files=buildFiles(snapshot.products,snapshot.drafts,{reviewed:true}),entries={},encode=new TextEncoder();
    for(const [name,text]of Object.entries(files))entries[name]=encode.encode(text);
    const inventory=[['sku','file','original_name','width_px','height_px']];
    for(let i=0;i<snapshot.images.length;i++){const image=snapshot.images[i],name='images/'+String(i+1).padStart(3,'0')+'.'+image.ext;entries[name]=new Uint8Array(await image.file.arrayBuffer());inventory.push([image.sku,name,image.file.name,image.width,image.height]);}
    entries['image-inventory.csv']=encode.encode('\uFEFF'+inventory.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n');
    entries['batch-context.json']=encode.encode(JSON.stringify({edition:EDITION,inputMode:snapshot.mode,fictionalExample:snapshot.mode==='demo',imageCount:snapshot.images.length,platformImport:false,review:'User-confirmed; not independently verified'},null,2));
    if(snapshot.mode==='demo')entries['FICTIONAL-EXAMPLE.txt']=encode.encode('FICTIONAL EXAMPLE / 虚构示例\nThese product facts and drafts are synthetic demonstration material, not a real customer batch.\n');
    const {zipSync}=await import('./vendor/fflate-0.8.2.mjs');
    if(token!==revision||review!==revision||!$('reviewed').checked)throw makeError('打包时内容或审核状态发生变化，请重新审核。','The content or review state changed during export. Review it again.');
    const blob=new Blob([zipSync(entries,{level:0})],{type:'application/zip'});
    download('bpj-listing-pack'+(snapshot.mode==='demo'?'-example':'')+'.zip',blob);emit('export');status(s('ZIP 已生成并请求下载。打开核对后，再用于平台上架。','ZIP generated and download requested. Open and review it before preparing the platform listing.'));
  }finally{busy=false;sync();}
});

function inquiryStatus(message){$('inquiry-status').textContent=message;}
function inquiryPayload(){return {email:$('email').value.trim(),shopUrl:$('shop').value.trim(),skuCount:$('sku-count').value,blocker:$('blocker').value,consent:$('consent').checked,website:$('website').value,qa:!!isQA};}
function receiptValid(value){return value&&typeof value==='object'&&Object.keys(value).every(k=>['requestId','receipt'].includes(k))&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.requestId||'')&&/^[0-9a-f]{64}$/.test(value.receipt||'');}
async function inquiryRequest(body){
  const response=await fetch('/api/listing-inquiry'+(isQA?'?__qa=1':''),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.ok){const code=data?.code;throw makeError(code==='capacity'?'申请较多，请稍后再试。':code==='conflict'?'这次申请内容已变化，请修改表单后重新提交。':code==='invalid'?'请检查邮箱、网址与同意选项。':'暂时无法提交，请稍后重试。',code==='capacity'?'Too many requests. Please try later.':code==='conflict'?'This request has changed. Edit the form and submit again.':code==='invalid'?'Check the email, URL and consent.':'The request could not be completed. Please retry later.');}
  return data;
}
$('inquiry-form').addEventListener('input',()=>{if(!pendingInquiry||pendingInquiry.state==='saved')pendingInquiry=null;});
$('inquiry-form').addEventListener('submit',async event=>{
  event.preventDefault();if(inquiryBusy||!available||!$('inquiry-form').reportValidity())return;
  const payload=inquiryPayload(),signature=JSON.stringify(payload);
  if(pendingInquiry&&pendingInquiry.state!=='saved'&&pendingInquiry.signature!==signature){inquiryStatus(s('上一条申请的提交结果尚未确认。请先用已显示的回执撤回，或恢复原表单内容后重试。回执不会被新申请覆盖。','The previous request is still unconfirmed. Withdraw it using the displayed receipt, or restore the original form and retry. A new request will not overwrite its receipt.'));return;}
  if(!pendingInquiry||pendingInquiry.signature!==signature){pendingInquiry={signature,state:'sending',requestId:crypto.randomUUID(),receipt:Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('')};}
  const attempt={...pendingInquiry};pendingInquiry.state='sending';inquiryBusy=true;$('submit').disabled=true;
  currentReceipt={requestId:attempt.requestId,receipt:attempt.receipt};$('receipt').value=JSON.stringify(currentReceipt,null,2);$('receipt-title').textContent=s('申请回执 · 提交状态待确认','Request receipt · submission unconfirmed');$('receipt-box').hidden=false;
  inquiryStatus(s('正在提交…请先保存下方回执。网络中断时仍可用它撤回申请。','Submitting… Save the receipt below. You can use it to withdraw even if the network disconnects.'));
  try{
    const result=await inquiryRequest({...payload,requestId:attempt.requestId,receipt:attempt.receipt});
    if(result.saved!==true||result.code!=='saved'){pendingInquiry=null;currentReceipt=null;$('receipt-box').hidden=true;$('receipt').value='';inquiryStatus(s('请求已检查，没有保存真实申请。','Request checked. No real application was saved.'));return;}
    if(pendingInquiry?.requestId===attempt.requestId)pendingInquiry.state='saved';
    currentReceipt={requestId:attempt.requestId,receipt:attempt.receipt};$('receipt').value=JSON.stringify(currentReceipt,null,2);$('receipt-title').textContent=s('申请回执','Request receipt');$('receipt-box').hidden=false;if(!savedInquiries.has(attempt.requestId)){savedInquiries.add(attempt.requestId);emit('inquiry');}
    inquiryStatus(s('申请已保存。请下载回执；范围、报价与接单仍需另行确认。','Request saved. Download your receipt; scope, price and acceptance still require separate confirmation.'));
  }catch(error){
    if(pendingInquiry?.requestId===attempt.requestId)pendingInquiry.state='unconfirmed';
    inquiryStatus((error?.zh?issueText(error,lang)+' ':'')+s('提交结果尚未确认。请保存回执；可重试同一申请，或使用回执撤回。','Submission remains unconfirmed. Save the receipt; retry the same request or use the receipt to withdraw.'));
  }finally{inquiryBusy=false;$('submit').disabled=!available;}
});
$('receipt-download').addEventListener('click',()=>{if(currentReceipt)download('bpj-listing-request-receipt.json',JSON.stringify(currentReceipt,null,2),'application/json');});
async function withdraw(receipt){
  if(inquiryBusy)return;if(!receiptValid(receipt))throw makeError('回执格式不正确。请粘贴下载的完整 JSON。','Invalid receipt. Paste the complete downloaded JSON.');
  inquiryBusy=true;$('withdraw').disabled=true;$('withdraw-saved').disabled=true;inquiryStatus(s('正在撤回…','Withdrawing…'));
  try{
    const result=await inquiryRequest({action:'withdraw',...receipt});
    if(result.code==='qa'){inquiryStatus(s('测试请求已检查，没有撤回真实申请。回执已保留。','Test request checked. No real application was withdrawn. The receipt is retained.'));return;}
    if(result.code!=='withdrawn')throw makeError('撤回结果尚未确认，回执已保留，请稍后重试。','Withdrawal is unconfirmed. The receipt is retained; retry later.');
    if(currentReceipt?.requestId===receipt.requestId&&currentReceipt.receipt===receipt.receipt){currentReceipt=null;$('receipt').value='';$('receipt-box').hidden=true;}
    if(pendingInquiry?.requestId===receipt.requestId&&pendingInquiry.receipt===receipt.receipt)pendingInquiry=null;
    $('saved-receipt').value='';inquiryStatus(s('撤回请求已处理。','Withdrawal processed.'));
  }finally{inquiryBusy=false;$('withdraw').disabled=false;$('withdraw-saved').disabled=false;}
}
for(const [id,read]of [['withdraw',()=>currentReceipt],['withdraw-saved',()=>JSON.parse($('saved-receipt').value)]])$(id).addEventListener('click',async()=>{try{await withdraw(read());}catch(error){inquiryStatus(error instanceof SyntaxError?s('请粘贴有效的回执 JSON。','Paste valid receipt JSON.'):issueText(error,lang));}});
fetch('/api/listing-inquiry',{credentials:'same-origin',signal:AbortSignal.timeout(10000)}).then(async response=>response.ok?response.json():null).then(data=>{available=data?.ok===true&&data.accepting===true;$('submit').disabled=!available;inquiryStatus(available?s('申请通道可用。商品文件不会随表单提交。','Requests are open. Product files are not included in the form.'):s('申请通道暂不可用；本机检查与导出仍可使用。','Requests are temporarily unavailable. Local checks and exports still work.'));}).catch(()=>{available=false;$('submit').disabled=true;inquiryStatus(s('申请通道暂不可用；本机检查与导出仍可使用。','Requests are temporarily unavailable. Local checks and exports still work.'));});
window.addEventListener('pagehide',()=>{serial++;for(const url of urls)URL.revokeObjectURL(url);for(const image of images)URL.revokeObjectURL(image.preview);});
sync();
