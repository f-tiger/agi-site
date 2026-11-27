const root = document.querySelector('[data-trade-mcp-keys]');
const zh = document.documentElement.lang.startsWith('zh');
const t = (cn,en) => zh ? cn : en;
const $ = id => root.querySelector('#trade-mcp-'+id);
const keysApi = '/api/trade-mcp-keys';
const keyPattern = /^bpj_trade_[A-Za-z0-9_-]{43}$/;
const status = $('status');
const manager = $('manager');
const list = $('key-list');
const signIn = $('sign-in');
const retry = $('retry');
const secretInput = $('secret');
const secretPanel = $('secret-panel');
const createButton = $('create-button');
const downloads = new Set();
let accountId = null;
let activeKeys = 0;
let limit = 0;
let epoch = 0;
let busy = false;
let secret = '';

function message(text, error = false) {
  status.textContent = text;
  status.toggleAttribute('data-error',error);
}

function setBusy(value) {
  busy = value;
  $('label').disabled = value;
  createButton.disabled = value || activeKeys >= limit;
  retry.disabled = value;
  for (const button of list.querySelectorAll('button')) button.disabled = value;
}

function showSecret(value = '') {
  secret = value;
  secretInput.value = value;
  secretInput.type = 'password';
  $('reveal').textContent = t('显示密钥','Show key');
  $('reveal').setAttribute('aria-pressed','false');
  secretPanel.hidden = !value;
}

function signInAgain(text) {
  accountId = null;
  showSecret();
  manager.hidden = true;
  signIn.hidden = false;
  retry.hidden = true;
  list.replaceChildren();
  $('label').value = '';
  message(text);
}

function requestFailed(code, preserveSecret) {
  if (code === 'sign_in_required' || code === 'account_changed') {
    signInAgain(t('请确认当前 BPJ 账户并重新登录。','Check your BPJ account and sign in again.'));
    return;
  }
  const errors = {
    invalid_input:t('请检查密钥备注并重试。','Check your key label and try again.'),
    key_not_found:t('这把密钥已失效。请刷新列表。','This key is no longer active. Refresh the list.'),
    key_limit:t('已达到有效密钥上限。先撤销不用的密钥。','You reached the active key limit. Revoke an unused key first.'),
    rate_limited:t('操作过于频繁，请稍后重试。','Too many changes. Try again in a moment.'),
  };
  retry.hidden = false;
  const unavailable = preserveSecret
    ? t('新密钥已显示，可以先保存。密钥列表暂时无法更新。','Save the new key now. The key list is temporarily unavailable.')
    : t('密钥服务暂时不可用，请重新检查。','Key management is temporarily unavailable. Check again.');
  message(Object.hasOwn(errors,code) ? errors[code] : unavailable,true);
}

async function requestJson(path, body) {
  const response = await fetch(path,{
    credentials:'same-origin',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',
    signal:AbortSignal.timeout(15000),
    ...(body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {}),
  });
  const data = await response.json().catch(()=>null);
  if (!response.ok || data?.ok !== true) {
    throw Error(data?.code || (response.status === 401 ? 'sign_in_required' : 'temporarily_unavailable'));
  }
  return data;
}

function keyAction(label, action, id) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'trade-secondary';
  button.textContent = label;
  button.disabled = busy;
  button.addEventListener('click',()=>change({action,id}));
  return button;
}

function renderKeys({keys,limits}) {
  if (!Array.isArray(keys) || !Number.isSafeInteger(limits?.activeKeys) || !Number.isSafeInteger(limits?.ttlDays)) {
    throw Error('temporarily_unavailable');
  }
  const items = keys.map(key=>{
    const item = document.createElement('li');
    const heading = document.createElement('p');
    const label = document.createElement('strong');
    label.textContent = key.label;
    heading.append(label);
    const expiry = document.createElement('p');
    const time = new Date(key.expires*1000).toISOString().slice(0,10);
    expiry.textContent = t(`UTC 到期日 ${time}`, `Expires ${time} UTC`);
    const actions = document.createElement('div');
    actions.className = 'trade-actions';
    actions.append(keyAction(t('换新密钥','Rotate key'),'rotate',key.id),keyAction(t('撤销密钥','Revoke key'),'revoke',key.id));
    item.append(heading,expiry,actions);
    return item;
  });
  activeKeys = keys.length;
  limit = limits.activeKeys;
  $('limits').textContent = t(`${activeKeys} / ${limit} 把有效密钥，每把最长有效 ${limits.ttlDays} 天。`, `${activeKeys} of ${limit} active keys. Each key lasts up to ${limits.ttlDays} days.`);
  list.replaceChildren(...items);
  manager.hidden = false;
  signIn.hidden = true;
  retry.hidden = true;
}

