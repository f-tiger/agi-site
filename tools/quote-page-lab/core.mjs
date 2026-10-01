// Original BPJ implementation. All amounts are integer minor units (two decimals).
export const VERSION = 1;
export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function safeJSON(value) { return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }
export function parseMoney(value) {
  const text = String(value).trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text)) throw new Error('money');
  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export function validateConfig(raw) {
  const cleanText = (value, max, required = true) => {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim()) || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw new Error('text');
    return value.trim();
  };
  const integer = (v, max) => { if (!Number.isSafeInteger(v) || v < 0 || v > max) throw new Error('number'); return v; };
  if (!raw || raw.version !== VERSION || !['zh','en'].includes(raw.lang) || !['USD','EUR','CNY'].includes(raw.currency)) throw new Error('format');
  if (!Array.isArray(raw.items) || raw.items.length < 1 || raw.items.length > 6 || typeof raw.confirmed !== 'boolean') throw new Error('items');
  return { version: VERSION, lang: raw.lang, currency: raw.currency,
    brand: cleanText(raw.brand, 60), title: cleanText(raw.title, 90), note: cleanText(raw.note, 600, false),
    base: integer(raw.base, 999999999), deposit: integer(raw.deposit, 100), confirmed: raw.confirmed,
    items: raw.items.map(item => ({name: cleanText(item.name, 70), unit: cleanText(item.unit, 20), price: integer(item.price, 999999999), quantity: integer(item.quantity, 1000)})) };
}
export function calculate(raw, quantities) {
  const config = validateConfig(raw);
  if (!Array.isArray(quantities) || quantities.length !== config.items.length || quantities.some(q => !Number.isSafeInteger(q) || q < 0 || q > 1000)) throw new Error('quantity');
  const lines = config.items.map((item,i) => ({...item, quantity: quantities[i], total: item.price * quantities[i]}));
  const total = config.base + lines.reduce((sum,item) => sum + item.total, 0);
  if (!Number.isSafeInteger(total)) throw new Error('overflow');
  const deposit = Math.round(total * config.deposit / 100);
  return { lines, total, deposit, balance: total - deposit };
}
export function formatMoney(amount, config) {
  return new Intl.NumberFormat(config.lang === 'zh' ? 'zh-CN' : 'en-US', {style:'currency', currency:config.currency, minimumFractionDigits:2, maximumFractionDigits:2}).format(amount / 100);
}
export function encodeConfig(raw) {
  const bytes = new TextEncoder().encode(JSON.stringify(validateConfig(raw)));
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function decodeConfig(value) {
  if (typeof value !== 'string' || value.length > 14000 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('link');
  return validateConfig(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0)))));
}
export function template(kind = 'video', lang = 'zh') {
  const zh = lang === 'zh';
  const options = {
    video: { title: zh ? '下一组商品视频，由你来定' : 'Build your next product video package', items: [[zh?'短视频剪辑':'Short video edit',zh?'条':'video',12000,3],[zh?'额外画幅':'Extra aspect ratio',zh?'版':'version',3000,1],[zh?'额外修改轮次':'Extra revision round',zh?'轮':'round',4000,0]] },
    web: { title: zh ? '选好范围，再开始设计' : 'Choose the scope of your next website', items: [[zh?'页面设计':'Page design',zh?'页':'page',18000,3],[zh?'语言版本排版':'Additional language layout',zh?'版':'version',6000,0],[zh?'每月内容维护':'Monthly content maintenance',zh?'月':'month',8000,0]] },
    content: { title: zh ? '配好你的内容制作计划' : 'Build your content production plan', items: [[zh?'原创文章':'Original article',zh?'篇':'article',15000,2],[zh?'社媒图文':'Social media post',zh?'篇':'post',4000,4],[zh?'邮件内容':'Email content',zh?'封':'email',7000,0]] }
  };
  const selected = options[kind] || options.video;
  return {version:VERSION,lang,currency:zh?'CNY':'USD',brand:zh?'你的工作室':'Your studio',title:selected.title,
    note:zh?'示例价格，请替换为你的实际报价。请在此注明交付时间、包含的修改次数、素材责任与有效期。':'Illustrative prices: replace with your actual rates. Add delivery timing, included revisions, asset responsibilities and validity here.',
    base:0,deposit:30,confirmed:false,items:selected.items.map(([name,unit,price,quantity])=>({name,unit,price,quantity}))};
}
