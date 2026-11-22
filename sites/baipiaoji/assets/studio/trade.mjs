const zh = document.documentElement.lang.startsWith('zh');
const t = (cn,en) => zh ? cn : en;
const form = document.querySelector('[data-trade-ted]');
const query = form.querySelector('input[type=search]');
const submit = form.querySelector('button');
const status = document.querySelector('[data-trade-status]');
const results = document.querySelector('[data-trade-results]');
const official = document.querySelector('[data-trade-ted-fallback]');
const qa = ['__ci','__probe','__qa','qa','ci'].some(key => new URLSearchParams(location.search).has(key));

function track(source) {
  if (qa || navigator.webdriver || navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
  window.bpjEv?.('home','/discovery/trade-source/' + source);
}

document.querySelector('[data-trade-canada]').addEventListener('submit', () => track('canada'));

async function copyLead(opportunity, product, feedback) {
  const record = {
    company: opportunity.buyer,
    country: opportunity.country ?? '',
    product,
    signal: 'open_tender',
    source_url: opportunity.url,
    response_by: opportunity.deadline,
  };
  const payload = JSON.stringify([record], null, 2);
  const countryNote = record.country ? '' : t(' 请先补齐两位国家代码。',' Fill in the two-letter country code.');
  feedback.replaceChildren();
  try {
    await navigator.clipboard.writeText(payload);
    feedback.textContent = t('已复制。粘贴到「筛选买家线索」工具。','Copied. Paste it into Prioritize buyer leads.') + countryNote;
  } catch {
    feedback.textContent = t('手动复制这条线索。','Copy this lead manually.') + countryNote;
    const field = document.createElement('textarea');
    field.readOnly = true;
    field.rows = 4;
    field.setAttribute('aria-label', t('买家线索 JSON','Buyer lead JSON'));
    field.value = payload;
    feedback.append(field);
    field.select();
  }
}

function resultRow(opportunity, product) {
  const row = document.createElement('li');
  const title = document.createElement('a');
  if (!/^\d{1,9}-20\d{2}$/.test(opportunity.id)) throw new Error('Invalid TED notice');
  const officialUrl = 'https://ted.europa.eu/en/notice/' + opportunity.id + '/html';
  title.href = officialUrl;
  title.target = '_blank';
  title.rel = 'noopener noreferrer';
  title.textContent = opportunity.title;
  const info = document.createElement('p');
  const buyer = [opportunity.buyer, opportunity.country].filter(Boolean).join(' · ');
  const deadline = t('最晚分标截止','Latest lot deadline') + ' ' + opportunity.deadline;
  info.textContent = [buyer, deadline].filter(Boolean).join(' · ');
  row.append(title,info);
  if (opportunity.buyer) {
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'bpj-trade-copy';
    copy.textContent = t('复制待核验线索','Copy lead for review');
    const feedback = document.createElement('p');
    feedback.setAttribute('role','status');
    copy.addEventListener('click', () => copyLead({...opportunity, url:officialUrl},product,feedback));
    row.append(copy,feedback);
  }
  return row;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  const product = query.value.trim();
  results.hidden = true;
  results.replaceChildren();
  if (product.length < 2) {
    status.textContent = t('请输入至少 2 个字符的产品关键词。','Enter at least two characters.');
    return;
  }
  const officialResults = new URL(form.action);
  officialResults.search = new URLSearchParams({FT:product,'search-scope':'ACTIVE'});
  official.href = officialResults.href;
  submit.disabled = true;
  query.readOnly = true;
  status.textContent = t('正在搜索 TED…','Searching TED…');
  try {
    const response = await fetch('/api/trade-opportunities?' + new URLSearchParams({q:product}), {
      signal: AbortSignal.timeout(12000),
    });
    if (response.status === 400) {
      status.textContent = t('请输入 2–64 个字符的产品词组，可用字母、数字、空格、连字符和撇号。','Enter a product phrase of 2–64 characters using letters, numbers, spaces, hyphens or apostrophes.');
      return;
    }
    if (!response.ok) throw new Error('TED unavailable');
    const {opportunities} = await response.json();
    const rows = opportunities.map(opportunity => resultRow(opportunity,product));
    track('ted');
    if (!rows.length) {
      status.textContent = t('暂未找到带有效截止日期的匹配公告。可以缩短关键词，或打开 TED 官方搜索。','No matching notices with current deadlines. Try a shorter phrase or open the official TED search.');
      return;
    }
    results.replaceChildren(...rows);
    results.hidden = false;
    status.textContent = t(`找到 ${rows.length} 条近期公告。`,`Found ${rows.length} recent notices.`);
  } catch {
    status.textContent = t('暂时无法查询。请使用下方 TED 官方搜索。','Search is temporarily unavailable. Use the official TED search below.');
  } finally {
    submit.disabled = false;
    query.readOnly = false;
  }
});
