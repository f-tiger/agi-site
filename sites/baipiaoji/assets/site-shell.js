(()=>{const zh=document.documentElement.lang.startsWith('zh'),qa=['__ci','__probe','__qa','qa','ci'].some(k=>new URLSearchParams(location.search).has(k));
const main=document.querySelector('main');if(main&&!document.getElementById('bpj-main')){const anchor=document.createElement('span');anchor.id='bpj-main';anchor.tabIndex=-1;main.prepend(anchor);}
const emit=(a)=>{if(!qa&&window.bpjEv)window.bpjEv('home','/discovery/'+a);};
document.querySelectorAll('[data-bpj-next]').forEach(a=>a.addEventListener('click',()=>emit('next'+new URL(a.href).pathname)));
document.querySelectorAll('[data-bpj-share]').forEach(button => {
  const box = button.closest('[data-share-url]');
  const toolShare = box.hasAttribute('data-tool-share');
  const mode = button.dataset.bpjShare;
  if (toolShare) button.hidden = mode === 'native' && typeof navigator.share !== 'function';
  button.addEventListener('click', async () => {
    const status = box.querySelector('[role=status]');
    let target;
    try {
      target = new URL(box.dataset.shareUrl);
      if (target.origin !== location.origin) return;
    } catch {
      return;
    }
    target.hash = '';
    target.search = toolShare ? 'utm_source=reader_share&utm_medium=share&utm_campaign=free-tools' : '';
    const title = box.dataset.shareTitle || document.title;
    const url = target.href;
    const native = mode === 'native' && typeof navigator.share === 'function';
    status.replaceChildren();
    try {
      if (native) await navigator.share({title, url});
      else await navigator.clipboard.writeText(mode === 'cite' ? `[${title}](${url}) — BPJ` : url);
      if (toolShare) {
        status.textContent = native ? (zh ? '已调用系统分享。' : 'Opened system sharing.') : (zh ? '分享链接已复制。' : 'Share link copied.');
        if (!navigator.webdriver && navigator.doNotTrack !== '1' && navigator.globalPrivacyControl !== true) {
          emit('share/ai-featured/' + (native ? 'native' : 'copy'));
        }
      } else {
        status.textContent = zh ? '已完成。分享的是公开页面链接，不包含你的文件或项目内容。' : 'Done. Only the public page link is shared, without your files or project contents.';
        emit('share/' + mode);
      }
    } catch (error) {
      if (native && error.name === 'AbortError') return;
      status.append(document.createTextNode(zh ? '请复制这个公开链接：' : 'Copy this public link: '));
      const input = document.createElement('input');
      input.readOnly = true;
      input.value = url;
      input.setAttribute('aria-label', zh ? '公开页面链接' : 'Public page link');
      status.append(input);
      input.select();
    }
  });
});
// Existing tool-specific share actions keep their own opt-in parameter semantics.
})();

function revealTarget(){let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}if(!id)return;const node=document.getElementById(id);if(node){for(let p=node.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;node.scrollIntoView();}}
window.addEventListener('hashchange',revealTarget);revealTarget();
