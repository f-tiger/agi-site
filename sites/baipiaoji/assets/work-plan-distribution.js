// No input values, URL fragments, persistent IDs, cookies, or third-party calls.
(function(){
  var q=new URLSearchParams(location.search),host=location.hostname;
  var excluded=!['baipiaoji.com','www.baipiaoji.com'].includes(host)||navigator.doNotTrack==='1'||window.doNotTrack==='1'||navigator.globalPrivacyControl===true||navigator.webdriver||q.has('__ci')||q.has('__probe')||q.get('qa')==='1';
  var ref='',mode='direct';
  try{var u=new URL(document.referrer);if(['https:','http:'].includes(u.protocol))ref=u.origin;}catch(e){}
  var refHost=ref?new URL(ref).hostname:'';
  var owned=['baipiaoji.com','getecoback.com','agiscorecard.com','thedollscout.com'].some(function(d){return refHost===d||refHost.endsWith('.'+d)});
  if(window.self!==window.top){mode=ref?(owned?'owned':'external'):'frame-unknown';}
  if(q.get('preview')==='1')mode='preview';
  window.bpjEmbedMode=mode;
  window.bpjDistribution=function(path){
    if(excluded||!/^\/distribution\/(?:work-plan\/(?:view|calculate|open|arrive|copy)\/(?:external|owned|frame-unknown|direct|preview|page)\/(?:example|edited|none)|skill\/(?:copy|source)\/page\/none)$/.test(path))return;
    fetch('/api/hit',{method:'POST',credentials:'omit',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify({p:path,e:'distribution',l:document.documentElement.lang.startsWith('zh')?'zh':'en',r:ref})}).catch(function(){});
  };
  var button=document.getElementById('wpEmbedCopy');
  if(button)button.addEventListener('click',async function(){var code=document.getElementById('wpEmbedCode'),status=document.getElementById('wpEmbedStatus');try{await navigator.clipboard.writeText(code.value);status.textContent=document.documentElement.lang.startsWith('zh')?'已复制':'Copied';window.bpjDistribution('/distribution/work-plan/copy/page/none');}catch(e){code.focus();code.select();status.textContent=document.documentElement.lang.startsWith('zh')?'请选择并复制代码':'Select and copy the code';}});
  var install=document.getElementById('ce-skill-copy');
  if(install)install.addEventListener('click',async function(){var code=document.getElementById('ce-skill-command'),status=document.getElementById('ce-skill-copy-status');try{await navigator.clipboard.writeText(code.textContent);status.textContent=document.documentElement.lang.startsWith('zh')?'已复制':'Copied';window.bpjDistribution('/distribution/skill/copy/page/none');}catch(e){status.textContent=document.documentElement.lang.startsWith('zh')?'请选中并复制上方命令':'Select and copy the command above';}});
  document.querySelectorAll('[data-skill-source]').forEach(function(a){a.addEventListener('click',function(){window.bpjDistribution('/distribution/skill/source/page/none');});});
})();
