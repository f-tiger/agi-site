import {readFileSync} from 'node:fs';
import {safeJSON,template,escapeHTML} from './core.mjs';

export const EDITION='2026-10-01.2';
export const ROUTE='/studio/quote-builder';
const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
const core=readFileSync(new URL('./core.mjs',import.meta.url),'utf8').replace(/^export /gm,'');
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
if(/<\/script/i.test(core+app)||/<\/style/i.test(css))throw new Error('Unsafe embedded source');

export function renderQuoteStudio(lang='zh',{origin=''}={}){
  const zh=lang==='zh',e=escapeHTML;
  const title=zh?'免费互动报价生成器 — BPJ 报价工坊':'Free interactive quote builder — BPJ Quote Studio';
  const description=zh?'为视频、网站设计和内容服务创建互动报价。客户调整数量，复制需求摘要；免费分享链接或导出可离线使用的报价页，无需注册。':'Create interactive quotes for video, web design and content services. Clients adjust quantities and copy their scope. Share a link or export an offline quote page, free without an account.';
  const url=origin+(zh?'':'/en')+ROUTE;
  const guides={zh:[
    ['怎样把报价交给客户？','选择视频制作、网站设计或内容运营模板，填写自己的品牌、单价、基础费与交付说明，核对币种与默认数量。示例价格均为虚构，勾选确认后才能分享。复制客户链接，或下载独立 HTML 报价页，先自行打开检查，再发送给客户。客户打开后可以调整各项服务数量，查看服务小计、预估合计、首期款和余款。'],
    ['客户怎样把需求发回来？','客户可复制需求摘要粘贴到双方已有的聊天中，也可下载文本文件，手动发送给服务商。摘要包含所选服务、数量、单价、总额和交付说明。页面不会自动提交需求、创建订单或收取付款；双方仍需确认最终范围、排期、税费和总价。'],
    ['报价数据存在哪里？','计算和编辑在本机浏览器完成，不上传报价内容。只有点击保存本机草稿才会写入当前浏览器；换设备前请下载 JSON 备份。公开链接的片段中包含完整配置，任何拿到链接的人都可读取和修改，不能撤回或自动同步更新，请勿填写客户姓名、联系方式或其他敏感信息。修改报价后需要发送新链接。正式站点只统计匿名操作次数，不发送报价内容或链接，不使用 Cookie 或用户标识；统计不能证明真实客户交付。'],
    ['适用范围与限制是什么？','每份报价支持一至六项服务，数量为零至一千的整数，支持人民币、美元和欧元，金额保留两位小数；切换币种不会自动换算价格。首期比例可自定，税费与未列明费用不计入。BPJ 提供免费工具，不核验创建者身份，也不把报价作为合同或付款凭证。无需账号，下载的 HTML 文件可以离线打开。']
  ],en:[
    ['How do I send a quote to a client?','Start with a video, web design or content services template. Replace the fictional rates with your brand, services and delivery terms. Check currency and quantities, then confirm the quote is ready. Copy a client link or download the standalone HTML page. Review it before sending. Clients can adjust quantities and see line items, the total, initial payment and balance.'],
    ['How does the client send their scope back?','Clients copy the scope summary into your existing conversation, or download it as a text file and send it manually. It includes services, quantities, rates, totals and notes. Nothing is submitted automatically and no order or payment is created. Agree final scope, schedule, taxes and price with the provider.'],
    ['Where is quote data stored?','Editing and calculations run in your browser without uploading quote content. Local drafts are stored only when you choose Save. Download a JSON backup before changing devices. Shared URL fragments contain the full configuration: anyone holding the link can read or change it. Links cannot be revoked or updated remotely. Do not include client names, contact details or sensitive information. Send a new link after changing a quote. The official site counts anonymous actions without quote content, links, cookies or user identifiers. Counts do not prove real client handovers.'],
    ['What are the limits?','Use one to six services with whole-number quantities from zero to one thousand. CNY, USD and EUR support two decimal places; switching currency does not convert rates. Set an initial payment percentage if needed. Taxes and unlisted costs are excluded. BPJ provides the tool free, does not verify creators and does not turn quotes into contracts or payment receipts. No account is needed. Downloaded HTML pages work offline.']
  ]};
  const faq=guides[lang];
  const metadata=origin?`<link rel="canonical" href="${e(url)}"><link rel="alternate" hreflang="zh-Hans" href="${e(origin+ROUTE)}"><link rel="alternate" hreflang="en" href="${e(origin+'/en'+ROUTE)}"><link rel="alternate" hreflang="x-default" href="${e(origin+ROUTE)}"><script type="application/ld+json">${safeJSON({'@context':'https://schema.org','@type':'WebApplication',name:title,description,url,applicationCategory:'BusinessApplication',operatingSystem:'Web browser',inLanguage:lang,isAccessibleForFree:true,softwareVersion:EDITION})}</script>`:'';
  return `<!doctype html><html lang="${zh?'zh-CN':'en'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="${origin?'index,follow':'noindex,nofollow'}"><meta name="referrer" content="no-referrer"><meta name="quote-studio-release" content="${EDITION}"><meta name="description" content="${e(description)}"><title>${title}</title>${metadata}<style>${css}</style></head><body><div id="app"><main class="shell"><h1>${title}</h1><p>${description}</p>${faq.map(([q,a])=>`<h2>${q}</h2><p>${a}</p>`).join('')}<noscript>${zh?'请开启 JavaScript 后使用报价工具。':'Enable JavaScript to use the quote builder.'}</noscript></main></div><section class="guide" data-host-only><h2>${zh?'使用说明':'How it works'}</h2>${faq.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section><script type="application/json" id="initial-state">${safeJSON({mode:'builder',config:template('video',lang),guides,measure:origin==='https://baipiaoji.com'})}</script><script>${core}\n${app}</script></body></html>`;
}
