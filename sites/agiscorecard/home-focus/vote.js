const poll = document.querySelector('[data-home-vote]');
if (poll) {
  const zh = poll.dataset.homeVote === 'zh', $ = id => poll.querySelector('#' + id);
  const names = zh ? ['加速主义者','坚定信徒','现实派','怀疑者','逆势者'] : ['The Accelerationist','The True Believer','The Realist','The Skeptic','The Contrarian'];
  const buttons = [...poll.querySelectorAll('[data-vote]')], keys = buttons.map(b => b.dataset.vote);
  const label = key => buttons[keys.indexOf(key)].textContent;
  const qa = new URLSearchParams(location.search);
  const quiet = () => ['ci','__qa','__probe'].some(k => qa.get(k) === '1') || qa.get('utm_source') === 'verify' || navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  function event(name, slug) { if (!quiet()) { try { window.gtag?.('event', name, {location:'home_vote_' + (zh?'zh':'en'),label:slug}); } catch {} } }
  let choice = null, crowdPromise, crowdViewed = false;
  const seen = new Set();
  function saved() {
    try {
      const d = JSON.parse(localStorage.getItem('agiLock') || 'null');
      if (!d || !keys.includes(d.slug) || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return;
      $('vote-saved').textContent = (zh?'此设备保存的判断：':'Saved on this device: ') + label(d.slug) + ' · ' + d.date;
      $('vote-saved').hidden = false;
    } catch {}
  }
  async function showCrowd() {
    const box = $('vote-crowd');
    box.textContent = zh?'正在读取作答分布…':'Loading recorded answers…';
    if (!crowdPromise) crowdPromise = fetch('/api/crowd').then(async r => {
      if (!r.ok) throw Error('unavailable');
      const d = await r.json();
      if (!d.ok || !d.buckets || !Number.isSafeInteger(d.n) || d.n < 0 || keys.some(k => !Number.isSafeInteger(d.buckets[k]) || d.buckets[k] < 0) || keys.reduce((sum,k) => sum + d.buckets[k],0) !== d.n) throw Error('invalid counts');
      return d;
    });
    try {
      const d = await crowdPromise; box.replaceChildren();
      const heading = document.createElement('p');
      heading.textContent = zh?`历史作答：${d.n} 次`:`Recorded answers: ${d.n}`; box.append(heading);
      for (const k of keys) {
        const row = document.createElement('div'); row.className = 'focus-vote-bar';
        const text = document.createElement('span'); text.textContent = label(k);
        const bar = document.createElement('meter'); bar.min=0;bar.max=Math.max(1,d.n);bar.value=d.buckets[k];bar.setAttribute('aria-label',label(k));
        const number = document.createElement('span'); number.textContent = `${d.buckets[k]} (${d.n?Math.round(d.buckets[k]/d.n*100):0}%)`;
        row.append(text,bar,number);box.append(row);
      }
      const note = document.createElement('p');note.className='focus-vote-note';
      note.textContent = zh?'中英主页及类型测试的历史作答。统计最多延迟一小时，本次选择未必已包含。':'Historical answers from both homepages and type tests. Counts may lag by an hour and may not include this choice yet.';
      box.append(note);
      if (!crowdViewed) { crowdViewed=true; event('crowd_view',choice); }
    } catch { box.textContent=zh?'暂时无法读取历史统计；你的选择仍可查看和分享。':'Historical counts are unavailable. You can still view and share your choice.'; }
  }
  for (const button of buttons) button.addEventListener('click', () => {
    choice = button.dataset.vote;
    buttons.forEach(b => b.setAttribute('aria-pressed',String(b===button)));
    $('vote-verdict').textContent = (zh?'你的选择：':'Your choice: ') + label(choice) + ' · ' + names[keys.indexOf(choice)];
    $('vote-result').hidden=false;
    // Count a deliberate option at most once in this document; never count restoration.
    if (!seen.has(choice)) { seen.add(choice); event('vote_cast',choice); }
    showCrowd();
  });
  const shareUrl = () => 'https://agiscorecard.com/' + (zh?'cn':'') + '#vote';
  const shareText = () => zh?`我认为 AGI 会在「${label(choice)}」到来。你怎么看？\n${shareUrl()}`:`My AGI prediction: ${label(choice)}. What is yours?\n${shareUrl()}`;
  async function copy() {
    if (!choice) return;
    try { await navigator.clipboard.writeText(shareText());$('vote-status').textContent=zh?'判断和投票链接已复制。':'Prediction and voting link copied.';$('vote-copy-fallback').hidden=true; }
    catch { $('vote-status').textContent=zh?'请手动复制下方内容。':'Copy the text below manually.';$('vote-copy-fallback').value=shareText();$('vote-copy-fallback').hidden=false; }
  }
  $('vote-copy').addEventListener('click',copy);
  $('vote-share').addEventListener('click',async()=>{
    if (!choice) return;
    if (navigator.share) { try { await navigator.share({title:zh?'你的 AGI 时间判断':'Your AGI prediction',text:shareText(),url:shareUrl()});event('challenge_share',choice); } catch(e) { if(e.name!=='AbortError')await copy(); } }
    else await copy();
  });
  $('vote-lock').addEventListener('click',()=>{
    if (!choice) return;
    try { localStorage.setItem('agiLock',JSON.stringify({slug:choice,name:names[keys.indexOf(choice)],emoji:['🚀','⏱','📊','🤔','🛡'][keys.indexOf(choice)],date:new Date().toISOString().slice(0,10)}));saved();$('vote-status').textContent=zh?'已保存在此设备，不是公开预测存证。':'Saved on this device, not a public prediction record.';event('prediction_lock',choice); }
    catch { $('vote-status').textContent=zh?'浏览器未允许保存；你仍可复制判断。':'This browser could not save it. You can copy the prediction instead.'; }
  });
  $('vote-subscribe').addEventListener('click',()=>event('subscribe_click',choice));
  saved();
}