async function check(quiet = false) {
  if (busy) return;
  const currentEpoch = epoch;
  const previous = accountId;
  setBusy(true);
  try {
    const {user} = await requestJson('/api/account');
    if (currentEpoch !== epoch) return;
    const id = typeof user?.id === 'string' && user.id ? user.id : null;
    if (!id) {
      signInAgain(t('请登录后创建或管理外贸 MCP 密钥。','Sign in to create or manage trade MCP keys.'));
      return;
    }
    if (id !== accountId) {
      showSecret();
      manager.hidden = true;
      list.replaceChildren();
      $('label').value = '';
    }
    accountId = id;
    const data = await requestJson(keysApi);
    if (currentEpoch !== epoch) return;
    renderKeys(data);
    if (!quiet || previous !== id) message(t('已登录，可以管理密钥。','Signed in. You can manage your keys.'));
  } catch (error) {
    if (currentEpoch === epoch) requestFailed(error.message,!!secret);
  } finally {
    if (currentEpoch === epoch) setBusy(false);
  }
}

async function change(body) {
  if (busy || !accountId) return;
  const {action} = body;
  if (action === 'rotate' && !confirm(t('换新会立即停用旧密钥。继续？','Rotation disables the old key immediately. Continue?'))) return;
  if (action === 'revoke' && !confirm(t('撤销后，此密钥将立即失效。继续？','Revocation disables this key immediately. Continue?'))) return;
  const currentEpoch = epoch;
  setBusy(true);
  try {
    const data = await requestJson(keysApi,{...body,account_id:accountId});
    if (currentEpoch !== epoch) return;
    if (action === 'revoke') {
      showSecret();
      message(t('密钥已撤销。','Key revoked.'));
    } else {
      if (!keyPattern.test(data.key || '')) throw Error('temporarily_unavailable');
      showSecret(data.key);
      $('label').value = '';
      message(t('新密钥已生成。请立即保存。','New key created. Save it now.'));
    }
    const refreshed = await requestJson(keysApi);
    if (currentEpoch === epoch) renderKeys(refreshed);
  } catch (error) {
    if (currentEpoch === epoch) requestFailed(error.message,!!secret);
  } finally {
    if (currentEpoch === epoch) setBusy(false);
  }
}

$('create').addEventListener('submit',event=>{
  event.preventDefault();
  if (activeKeys < limit) change({action:'create',label:$('label').value.trim()});
});
retry.addEventListener('click',()=>check());
$('clear').addEventListener('click',()=>{
  showSecret();
  message(t('已清除本页的密钥显示。','The key has been cleared from this page.'));
});
$('reveal').addEventListener('click',event=>{
  const reveal = secretInput.type === 'password';
  secretInput.type = reveal ? 'text' : 'password';
  event.currentTarget.setAttribute('aria-pressed',String(reveal));
  event.currentTarget.textContent = reveal ? t('隐藏密钥','Hide key') : t('显示密钥','Show key');
});
$('copy').addEventListener('click',async ()=>{
  if (!secret) return;
  const currentEpoch = epoch;
  try {
    await navigator.clipboard.writeText(secret);
    if (currentEpoch === epoch) message(t('已复制。请只粘贴到自己的 MCP 客户端。','Copied. Paste it only into your own MCP client.'));
  } catch {
    if (currentEpoch === epoch) message(t('无法自动复制。可显示密钥后手动复制。','Automatic copy is unavailable. Show the key to copy it manually.'),true);
  }
});
$('download').addEventListener('click',()=>{
  if (!secret) return;
  const config = {mcpServers:{'bpj-trade-tools':{url:'https://baipiaoji.com/api/trade-mcp',headers:{Authorization:'Bearer '+secret}}}};
  const url = URL.createObjectURL(new Blob([JSON.stringify(config,null,2)+'\n'],{type:'application/json'}));
  downloads.add(url);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'bpj-trade-mcp.private.json';
  link.click();
  setTimeout(()=>{URL.revokeObjectURL(url);downloads.delete(url);},3000);
});

addEventListener('focus',()=>check(true));
addEventListener('pageshow',event=>{if (event.persisted) check();});
addEventListener('pagehide',()=>{
  epoch++;
  accountId = null;
  showSecret();
  manager.hidden = true;
  list.replaceChildren();
  $('label').value = '';
  setBusy(false);
  for (const url of downloads) URL.revokeObjectURL(url);
  downloads.clear();
});
check();
