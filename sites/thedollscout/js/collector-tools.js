(function () {
  'use strict';
  const core = window.DSCollector;
  const app = document.querySelector('[data-collector]');
  if (!app || !core) return;
  const q = s => app.querySelector(s);
  const msg = key => app.dataset[key];
  function announce(text) { q('[data-message]').textContent = text; }
  function track(event) {
    try {
      const params=new URLSearchParams(location.search);
      if(location.hostname!=='thedollscout.com'||window.top!==window.self||['ci','__ci','__probe','qa','__qa'].some(k=>params.has(k))||params.get('utm_source')==='verify'||navigator.webdriver||/bot|crawler|spider|headless/i.test(navigator.userAgent)||navigator.globalPrivacyControl||navigator.doNotTrack==='1') return;
      if(localStorage.getItem('tds_analytics_choice_v1')==='denied') return;
      const collection=/^\/(?:de\/)?collection-tracker(?:\.html)?\/?$/.test(location.pathname);
      const display=/^\/(?:de\/)?display-calculator(?:\.html)?\/?$/.test(location.pathname);
      if(!(collection&&['collection_save','collection_export','collection_import'].includes(event))&&!(display&&event==='display_calc'))return;
      const body = JSON.stringify({p: location.pathname, e: event, r: ''});
      if (!navigator.sendBeacon || !navigator.sendBeacon('/api/ev', body)) fetch('/api/ev', {method:'POST', body, keepalive:true}).catch(() => {});
      window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:event}}));
    } catch (_) {}
  }
  function download(text, type, name) {
    const url = URL.createObjectURL(new Blob([text], {type}));
    const a = document.createElement('a'); a.href=url; a.download=name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (app.dataset.collector === 'collection') {
    const key = core.COLLECTION_KEY;
    let items = [], edit = -1, canSave = true, snapshot;
    try { snapshot=core.readCollection(localStorage); items=snapshot.items; }
    catch (_) { canSave=false; announce(msg('storageError')); }
    function save(next, replaceInvalid=false) {
      if (!canSave && !replaceInvalid) { announce(msg('storageError')); return false; }
      try {
        snapshot=core.writeCollection(localStorage,next,replaceInvalid?localStorage.getItem(key):snapshot.raw,replaceInvalid);
        items=snapshot.items; canSave=true; return true;
      } catch (error) {
        if(error.message==='conflict') refresh(msg('conflict'));
        else announce(msg('storageError'));
        return false;
      }
    }
    function reset() { edit=-1; q('form').reset(); q('[data-save]').textContent=msg('add'); q('[data-cancel]').hidden=true; }
    function render() {
      const filter=q('[data-filter]').value, search=q('[data-search]').value.trim().toLowerCase();
      const list=q('[data-items]'); list.replaceChildren();
      const owned=items.filter(i=>i.status==='owned').reduce((n,i)=>n+i.quantity,0);
      const wish=items.filter(i=>i.status==='wish').reduce((n,i)=>n+i.quantity,0);
      q('[data-summary]').textContent=msg('summary').replace('{owned}',owned).replace('{wish}',wish);
      const visible=items.map((item,index)=>({item,index})).filter(({item:i})=>(filter==='all'||filter===i.status||(filter==='duplicates'&&i.status==='owned'&&i.quantity>1)) && (i.name+' '+i.series).toLowerCase().includes(search));
      q('[data-empty]').hidden=visible.length>0;
      for (const {item,index} of visible) {
        const card=document.createElement('article'); card.className='collection-item';
        const title=document.createElement('h3'); title.textContent=item.name;
        const detail=document.createElement('p'); detail.textContent=[item.series, msg(item.status), '× '+item.quantity].filter(Boolean).join(' · ');
        const actions=document.createElement('div'); actions.className='actions';
        for (const action of ['edit','remove']) {
          const button=document.createElement('button'); button.type='button'; button.textContent=msg(action); button.className='btn secondary';
          button.addEventListener('click',()=>{
            if(action==='edit') {
              edit=index;
              for(const field of ['name','series','quantity','status']) q('[name="'+field+'"]').value=item[field];
              q('[data-save]').textContent=msg('update'); q('[data-cancel]').hidden=false; q('[name="name"]').focus();
            } else if (confirm(msg('confirmRemove')) && save(items.filter((_,n)=>n!==index))) {reset();render();announce(msg('saved'));}
          }); actions.append(button);
        }
        card.append(title,detail,actions); list.append(card);
      }
    }
    function refresh(message=msg('synced')) {
      try {
        const next=core.readCollection(localStorage);
        const changed=!snapshot||next.raw!==snapshot.raw||!canSave;
        snapshot=next; items=next.items; canSave=true;
        if(changed){reset();render();announce(message);}
        return true;
      } catch (_) {canSave=false;announce(msg('storageError'));return false;}
    }
    q('form').addEventListener('submit',event=>{
      event.preventDefault();
      try {
        const item=core.normalizeItem(Object.fromEntries(new FormData(event.currentTarget)));
        const next=items.slice();
        if(edit>=0) {
          const previous=items[edit];
          // Quantity/status edits retain the catalogue link. Renaming an entry
          // makes it a manual entry; an explicit wishlist edit ends undo status.
          if(previous.seriesId&&previous.name===item.name&&previous.series===item.series) {
            item.seriesId=previous.seriesId; item.styleId=previous.styleId;
          }
          next[edit]=item;
        }
        else {if(next.length>=core.MAX_ITEMS) throw Error('limit'); next.push(item);}
        if(save(next)){reset();render();announce(msg('saved'));track('collection_save');}
      } catch (_) {announce(msg('invalid'));}
    });
    q('[data-cancel]').addEventListener('click',reset);
    q('[data-filter]').addEventListener('change',render); q('[data-search]').addEventListener('input',render);
    q('[data-backup]').addEventListener('click',()=>{if(refresh()){download(core.backup(items),'application/json','dollscout-collection.json');track('collection_export');}});
    q('[data-csv]').addEventListener('click',()=>{if(refresh()){download(core.csv(items),'text/csv;charset=utf-8','dollscout-collection.csv');track('collection_export');}});
    q('[data-import]').addEventListener('change',async event=>{
      const file=event.target.files[0]; if(!file) return;
      try {
        if(file.size>2000000) throw Error('size');
        const next=core.restore(await file.text());
        if(confirm(msg('confirmImport').replace('{count}',next.length))) {
          // An explicit restore may replace malformed stored data, but never silently.
          if(save(next,true)){reset();render();announce(msg('saved'));track('collection_import');}
        }
      } catch (_) {announce(msg('invalidBackup'));}
      event.target.value='';
    });
    window.addEventListener('storage',event=>{
      if(event.key===key||event.key===null) refresh();
    });
    window.addEventListener('focus',()=>refresh());
    window.addEventListener('pageshow',()=>refresh());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
    render();
  } else {
    const form=q('form'); let unit='cm';
    q('[name="unit"]').addEventListener('change',event=>{
      const next=event.target.value, factor=next==='in'?1/2.54:2.54;
      if(next!==unit) for(const input of form.querySelectorAll('input[type="number"]')) {
        if(input.value!=='') input.value=String(Number(input.value)*factor);
      }
      unit=next; q('[data-result]').hidden=true;
    });
    form.addEventListener('input',()=>{q('[data-result]').hidden=true;announce('');});
    form.addEventListener('submit',event=>{
      event.preventDefault();
      try {
        const input=Object.fromEntries(new FormData(form)); input.rotate=q('[name="rotate"]').checked;
        const result=core.fit(input);
        q('[data-count]').textContent=result.count.toLocaleString();
        q('[data-layout]').textContent=msg(result.rotated?'rotated':'normal').replace('{cols}',result.columns).replace('{rows}',result.rows);
        q('[data-zero]').hidden=result.count!==0;
        const plan=q('[data-plan]');plan.replaceChildren();
        plan.style.aspectRatio=Number(input.width)/Number(input.depth);
        plan.style.width=Math.min(600,500*Number(input.width)/Number(input.depth))+'px';
        plan.hidden=!result.count;
        const shown=Math.min(result.count,120);
        for(let n=0;n<shown;n++) {
          const cell=document.createElement('span');cell.className='plan-item';
          cell.style.left=((n%result.columns)*(result.width+Number(input.gap))/Number(input.width)*100)+'%';
          cell.style.top=(Math.floor(n/result.columns)*(result.depth+Number(input.gap))/Number(input.depth)*100)+'%';
          cell.style.width=(result.width/Number(input.width)*100)+'%';
          cell.style.height=(result.depth/Number(input.depth)*100)+'%';plan.append(cell);
        }
        q('[data-cap]').hidden=result.count<=120;
        q('[data-result]').hidden=false; track('display_calc');
      } catch (_) {announce(msg('invalid'));}
    });
  }
})();
