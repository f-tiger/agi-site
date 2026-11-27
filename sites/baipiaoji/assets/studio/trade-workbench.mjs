const zh = document.documentElement.lang.startsWith('zh');
const t = (cn,en) => zh ? cn : en;
const root = document.querySelector('[data-trade-tool]');
const directory = document.querySelector('[data-trade-directory]');
const params = new URLSearchParams(location.search);
const qa = ['__ci','__qa','qa','__probe','ci'].some(key=>params.has(key));

function canMeasure() {
  try {
    return location.hostname==='baipiaoji.com' && !qa && !navigator.webdriver && navigator.doNotTrack!=='1' &&
      !navigator.globalPrivacyControl && localStorage.getItem('fleet_ga4_choice_v1')!=='denied';
  } catch { return false; }
}

function trackTrade(slug,action) {
  try {
    if (!canMeasure()) return;
    window.bpjEv?.('biz','/trade-workbench/'+slug+'/'+action);
    window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'trade_workbench_'+action}}));
  } catch {}
}

function markQa(link) {
  if (!qa) return;
  const href = new URL(link.href);
  href.searchParams.set('__ci','1');
  link.href = href.href;
}

if (directory) {
  const input = directory.querySelector('#trade-search');
  const groups = [...directory.querySelectorAll('.trade-category')].map(section=>({section,items:[...section.querySelectorAll('li')]}));
  const status = directory.querySelector('[data-trade-search-status]');
  const join = directory.querySelector('[data-trade-directory-join]');
  if (join) {
    const gate = join.closest('[data-trade-directory-gate]');
    const showForGuests = user => { gate.hidden = !!user; };
    showForGuests(window.bpjAccount?.state?.user);
    document.addEventListener('bpj-account-state',event=>showForGuests(event.detail?.user));
    markQa(join);
    join.addEventListener('click',()=>trackTrade('directory','signup'));
  }
  input.parentElement.hidden = false;
  input.addEventListener('input',()=>{
    const tokens = input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let matches = 0;
    for (const {section,items} of groups) {
      let visible = 0;
      for (const item of items) {
        const text = item.textContent.toLowerCase();
        item.hidden = !tokens.every(token=>text.includes(token));
        if (!item.hidden) visible++;
      }
      section.hidden = visible === 0;
      matches += visible;
    }
    status.hidden = tokens.length === 0;
    status.textContent = matches ? t(`找到 ${matches} 个工具`,`${matches} tools found`) : t('没有匹配的工具。试试其他关键词。','No matching tools. Try another search.');
  });
  for (const href of directory.querySelectorAll('.trade-categories a')) href.addEventListener('click',()=>{
    if (!input.value) return;
    input.value = '';
    input.dispatchEvent(new Event('input'));
  });
}

