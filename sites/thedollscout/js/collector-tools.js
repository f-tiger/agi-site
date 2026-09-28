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
      const body = JSON.stringify({p: location.pathname, e: event, r: ''});
      if (navigator.sendBeacon) navigator.sendBeacon('/api/ev', body);
      else fetch('/api/ev', {method:'POST', body, keepalive:true}).catch(() => {});
      if (typeof window.gtag === 'function') window.gtag('event', event);
    } catch (_) {}
  }
  function download(text, type, name) {
    const url = URL.createObjectURL(new Blob([text], {type}));
    const a = document.createElement('a'); a.href=url; a.download=name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (app.dataset.collector === 'collection') {
    const key = 'dollscout-collection-v1';
    let items = [], edit = -1, canSave = true;
    try { const saved=localStorage.getItem(key); if(saved) items=core.restore(saved); }
    catch (_) { canSave=false; announce(msg('storageError')); }
    function save(next) {
      if (!canSave) { announce(msg('storageError')); return false; }
      try { localStorage.setItem(key, core.backup(next)); items=next; return true; }
      catch (_) { announce(msg('storageError')); return false; }
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
    q('form').addEventListener('submit',event=>{
      event.preventDefault();
      try {
        const item=core.normalizeItem(Object.fromEntries(new FormData(event.currentTarget)));
        const next=items.slice();
        if(edit>=0) next[edit]=item;
        else {if(next.length>=core.MAX_ITEMS) throw Error('limit'); next.push(item);}
        if(save(next)){reset();render();announce(msg('saved'));track('collection_save');}
      } catch (_) {announce(msg('invalid'));}
    });
    q('[data-cancel]').addEventListener('click',reset);
    q('[data-filter]').addEventListener('change',render); q('[data-search]').addEventListener('input',render);
    q('[data-backup]').addEventListener('click',()=>{download(core.backup(items),'application/json','dollscout-collection.json');track('collection_export');});
    q('[data-csv]').addEventListener('click',()=>{download(core.csv(items),'text/csv;charset=utf-8','dollscout-collection.csv');track('collection_export');});
    q('[data-import]').addEventListener('change',async event=>{
      const file=event.target.files[0]; if(!file) return;
      try {
        if(file.size>2000000) throw Error('size');
        const next=core.restore(await file.text());
        if(confirm(msg('confirmImport').replace('{count}',next.length))) {
          // An explicit restore may replace malformed stored data, but never silently.
          canSave=true;
          if(save(next)){reset();render();announce(msg('saved'));track('collection_import');}
        }
      } catch (_) {announce(msg('invalidBackup'));}
      event.target.value='';
    });
    window.addEventListener('storage',event=>{
      if(event.key!==key) return;
      try {items=event.newValue?core.restore(event.newValue):[];reset();render();announce(msg('synced'));}
      catch(_){canSave=false;announce(msg('storageError'));}
    });
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
