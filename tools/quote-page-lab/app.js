(() => {
  const app = document.querySelector('#app');
  const initial = JSON.parse(document.querySelector('#initial-state').textContent);
  let config = validateConfig(initial.config), mode = initial.mode === 'customer' ? 'customer' : 'builder';
  let quantities = config.items.map(i => i.quantity), valid = true, dirty = false, selectedTemplate = 'video';
  const query=new URLSearchParams(location.search);
  if(initial.mode!=='customer'&&!location.hash.startsWith('#quote=')){
    if(QUOTE_TEMPLATES.includes(query.get('template'))){selectedTemplate=query.get('template');config=template(selectedTemplate,config.lang);quantities=config.items.map(i=>i.quantity);}
    if(query.get('demo')==='1')mode='customer';
  }
  let demoIntro=initial.mode!=='customer'&&query.get('demo')==='1'&&!location.hash.startsWith('#quote=');
  const entrySource=location.hash.startsWith('#quote=')?'client':QUOTE_SOURCES.includes(query.get('source'))?query.get('source'):'direct';
  let startupError = false;
  if (location.hash.startsWith('#quote=')) {
    try { config = decodeConfig(location.hash.slice(7)); mode = 'customer'; quantities = config.items.map(i => i.quantity); }
    catch { startupError = true; }
  }
  const t = (zh,en) => config.lang === 'zh' ? zh : en;
  const e = escapeHTML;
  const money = n => formatMoney(n,config);
  const hosted = ['https:','http:'].includes(location.protocol) && !['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  const measured = new Set();
  function measure(action) {
    // Fixed labels only. Never transmit the URL, fragment, quote text or rates.
    if(!initial.measure||location.origin!=='https://baipiaoji.com'||['__ci','__probe','qa'].some(k=>query.has(k))||navigator.webdriver||navigator.doNotTrack==='1'||navigator.globalPrivacyControl)return;
    if(action.startsWith('summary_')&&(mode!=='customer'||!location.hash.startsWith('#quote=')||!config.confirmed))return;
    const path=quoteEventPath(action,entrySource);
    if(!path||measured.has(action))return;
    measured.add(action);
    fetch('/api/hit',{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({p:path,l:config.lang,e:'quote'})}).catch(()=>{});
  }
  const field = (label,name,value,type='text',extra='') => `<label ${extra.includes('wide')?'class="wide"':''}>${label}<input name="${name}" type="${type}" value="${e(value)}" ${extra.replace('wide','')}></label>`;
  function status(message,error=false) {
    const el = document.querySelector('#status');
    if(el){el.textContent=message;el.classList.toggle('error',error);}
  }
  function reportError() { status(t('请填写名称；金额最多保留两位小数，数量为 0–1000 的整数。','Enter names, amounts with up to two decimals, and whole-number quantities from 0 to 1000.'),true); }
  function shell() {
    const home='https://baipiaoji.com/'+(config.lang==='en'?'en/':'');
    document.documentElement.lang=config.lang === 'zh'?'zh-CN':'en';
    document.querySelectorAll('[data-host-only]').forEach(el=>{el.hidden=mode==='customer';if(initial.guides)el.innerHTML=`<h2>${t('使用说明','How it works')}</h2>`+initial.guides[config.lang].map(([q,a])=>`<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join('');});
    document.querySelector('meta[name=robots]').content=mode==='customer'?'noindex,nofollow':(hosted?'index,follow':'noindex,nofollow');
    document.title=mode==='customer'?config.title:t('BPJ 报价工坊：把服务变成互动报价','BPJ Quote Studio — build an interactive quote');
    app.innerHTML=`<a class="skip" href="#main">${t('跳到内容','Skip to content')}</a><header class="topbar"><a class="wordmark" href="${home}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M5 4h16l6 6v18H5z" stroke="currentColor" stroke-width="2"/><path d="M20 4v7h7M10 16h12M10 21h8" stroke="currentColor" stroke-width="2"/></svg>${t('BPJ 报价工坊','BPJ Quote Studio')}</a><nav><a class="studio-link" href="${home}studio/" rel="noreferrer">${t('更多工具','More tools')}</a><span class="tag">${t('本机运行 · 免费','Runs locally · Free')}</span><button data-action="language" lang="${config.lang==='zh'?'en':'zh-CN'}">${t('English','中文')}</button></nav></header><main id="main" class="shell ${mode==='customer'?'customer-shell':''}"></main><footer class="page-footer">${t('内容与价格由创建者提供。BPJ 不核验服务商、不收款；所有输入在本机处理。','Content and prices are provided by the creator. BPJ does not verify sellers or collect payment. Inputs are processed on your device.')}</footer><dialog id="text-dialog"><h2 id="dialog-title"></h2><p id="dialog-description"></p><textarea id="dialog-text" rows="7" readonly aria-labelledby="dialog-title"></textarea><button data-action="close-dialog">${t('关闭','Close')}</button></dialog><input type="file" id="import-file" accept=".json,application/json" hidden>`;
    if(mode==='builder') renderBuilder(); else renderCustomer();
    if(mode==='builder')measure('builder_open');else if(location.hash.startsWith('#quote='))measure('client_open');
    bind();
  }
  function renderBuilder() {
    document.querySelector('#main').innerHTML=`<section class="intro"><div><h1>${t('客户改范围，报价跟着算。','Your client changes the scope. The quote updates.')}</h1><p>${t('填好服务和价格，客户自己调整范围。明细算清楚，再开始合作。','Set your services and rates. Clients choose the scope and see an itemized estimate before the work begins.')}</p><div class="intro-actions"><button class="primary" data-action="preview">${t('先试客户效果','Try the client view')}</button><button data-action="edit-jump">${t('填写我的报价','Set my own rates')}</button></div><p class="help">${t('无需注册。先试用示例，再换成你的服务与价格。','No signup. Try the sample, then add your own services and rates.')}</p></div><div class="path"><span>${t('设定服务','Set rates')}</span> / <span>${t('交给客户','Share tool')}</span> / <span>${t('确认范围','Agree scope')}</span></div></section><nav class="mobile-nav" aria-label="${t('报价操作','Quote actions')}"><button data-action="edit-jump">${t('编辑服务','Edit rates')}</button><button data-action="preview">${t('预览','Preview')}</button><button data-action="share-jump">${t('分享报价','Share quote')}</button></nav><div class="workspace"><section id="edit-panel" class="editor" aria-label="${t('报价编辑器','Quote editor')}"><h2>${t('先选一个起点','Start with a template')}</h2><div class="templates">${[['video',t('视频制作','Video services')],['web',t('网站设计','Web design')],['content',t('内容运营','Content services')]].map(([key,name])=>`<button data-template="${key}" aria-pressed="${key===selectedTemplate}">${name}</button>`).join('')}</div><p class="help">${t('以下均为虚构示例价格，不代表市场行情。','All sample rates are fictional, not market benchmarks.')}</p><form id="editor" novalidate><div class="fields">${field(t('你的品牌或工作室','Your brand or studio'),'brand',config.brand,'text','maxlength="60" required wide')}${field(t('报价标题','Quote title'),'title',config.title,'text','maxlength="90" required wide')}<label>${t('币种（不会换算价格）','Currency (no conversion)')}<select name="currency">${['CNY','USD','EUR'].map(c=>`<option ${c===config.currency?'selected':''}>${c}</option>`).join('')}</select></label>${field(t('基础服务费','Base service fee'),'base',(config.base/100).toFixed(2),'number','min="0" max="9999999.99" step="0.01" required')}</div><div class="editor-section"><div class="row-title"><h3>${t('客户可以选择的服务','Services clients can choose')}</h3><button type="button" data-action="add" ${config.items.length>=6?'disabled':''}>${t('添加服务','Add service')}</button></div><div id="edit-items">${config.items.map((item,i)=>`<div class="edit-item"><label class="name">${t('服务名称','Service name')}<input name="name-${i}" value="${e(item.name)}" maxlength="70" required></label><button type="button" class="remove" data-remove="${i}" ${config.items.length===1?'disabled':''}>${t('删除','Remove')}</button>${field(t('单价','Unit price'),`price-${i}`,(item.price/100).toFixed(2),'number','min="0" max="9999999.99" step="0.01" required')}${field(t('计量单位','Unit'),`unit-${i}`,item.unit,'text','maxlength="20" required')}${field(t('默认数量','Default qty'),`quantity-${i}`,item.quantity,'number','min="0" max="1000" step="1" required')}</div>`).join('')}</div></div><div class="fields editor-section">${field(t('首期付款比例（%）','Initial payment (%)'),'deposit',config.deposit,'number','min="0" max="100" step="1" required')}<label class="wide">${t('交付范围与说明','Scope and delivery notes')}<textarea name="note" rows="4" maxlength="600">${e(config.note)}</textarea></label></div><label class="confirm" id="share-panel"><input type="checkbox" name="confirmed" ${config.confirmed?'checked':''}> <span>${t('我已用自己的价格、交付范围和说明替换示例，准备交给客户。','I have replaced the sample rates and scope with my own and am ready to share.')}</span></label></form><div class="actions"><button class="primary" data-action="export" ${!config.confirmed?'disabled':''}>${t('下载客户报价页','Download client quote page')}</button><button data-action="share" ${!hosted||!config.confirmed?'disabled':''} title="${t('确认价格与范围后即可分享','Confirm rates and scope before sharing')}">${t('复制客户链接','Copy client link')}</button></div><p class="help">${t('下载 HTML 文件可离线使用，也可自行托管。分享前请检查内容；公开链接和文件都包含全部报价数据，请勿填写客户隐私信息。旧链接不能撤回或同步更新，修改后请重发。','The downloaded HTML works offline and can be self-hosted. Links and files contain the full rate configuration; omit private client details. Old links cannot be revoked or updated. Send a new link after editing.')}</p>${!hosted?`<p class="help">${t('当前为本机预览；公开网址部署后才可生成可访问的客户链接。','This is a local preview. Public client links become available after hosting.')}</p>`:''}<details class="secondary"><summary>${t('保存、恢复与备份','Save, restore and back up')}</summary><div class="actions"><button data-action="save">${t('保存本机草稿','Save local draft')}</button><button data-action="load">${t('恢复本机草稿','Restore draft')}</button><button data-action="json">${t('下载 JSON','Download JSON')}</button><button data-action="import">${t('导入 JSON','Import JSON')}</button><button data-action="clear">${t('删除本机草稿','Delete local draft')}</button></div><p class="help">${t('只在你点击保存时写入本浏览器；不是云备份。','Only saved in this browser when you choose Save; this is not a cloud backup.')}</p></details><p id="status" class="status" role="status" aria-live="polite"></p></section><section class="preview"><div class="preview-label"><span>${t('客户将看到的页面','What your client sees')}</span><button data-action="preview">${t('全屏试用','Try full view')}</button></div><div id="quote-preview"></div></section></div><section class="learn"><div><h3>${t('看清价格怎么来的','Make pricing clear')}</h3><p>${t('数量、单价、基础费与首期款分开显示。','Quantities, rates, base fees and initial payments are shown separately.')}</p></div><div><h3>${t('把范围带回沟通','Bring the scope to the conversation')}</h3><p>${t('客户复制或下载需求摘要后，自行发给你确认，不会自动下单。','Clients copy or download their scope and send it to you themselves. No automatic order.')}</p></div><div><h3>${t('你的工具，可以继续传播','A tool others can make their own')}</h3><p>${t('客户页保留创建入口。复制模板后可以制作自己的工具。','The client page includes a template entry so others can make their own tool.')}</p></div></section>${recommendPanel()}`;
    renderQuote();
  }
  function recommendPanel() {
    return `<section class="recommend"><h2>${t('把免费工具推荐给同行','Recommend the free tool')}</h2><p>${t('知道有人正要给客户报价？复制一段介绍，或在支持的手机上打开分享面板。','Know someone quoting a client project? Copy a short introduction, or open the share menu on a supported device.')}</p><div class="actions"><button data-action="recommend-message">${t('复制介绍与链接','Copy introduction and link')}</button><button data-action="recommend">${t('只复制工具链接','Copy tool link only')}</button>${typeof navigator.share==='function'?`<button data-action="recommend-share">${t('打开手机分享','Open share menu')}</button>`:''}</div><p class="help">${t('只包含公开工具介绍，不含你的报价、品牌或客户信息。发送前请自行核对。','Only public tool information, without your quote, brand or client details. Review it before sending.')}</p><p data-recommend-status class="status" role="status" aria-live="polite"></p></section>`;
  }
  function recommendStatus(message){const el=document.querySelector('[data-recommend-status]');if(el)el.textContent=message;else status(message);}
  function renderCustomer() {
    const canBack=initial.mode!=='customer'&&!location.hash.startsWith('#quote=');
    document.querySelector('#main').innerHTML=`${demoIntro?`<section class="demo-intro" aria-labelledby="demo-title"><p class="eyebrow">${t('可操作示例 · 无需注册','WORKING EXAMPLE · NO SIGNUP')}</p><h1 id="demo-title">${t('先当一次客户，再做你的报价。','Try it as a client. Then make it yours.')}</h1><p>${t('调整服务数量，看看费用明细如何变化。示例金额是虚构的，开始接单前请换成自己的价格。','Change a service quantity and inspect the breakdown. Sample rates are fictional; replace them with your own before quoting a real project.')}</p><button class="primary" data-action="demo-start">${t('使用模板，填我的价格','Use template with my rates')}</button></section>`:`<div class="customer-top"><p>${t('调整数量，找到合适的服务范围。','Adjust quantities to find the right scope.')}</p>${canBack?`<button data-action="back">${t('返回编辑','Back to editor')}</button>`:''}</div>`}<div id="quote-preview"></div><p id="status" class="status" role="status" aria-live="polite"></p>${demoIntro?recommendPanel():''}`;
    renderQuote();
  }
  function renderQuote() {
    if(!valid){document.querySelector('#quote-preview').innerHTML=`<div class="quote"><div class="quote-head"><h2>${t('请先修正输入','Please fix the inputs')}</h2><p>${t('完整的价格和服务名称填写正确后，预览会恢复。','The preview will return when prices and service names are valid.')}</p></div></div>`;return;}
    const result=calculate(config,quantities);
    document.querySelector('#quote-preview').innerHTML=`<article class="quote"><header class="quote-head"><p class="seller">${e(config.brand)}</p><h2>${e(config.title)}</h2><p class="quote-intro">${t('根据需要调整数量，查看你的费用明细。','Choose the quantities you need and see the full breakdown.')}</p>${!config.confirmed?`<p class="sample">${t('示例预览：创建者尚未确认价格与范围。','Sample preview: rates and scope have not been confirmed by the creator.')}</p>`:''}</header><div class="customer-items">${result.lines.map((item,i)=>`<div class="customer-line"><div><strong>${e(item.name)}</strong><small>${money(item.price)} / ${e(item.unit)}</small></div><label>${t('数量','Quantity')}<input data-qty="${i}" type="number" min="0" max="1000" step="1" value="${item.quantity}" aria-label="${e(item.name)} ${t('数量','quantity')}"></label><div class="line-total" data-line="${i}">${money(item.total)}</div></div>`).join('')}</div><section class="summary" aria-live="polite" aria-atomic="true"><div class="sum-row"><span>${t('服务小计','Services subtotal')}</span><span id="subtotal">${money(result.total-config.base)}</span></div><div class="sum-row"><span>${t('基础服务费','Base service fee')}</span><span>${money(config.base)}</span></div><div class="sum-row total"><span>${t('预估合计','Estimated total')}<br><small>${e(config.currency)}</small></span><strong id="total">${money(result.total)}</strong></div><div class="sum-row"><span>${t('首期款','Initial payment')} (${config.deposit}%)</span><span id="deposit">${money(result.deposit)}</span></div><div class="sum-row"><span>${t('余款','Remaining balance')}</span><span id="balance">${money(result.balance)}</span></div></section><section class="terms"><h3>${t('交付说明','Delivery notes')}</h3>${e(config.note)}</section><footer class="quote-footer"><div class="summary-actions"><button class="primary" data-action="copy-summary">${t('复制我的需求摘要','Copy my scope summary')}</button><button data-action="summary">${t('下载我的需求摘要','Download my scope summary')}</button></div><p class="summary-help">${t('复制后粘贴到你与服务商的聊天中，确认服务范围与报价。','Paste the summary into your conversation with the provider to agree scope and price.')}</p><p class="legal">${t('此页提供预估，不是订单或付款承诺；未计算税费与未列明费用。请与服务商确认最终范围和总价。','This is an estimate, not an order or payment commitment. Taxes and unlisted charges are excluded. Agree the final scope and price with the provider.')}</p><button class="powered" data-action="remix">${t('用这个模板，创建我的报价工具','Create my own quote tool from this template')}</button></footer></article>`;
  }
  function readEditor() {
    if(mode!=='builder')return valid;
    const form=document.querySelector('#editor'), data=new FormData(form);
    try {
      if(!form.checkValidity())throw new Error('form');
      config=validateConfig({...config,brand:data.get('brand'),title:data.get('title'),currency:data.get('currency'),note:data.get('note'),base:parseMoney(data.get('base')),deposit:Number(data.get('deposit')),confirmed:data.get('confirmed')==='on',items:config.items.map((_,i)=>({name:data.get(`name-${i}`),unit:data.get(`unit-${i}`),price:parseMoney(data.get(`price-${i}`)),quantity:Number(data.get(`quantity-${i}`))}))});
      quantities=config.items.map(i=>i.quantity);valid=true;status('');
    }catch{valid=false;reportError();}
    for(const action of ['export','share']){const button=document.querySelector(`[data-action="${action}"]`);if(button)button.disabled=!valid||!config.confirmed||(action==='share'&&!hosted);}
    renderQuote();return valid;
  }
  function download(text,type,name) {
    const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function textDialog(title,description,value) {
    document.querySelector('#dialog-title').textContent=title;document.querySelector('#dialog-description').textContent=description;document.querySelector('#dialog-text').value=value;document.querySelector('#text-dialog').showModal();document.querySelector('#dialog-text').select();
  }
  function exportHTML() {
    const clone=document.documentElement.cloneNode(true);
    clone.querySelector('#app').innerHTML='';
    clone.querySelectorAll('[data-host-only],link[rel=canonical],link[rel=alternate],script[type="application/ld+json"],meta[property^="og:"],meta[name^="twitter:"]').forEach(el=>el.remove());
    clone.querySelector('meta[name=robots]').content='noindex,nofollow';
    clone.querySelector('#initial-state').textContent=safeJSON({mode:'customer',config});
    clone.querySelector('title').textContent=config.title;
    clone.querySelector('meta[name="description"]').content=t('可由客户调整范围的互动报价。','An interactive service quote with adjustable scope.');
    return '<!doctype html>\n'+clone.outerHTML;
  }
  function summaryText() {
    const result=calculate(config,quantities);
    const lines=[config.brand,config.title,'',t('需求摘要（待双方确认）','Scope summary (requires mutual confirmation)'),...result.lines.map(item=>`${item.name}: ${item.quantity} ${item.unit} × ${money(item.price)} = ${money(item.total)}`),`${t('基础服务费','Base fee')}: ${money(config.base)}`,`${t('预估合计','Estimated total')}: ${money(result.total)} (${config.currency})`,`${t('首期款','Initial payment')} (${config.deposit}%): ${money(result.deposit)}`,`${t('余款','Balance')}: ${money(result.balance)}`,'',config.note,'',t('未计算税费及未列明费用。本摘要不是订单、合同或付款凭证。','Taxes and unlisted charges excluded. This summary is not an order, contract or payment receipt.'),t('由客户自行发送给服务商；未自动提交或下单。','Send to the provider yourself; nothing has been automatically submitted or ordered.')];
    return lines.join('\n');
  }
  function quantityChanged(input) {
    const i=Number(input.dataset.qty),value=input.value;
    if(!/^\d{1,4}$/.test(value)||Number(value)>1000){input.setAttribute('aria-invalid','true');document.querySelector('#total').textContent='—';document.querySelectorAll('[data-action="summary"],[data-action="copy-summary"]').forEach(el=>el.disabled=true);status(t('请输入 0–1000 的整数数量。','Enter a whole-number quantity from 0 to 1000.'),true);return;}
    input.removeAttribute('aria-invalid');quantities[i]=Number(value);
    if(document.querySelector('[data-qty][aria-invalid="true"]'))return;
    const result=calculate(config,quantities);document.querySelector('#subtotal').textContent=money(result.total-config.base);document.querySelector('#total').textContent=money(result.total);document.querySelector('#deposit').textContent=money(result.deposit);document.querySelector('#balance').textContent=money(result.balance);result.lines.forEach((item,j)=>document.querySelector(`[data-line="${j}"]`).textContent=money(item.total));document.querySelectorAll('[data-action="summary"],[data-action="copy-summary"]').forEach(el=>el.disabled=false);status('');
  }
  async function action(name) {
    if(name==='edit-jump'||name==='share-jump'){const el=document.querySelector(name==='edit-jump'?'#edit-panel':'#share-panel');el.scrollIntoView({block:'start'});el.querySelector('input,button')?.focus({preventScroll:true});return;}
    if(['export','share','json','save','preview','add'].includes(name)&&mode==='builder'&&!readEditor())return;
    if(name==='language') {if(mode==='builder'&&!readEditor())return;const lang=config.lang==='zh'?'en':'zh';const reset=!dirty&&!config.confirmed&&mode==='builder';config=reset?template(selectedTemplate,lang):{...config,lang};if(reset)quantities=config.items.map(i=>i.quantity);shell();return;}
    if(['recommend','recommend-message','recommend-share'].includes(name)){
      const data=toolRecommendation(config.lang),copyText=name==='recommend'?data.url:data.text+'\n'+data.url;
      if(name==='recommend-share'&&typeof navigator.share==='function'){
        measure('tool_share_requested');
        try{await navigator.share(data);recommendStatus(t('分享操作已返回。发送结果请以所选应用为准。','The share action has returned. Check the selected app for the sending result.'));return;}
        catch(error){if(error?.name==='AbortError'){recommendStatus(t('分享已取消，或当前没有可用的分享应用。','Sharing was canceled, or no share target is available.'));return;}}
      }
      try{await navigator.clipboard.writeText(copyText);measure(name==='recommend'?'tool_link_copied':'tool_message_copied');recommendStatus(t('已复制公开工具介绍或链接，不含你的报价内容。','Public tool information copied, without your quote content.'));}
      catch{textDialog(t('复制工具推荐','Copy tool recommendation'),t('请选择并复制下面的内容。此处不包含你的报价。','Select and copy the text below. Your quote is not included.'),copyText);}
      return;
    }
    if(name==='preview'){measure('demo_preview');mode='customer';shell();window.scrollTo(0,0);return;}
    if(name==='back'||name==='demo-start'){if(demoIntro)measure('demo_start');demoIntro=false;mode='builder';quantities=config.items.map(i=>i.quantity);shell();if(name==='demo-start'){document.querySelector('[name=brand]').focus();document.querySelector('#edit-panel').scrollIntoView({block:'start'});}return;}
    if(name==='close-dialog'){document.querySelector('#text-dialog').close();return;}
    if(name==='export'){if(!config.confirmed)return;download(exportHTML(),'text/html;charset=utf-8','client-quote.html');measure('file_generated');status(t('已生成客户报价页。先打开检查，再将文件交给客户或自行托管。','Client quote page generated. Open and review it, then share the file or host it.'));return;}
    if(name==='share') {
      if(!config.confirmed||!hosted)return;
      const url=new URL(location.href);url.search='';url.hash='quote='+encodeConfig(config);
      try{await navigator.clipboard.writeText(url.href);measure('link_copied');status(t('客户链接已复制；任何持有链接的人都能查看全部报价配置。','Client link copied. Anyone with the link can read the complete rate configuration.'));}
      catch{textDialog(t('复制客户链接','Copy client link'),t('自动复制不可用，请选择并复制下面的链接。','Automatic copying is unavailable. Select and copy the link below.'),url.href);}return;
    }
    if(name==='summary'||name==='copy-summary'){
      if(document.querySelector('[data-qty][aria-invalid="true"]'))return;
      const text=summaryText();
      if(name==='summary'){download(text,'text/plain;charset=utf-8','quote-request.txt');measure('summary_generated');status(t('已生成摘要文件，请自行发送给服务商确认。','The summary file is ready. Send it to the provider to confirm.'));}
      else {try{await navigator.clipboard.writeText(text);measure('summary_copied');status(t('需求摘要已复制，请粘贴到你与服务商的聊天中。','Scope copied. Paste it into your conversation with the provider.'));}catch{textDialog(t('复制需求摘要','Copy scope summary'),t('请选择并复制下面的摘要，再发给服务商。','Select and copy the summary below, then send it to the provider.'),text);}}return;
    }
    if(name==='json'){download(safeJSON(config),'application/json','quote-template.json');status(t('已生成 JSON 备份。','JSON backup generated.'));return;}
    if(name==='save'){try{localStorage.setItem('bpj-quote-studio-v1',JSON.stringify(config));status(t('草稿已保存在本浏览器。','Draft saved in this browser.'));}catch{status(t('浏览器不允许本机保存，请下载 JSON 备份。','Browser storage is unavailable. Download a JSON backup instead.'),true);}return;}
    if(name==='clear'){try{localStorage.removeItem('bpj-quote-studio-v1');status(t('本机草稿已删除，当前编辑内容保留。','Local draft deleted. Your current editor remains open.'));}catch{status(t('无法访问本机存储。','Local storage is unavailable.'),true);}return;}
    if(name==='load'){try{const saved=localStorage.getItem('bpj-quote-studio-v1');if(!saved){status(t('本浏览器没有保存的草稿。','No draft is saved in this browser.'));return;}if(dirty&&!confirm(t('恢复草稿将替换当前编辑，继续吗？','Replace the current editor with your saved draft?')))return;config=validateConfig(JSON.parse(saved));quantities=config.items.map(i=>i.quantity);dirty=true;valid=true;shell();status(t('草稿已恢复。','Draft restored.'));}catch{status(t('草稿无法读取；可导入 JSON 备份。','Draft could not be read. Try importing a JSON backup.'),true);}return;}
    if(name==='import'){document.querySelector('#import-file').click();return;}
    if(name==='add'){if(config.items.length>=6)return;config.items.push({name:t('新增服务','Additional service'),unit:t('项','item'),price:0,quantity:0});config.confirmed=false;dirty=true;quantities=config.items.map(i=>i.quantity);shell();return;}
    if(name==='remix'){if(mode==='builder'&&!readEditor())return;if(!confirm(t('将复制此模板并清空品牌信息，请核对价格与服务后再分享。','Copy this template and reset its brand? Review all rates and services before sharing.')))return;if(demoIntro)measure('demo_start');demoIntro=false;config={...config,brand:t('你的工作室','Your studio'),confirmed:false};mode='builder';dirty=true;quantities=config.items.map(i=>i.quantity);if(location.hash)history.replaceState(null,'',location.pathname+location.search);initial.mode='builder';measure('remix');shell();window.scrollTo(0,0);}
  }
  function bind() {
    // Replaced on render, so listeners never accumulate.
    app.onclick=event=>{const button=event.target.closest('button');if(!button||button.disabled)return;
      if(button.dataset.template){if(dirty&&!confirm(t('切换模板会替换当前编辑，继续吗？','Switch templates and replace the current editor?')))return;selectedTemplate=button.dataset.template;config=template(selectedTemplate,config.lang);quantities=config.items.map(i=>i.quantity);dirty=false;valid=true;shell();return;}
      if(Object.hasOwn(button.dataset,'remove')){const i=Number(button.dataset.remove);if(!readEditor()||config.items.length<=1)return;config.items.splice(i,1);config.confirmed=false;dirty=true;quantities=config.items.map(i=>i.quantity);shell();return;}
      if(button.dataset.action)action(button.dataset.action).catch(()=>status(t('操作未完成，请检查输入或下载本机备份。','The action could not finish. Check your inputs or download a local backup.'),true));
    };
    app.oninput=event=>{if(event.target.matches('[data-qty]')){quantityChanged(event.target);return;}if(event.target.closest('#editor')){dirty=true;if(event.target.name!=='confirmed'){const check=document.querySelector('[name="confirmed"]');check.checked=false;measure('own_edit');}const okay=readEditor();if(okay&&event.target.name==='confirmed'&&config.confirmed)measure('own_ready');}};
    document.querySelector('#editor')?.addEventListener('submit',event=>event.preventDefault());
    document.querySelector('#import-file').onchange=async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>20000)throw new Error('size');const next=validateConfig(JSON.parse(await file.text()));if(dirty&&!confirm(t('导入会替换当前编辑，继续吗？','Import and replace your current editor?')))return;config=next;quantities=config.items.map(i=>i.quantity);mode='builder';valid=true;dirty=true;shell();status(t('模板已导入，请核对价格与范围。','Template imported. Review rates and scope.'));}catch{status(t('无法导入：请选择有效且小于 20 KB 的报价模板 JSON。','Import failed. Choose a valid quote-template JSON under 20 KB.'),true);}finally{event.target.value='';}};
  }
  shell();
  if(initial.mode!=='customer'&&!location.hash.startsWith('#quote='))measure('entry_open');
  if(query.get('demo')==='1'&&!location.hash)measure('demo_preview');
  if(startupError)status(t('链接中的报价配置无效，已打开示例编辑器，未加载对方报价。','The quote link is invalid. A sample editor is shown; the sender’s quote was not loaded.'),true);
  window.addEventListener('hashchange',()=>{
    demoIntro=false;
    try{
      config=location.hash.startsWith('#quote=')?decodeConfig(location.hash.slice(7)):validateConfig(initial.config);
      mode=location.hash.startsWith('#quote=')?'customer':initial.mode;
      quantities=config.items.map(i=>i.quantity);valid=true;dirty=false;shell();
    }catch{
      config=template('video',config.lang);mode='builder';quantities=config.items.map(i=>i.quantity);valid=true;dirty=false;shell();
      status(t('链接中的报价配置无效，未加载对方报价。','The quote link is invalid; the sender’s quote was not loaded.'),true);
    }
  });
})();