if (root) {
  const select = name => root.querySelector('[data-trade-'+name+']');
  const form = select('form'), gate = select('gate'), quota = select('quota'), status = select('status');
  const result = select('result'), upgrade = select('upgrade'), member = select('member'), csv = select('csv');
  const run = form.querySelector('button[type=submit]'), example = select('example'), join = select('join');
  const fields = [...form.querySelectorAll('[data-example]')];
  const errorCopy = {
    sign_in_required:t('请先登录账户，然后返回这个工具。','Sign in to your account and return to this tool.'),
    verification_required:t('请在账户页完成验证后再试。','Complete verification in your account and try again.'),
    invalid_input:t('请核对输入单位、数值范围和日期顺序。','Check units, allowed ranges and the order of dates.'),
    rate_limited:t('今日使用次数已用完，明天可继续。','You have used today’s runs. You can continue tomorrow.'),
    membership_required:t('导出需要当前账号关联的有效会员。','CSV export needs an active membership linked to this account.'),
    access_changed:t('账户权限刚刚变化，请重试。','Account access changed. Try again.'),
    temporarily_unavailable:t('暂时无法获取工具服务，请稍后重试。','The tool is temporarily unavailable. Try again shortly.'),
  };
  const number = new Intl.NumberFormat(zh?'zh-CN':'en-US',{maximumFractionDigits:8});
  const checkingAccess = {access:'checking',remaining:null,limit:null,checkout:null};
  let account = checkingAccess;
  let completed = false, busy = false, loading = false, lastRun = null, exampleInput = null;
  let guestUnavailable = false, refreshPending = false, epoch = 0;
  let accountId = window.bpjAccount?.state?.user?.id ?? null;

  function notice(message, error=false) {
    status.textContent = message;
    status.toggleAttribute('data-error',error);
  }
  const track = action => trackTrade(root.dataset.tradeTool,action);
  for (const link of [join,member]) markQa(link);
  join.addEventListener('click',()=>track('signup'));
  member.addEventListener('click',()=>track('membership_open'));

  function paintAccess() {
    const registered = ['free','member'].includes(account.access);
    const guest = account.access==='guest';
    const available = (registered || guest) && Number.isSafeInteger(account.remaining);
    form.hidden = !available;
    gate.hidden = registered;
    gate.removeAttribute('aria-busy');
    if (!registered) select('gate-message').textContent = guestUnavailable
      ? t('游客试用暂不可用。免费注册后每天可运行 10 次。','Guest trials are temporarily unavailable. A free account includes 10 runs a day.')
      : account.access==='unverified' ? errorCopy.verification_required : guest && account.remaining===0
        ? t('今日游客试用已用完。免费注册或登录后，每天可运行 10 次。','You have used your guest runs today. Join free or sign in for 10 runs a day.')
        : t('无需登录即可试用。游客每日可运行 2 次，免费账户每日 10 次。','Try without signing in. Guests get 2 runs a day, and free accounts get 10.');
    quota.textContent = available && !guestUnavailable ? t(`今日余 ${account.remaining}／${account.limit} 次，UTC 零点重置。`,`${account.remaining} of ${account.limit} runs left today. Resets at midnight UTC.`) : '';
    const disabled = busy || loading || !available || guestUnavailable || account.remaining===0;
    run.disabled = disabled;
    example.disabled = disabled;
    for (const field of fields) field.disabled = disabled;
    csv.disabled = disabled || !lastRun;
    csv.hidden = account.access!=='member' || !lastRun;
    upgrade.hidden = account.access!=='free' || (!completed && account.remaining!==0);
    const plan = account.checkout;
    const valid = plan?.ready===true && plan.chain==='bsc' && plan.token==='USDT' && Number.isSafeInteger(plan.price_units) && plan.price_units>0 && Number.isSafeInteger(plan.days) && plan.days>0;
    member.hidden = !valid;
    select('price').textContent = valid ? t(`${plan.price_units/1e6} USDT／${plan.days} 天，BSC 网络，手动续期。`,`${plan.price_units/1e6} USDT for ${plan.days} days on BSC. Renew manually.`)
      : t('结账暂未开放。免费工具可按剩余次数继续使用。','Checkout is temporarily unavailable. You can continue with your remaining free runs.');
  }
  async function request(body, measure=false) {
    const response = await fetch('/api/trade-workbench',{
      cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(15000),
      ...(body ? {method:'POST',headers:{'Content-Type':'application/json',...(measure ? {'X-BPJ-Trade-Use':'1'} : {})},body:JSON.stringify(body)} : {}),
    });
    const data = await response.json().catch(()=>null);
    if (!response.ok||data?.ok!==true) throw Object.assign(Error(data?.code||'temporarily_unavailable'),{data});
    return data;
  }
  function hasAllowance(data) {
    return ['guest','free','member'].includes(data?.access) && Number.isSafeInteger(data.limit) && data.limit>0 &&
      Number.isSafeInteger(data.remaining) && data.remaining>=0 && data.remaining<=data.limit;
  }
  function showAllowance(data) {
    if (!hasAllowance(data)) throw Error('temporarily_unavailable');
    const {access,limit,remaining} = data;
    const checkout = data.checkout ?? (access==='guest' ? null : account.checkout);
    if (['free','member'].includes(account.access) && access==='guest') resetOutput(true);
    account = {access,limit,remaining,checkout};
    guestUnavailable = false;
  }
  async function refresh() {
    if (loading || busy) { refreshPending = true; return; }
    refreshPending = false;
    loading = true;
    if (account.access!=='checking') paintAccess();
    const currentEpoch = epoch;
    try {
      const data = await request();
      if (currentEpoch === epoch) showAllowance(data);
    } catch (error) {
      if (currentEpoch === epoch) fail(error);
    } finally {
      loading = false;
      paintAccess();
      if (refreshPending) refresh();
    }
  }
  function fail(error) {
    if (hasAllowance(error.data)) showAllowance(error.data);
    if (error.message==='sign_in_required'||error.message==='verification_required') {
      if (account.access!=='guest') resetOutput(true);
      account = {...checkingAccess,access:error.message==='sign_in_required' ? 'checking' : 'unverified'};
      refreshPending = error.message==='sign_in_required' && busy;
    }
    if (error.message==='rate_limited') account = {...account,remaining:0};
    guestUnavailable = error.message==='temporarily_unavailable' && (error.data?.access==='guest' || account.access==='guest');
    notice(error.message==='rate_limited' && account.access==='guest'
      ? t('今日游客试用已用完。登录或免费注册即可继续。','You have used today’s guest runs. Sign in or join free to continue.')
      : errorCopy[error.message]||errorCopy.temporarily_unavailable,true);
  }
  const readFields = ()=>Object.fromEntries(fields.map(field=>[field.name,field.type==='number' ? field.valueAsNumber : field.value]));
  function display(rows) {
    select('rows').replaceChildren(...rows.map(([cn,en,value])=>{
      const line = document.createElement('div'), label = document.createElement('dt'), item = document.createElement('dd');
      label.textContent = t(cn,en);
      item.textContent = Array.isArray(value) ? t(...value) : typeof value==='number' ? (value && Math.abs(value)<1e-8 ? value.toExponential(6) : number.format(value)) : value;
      line.append(label,item);
      return line;
    }));
    result.hidden = false;
    result.querySelector('h3').focus();
  }
  function clearResult() {
    result.hidden = true;
    select('rows').replaceChildren();
    lastRun = null;
    notice('');
  }
  function resetOutput(resetFields) {
    completed = false;
    exampleInput = null;
    clearResult();
    if (resetFields) for (const field of fields) field.value = '';
  }
  form.addEventListener('input',()=>{
    if (busy || account.remaining===0) return;
    exampleInput = null;
    clearResult();
  });
  example.addEventListener('click',()=>{
    if (busy) return;
    for (const field of fields) field.value = field.dataset.example;
    exampleInput = JSON.stringify(readFields());
    clearResult();
    notice(t('已填入虚构示例。生成结果会使用一次试用额度。','Example values filled. Getting a result uses one run.'));
  });
  async function calculate(exportFile=false, trusted=false) {
    if (busy || loading || !hasAllowance(account) || guestUnavailable || account.remaining===0 ||
        (exportFile && account.access!=='member')) return;
    const input = exportFile ? lastRun : readFields();
    if (!input) return;
    const isExample = !exportFile && exampleInput===JSON.stringify(input);
    const measure = trusted && !exportFile && !isExample && account.access!=='guest' && canMeasure();
    const currentEpoch = epoch;
    busy = true;
    paintAccess();
    notice(exportFile ? t('正在生成 CSV…','Generating the CSV…') : t('正在生成结果…','Getting results…'));
    try {
      const data = await request({id:root.dataset.tradeTool,input,...(exportFile ? {format:'csv',lang:zh?'zh':'en'} : {})},measure);
      if (currentEpoch !== epoch) return;
      showAllowance(data);
      if (exportFile) {
        const url = URL.createObjectURL(new Blob([data.csv],{type:'text/csv;charset=utf-8'}));
        const link = document.createElement('a');
        link.href = url;
        link.download = root.dataset.tradeTool+'.csv';
        link.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
        track('csv');
        notice(t('CSV 已生成。','CSV generated.'));
      } else {
        lastRun = input;
        completed = true;
        display(data.rows);
        track(account.access==='guest'?'guest_run':isExample?'example':'run');
        notice(account.access==='guest' && account.remaining===0
          ? t('结果已生成。免费注册后每天可运行 10 次。','Results ready. Join free for 10 runs a day.')
          : t('结果已生成。','Results ready.'));
      }
    } catch (error) { if (currentEpoch === epoch) fail(error); }
    finally {
      busy = false;
      paintAccess();
      if (refreshPending) refresh();
    }
  }
  form.addEventListener('submit',event=>{ event.preventDefault(); calculate(false,event.isTrusted); });
  csv.addEventListener('click',()=>calculate(true));
  document.addEventListener('visibilitychange',()=>{ if (document.visibilityState==='visible') refresh(); });
  document.addEventListener('bpj-account-state',event=>{
    const nextId = event.detail?.user?.id ?? null;
    if (nextId===accountId) return;
    const preserveGuestResult = !accountId && account.access==='guest';
    accountId = nextId;
    epoch++;
    if (preserveGuestResult) { lastRun = null; completed = false; }
    else resetOutput(true);
    account = checkingAccess;
    guestUnavailable = false;
    paintAccess();
    refresh();
  });
  refresh();
}
