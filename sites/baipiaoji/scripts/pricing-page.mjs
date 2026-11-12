import {PLAN as CLOUD} from '../lib/membership.js';
import {PLAN as CODEX} from '../lib/codex-efficiency.js';

export function affiliateDisclosure(zh, enabled) {
  if (enabled) return zh
    ? '部分外部链接为合作推广链接，本站可能获得佣金；佣金不影响收录、判定与排序。价格与福利以厂商实时条款为准。'
    : 'Some external links are affiliate links and may earn BPJ a commission. Commission does not affect inclusion, verdicts or ranking. Prices and offers follow the vendor’s current terms.';
  return zh
    ? '目录当前未启用联盟返佣链接。外部工具由各自厂商提供，价格与福利以其实时条款为准。'
    : 'Affiliate links are not currently enabled in the directory. External tools are provided by their vendors; prices and offers follow their current terms.';
}

// One public pricing summary for readers and agents. Checkout availability is
// checked on the existing product pages; visiting pricing never creates orders.
export function pricingPage({zh, BASE, NAME, rail, esc, affiliateEnabled}) {
  const t=(cn,en)=>zh?cn:en;
  const title=t('工具与会员价格','Tools and membership pricing');
  const description=t(
    `本地 PDF、图片工具和公开数据免费。付费云项目 ${CLOUD.price_units/1e6} USDT / ${CLOUD.days} 天，不自动续费。比较 BPJ 会员、第三方工具购买与独立广告位；支付可用状态在各自页面实时核验。`,
    `Local PDF and image tools and public data are free. Paid cloud projects cost ${CLOUD.price_units/1e6} USDT per ${CLOUD.days} days without automatic renewal. Compare BPJ membership, third-party purchases and labelled ad placements; check payment availability on each product page.`);
  const free=[
    [t('本地 PDF、图片工具','Local PDF and image tools'),t('免注册处理与导出；已有免费功能继续免费。','Process and export without signup. Existing free features stay free.'),'/studio/',t('打开免费工具','Open free tools')],
    [t('免费账户与会员工具','Free account and member tools'),t('关注清单同步、订阅体检、API 计算器等；注册不等于购买云项目。','Synced followed tools, subscription audit, API calculator and more. Signup does not purchase cloud projects.'),'/account',t('查看免费账户','View free account')],
    [t('公开数据、API 与 MCP','Public data, API and MCP'),t('带来源的额度记录与公开接口免费；数据以 CC BY 4.0 开放，署名回链即可商用。','Sourced allowance records and public interfaces are free. Data is CC BY 4.0: commercial use with attribution and a link back.'),'/developers',t('查看数据与接口','View data and APIs')],
  ];
  const offers=[
    [t('BPJ 云项目会员','BPJ cloud project membership'),`${CLOUD.price_units/1e6} USDT / ${CLOUD.days} ${t('天','days')}`,
      t(`适合需要跨设备保存与版本恢复的用户。${CLOUD.workspaces} 个工作区、每项目最近 ${CLOUD.versions} 个版本；每版本 ${CLOUD.max_bytes/1024} KiB、总计 ${CLOUD.total_bytes/1048576} MiB。不自动续费；不包含第三方工具订阅。`,`For saving across devices and restoring versions. ${CLOUD.workspaces} workspaces, latest ${CLOUD.versions} versions per project; ${CLOUD.max_bytes/1024} KiB per version and ${CLOUD.total_bytes/1048576} MiB total. No automatic renewal. Third-party subscriptions are separate.`),
      '/members',t('查看会员权益与支付状态','View membership and payment availability')],
    ['Codex Efficiency Pro',`${CODEX.price_usdt} USDT / ${CODEX.days} ${t('天','days')}`,
      t(`独立产品：每周期 ${CODEX.projects} 个项目、${CODEX.evaluations} 次评估、${CODEX.history_days} 天结果历史，不含模型额度。免费 Lite 可用；Pro 默认未开售，当前状态见产品页。不包含在云项目会员内。`,`Separate product: ${CODEX.projects} projects and ${CODEX.evaluations} evaluations per period, ${CODEX.history_days}-day result history, with no model credits. Free Lite is available; Pro checkout defaults closed. Check the product page for current availability. Not included in cloud membership.`),
      '/studio/codex-efficiency',t('免费安装与查看 Pro 状态','Install free Lite and check Pro status')],
  ];
  const never=zh
    ? ['付费收录、目录付费排序或付费「已核实」徽章。','让联盟佣金或广告合作影响免费额度判定与目录排序。']
    : ['Paid inclusion, paid directory ranking or paid “verified” badges.','Affiliate commission or advertising influencing free-tier verdicts or directory ranking.'];
  const body=`${rail}
<style>
.bpj-pricing .lt-scroll table{min-width:0;table-layout:fixed}
.bpj-pricing .lt-scroll th:first-child,.bpj-pricing .lt-scroll th:last-child{width:25%}
.bpj-pricing td a{display:inline-flex;align-items:center;min-height:44px;color:#244ed8;text-decoration:underline;text-underline-offset:3px}
@media(max-width:640px){
  .bpj-pricing .lt-scroll{overflow:visible}
  .bpj-pricing .lt-scroll table,.bpj-pricing .lt-scroll tbody,.bpj-pricing .lt-scroll tr,.bpj-pricing .lt-scroll td{display:block;width:100%;box-sizing:border-box}
  .bpj-pricing .lt-scroll thead{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
  .bpj-pricing .lt-scroll tr{padding:14px 0;border-bottom:1px solid #c9d4e8}
  .bpj-pricing .lt-scroll td{padding:4px 0;border:0}
  .bpj-pricing .lt-scroll td:first-child{font-size:16px}
}
</style>
<main class="stage bpj-pricing">
  <nav class="crumb"><a href="${BASE}/">${esc(NAME)}</a><i>/</i><span>${t('定价','Pricing')}</span></nav>
  <header class="hero"><div class="hero-inner"><h1>${title}</h1><p class="answer">${esc(description)}</p></div></header>
  <section class="limits-table" id="free">
    <h2 class="group-title">${t('先用免费功能','Start free')}</h2>
    <div class="lt-scroll"><table><thead><tr><th>${t('能力','Capability')}</th><th>${t('包含什么','Included')}</th><th>${t('入口','Start here')}</th></tr></thead><tbody>
      ${free.map(([name,value,url,label])=>`<tr><td><b>${esc(name)}</b></td><td>${esc(value)}</td><td><a href="${BASE}${url}">${esc(label)}</a></td></tr>`).join('')}
    </tbody></table></div>
  </section>
  <section class="limits-table" id="bpj-products">
    <h2 class="group-title">${t('需要额外能力时，查看 BPJ 付费产品','BPJ products for additional needs')}</h2>
    <div class="lt-scroll"><table><thead><tr><th>${t('产品与基础价','Product and base price')}</th><th>${t('权益与边界','Included and limits')}</th><th>${t('详情与状态','Details and availability')}</th></tr></thead><tbody>
      ${offers.map(([name,price,value,url,label])=>`<tr><td><b>${esc(name)}</b><p>${esc(price)}</p></td><td>${esc(value)}</td><td><a data-pricing-product href="${BASE}${url}">${esc(label)}</a></td></tr>`).join('')}
    </tbody></table></div>
    <p class="money-lede">${t('付款前在产品页确认开售状态、适用网络和精确金额。BSC USDT 订单另加不足 0.01 USDT 的识别尾数与网络手续费；手动续费，不自动扣款。','Before paying, confirm availability, the supported network and the exact amount on the product page. BSC USDT orders add a matching fraction below 0.01 USDT and network fees. Renewal is manual, without automatic charges.')}</p>
  </section>
  <section class="limits-table" id="external-tools">
    <h2 class="group-title">${t('购买第三方工具','Buying third-party tools')}</h2>
    <p>${t('先比较免费与付费档是否满足你的任务，再到厂商官网购买。第三方订阅由厂商定价、收款、交付与处理退款，不包含在 BPJ 会员内。','Compare free and paid tiers against your task, then purchase on the vendor’s official site. Vendors set prices, collect payment, deliver subscriptions and handle refunds. These subscriptions are not included in BPJ membership.')}</p>
    <p>${esc(affiliateDisclosure(zh,affiliateEnabled))}</p>
    <p><a href="${BASE}/upgrade/">${t('对比第三方工具升级档位','Compare third-party upgrades')} →</a></p>
  </section>
  <section class="limits-table" id="sponsorship">
    <h2 class="group-title">${t('厂商：独立广告位','For vendors: labelled ad placements')}</h2>
    <p>${t('广告与工具目录分开并明确标注。费用购买指定位置和投放期限，不购买目录收录、排名或核实结论，也不保证点击和销售。实时价格、可用位置、支付方式与投放条款见投放页。','Ads are labelled and separated from the tool directory. Payment buys a specified placement and term, without buying inclusion, ranking or verification, and without guaranteed clicks or sales. See the advertising page for current pricing, inventory, payment methods and terms.')}</p>
    <p><a data-pricing-product href="${BASE}/advertise">${t('查看广告位与支付状态','View placements and payment availability')} →</a> · <a href="${BASE}/submit">${t('免费提交工具','Submit a tool for free')}</a></p>
  </section>
  <section class="limits-table">
    <h2 class="group-title">${t('不出售的权益','Never for sale')}</h2>
    <ul class="pc-duties">${never.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
  </section>
  <section class="limits-table">
    <details><summary>${t('未来数据服务与已有数据授权码','Planned data services and existing data-service keys')}</summary>
    <p>${t('全量监控、历史数据导出与更高 MCP 配额尚未开放购买，价格未定，不属于上述会员权益。免费 webhook 可监控 3 个工具。','Full-catalog monitoring, historical data export and higher MCP quotas are not available for purchase, have no set price and are not included in the memberships above. Free webhooks can monitor 3 tools.')} <a href="${BASE}/watch">${t('查看免费监控','View free monitoring')}</a></p>
    <p>${t('以下仅校验数据服务授权码；云项目会员请通过会员页管理。','This checks data-service keys only. Manage cloud project membership on the membership page.')}</p>
    <div class="pc-form"><label><span>${t('数据服务授权码','Data-service key')}</span><input type="text" id="licKey" placeholder="bpj.…" autocomplete="off" spellcheck="false"></label></div>
    <div class="ask-hint"><button type="button" id="licGo">${t('校验','Check')}</button></div>
    <p id="licOut" class="sub-note" aria-live="polite"></p>
    </details>
  </section>
</main>
<script>
(function(){
  var ZH=${zh},k=document.getElementById('licKey'),go=document.getElementById('licGo'),out=document.getElementById('licOut');
  var MSG={disabled:ZH?'此数据服务尚未开放；云项目会员状态请查看会员页。':'This data service is not on sale. Check the membership page for cloud project availability.',
    not_configured:ZH?'数据服务暂不可用。':'The data service is unavailable.',missing:ZH?'先填授权码。':'Enter a key first.',
    malformed:ZH?'这不是本站签发的码。':'That is not a key issued here.',bad_signature:ZH?'授权码校验未通过。':'Key verification failed.',expired:ZH?'这枚码已过期。':'That key has expired.'};
  go.addEventListener('click',function(){
    out.textContent=ZH?'校验中…':'Checking…';
    fetch('/api/entitlement',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:k.value})})
      .then(function(r){return r.json()}).then(function(j){
        if(j.ok){try{localStorage.setItem('bpj_tier',j.tier)}catch(e){}out.textContent=(ZH?'已解锁：':'Unlocked: ')+j.tier+(ZH?'，有效至 ':', valid until ')+j.expires;return;}
        out.textContent=MSG[j.reason]||(ZH?'校验未通过。':'Check failed.');
      }).catch(function(){out.textContent=ZH?'网络错误，稍后再试。':'Network error, try again.'});
  });
})();
</script>`;
  return {title:`${title} - ${NAME}`,description,body};
}

export function pricingMarkdown({name,baseUrl,affiliateEnabled}) {
  return `# Pricing — ${name} (baipiaoji.com)

## Free (permanent)
- Local PDF and image processing and export require no signup. Existing free features stay free.
- Sourced free-tier records, JSON API and MCP are free. Data licence: CC BY 4.0, with attribution and a link back.
- Free accounts: synced followed tools, free member tools and packs. Signup alone does not grant paid cloud access. No email alerts.
- Tools: ${baseUrl}/studio/ ; account: ${baseUrl}/account ; public interfaces: ${baseUrl}/developers

## BPJ cloud project membership
- Base price: ${CLOUD.price_units/1e6} USDT / ${CLOUD.days} days; manual renewal, no automatic charges.
- Includes: ${CLOUD.workspaces} workspaces, latest ${CLOUD.versions} versions per project; ${CLOUD.max_bytes/1024} KiB per version and ${CLOUD.total_bytes/1048576} MiB total.
- Third-party subscriptions and Codex Efficiency Pro are separate.
- Availability is checked live on the product page; a published price does not mean checkout is currently open.
- BSC USDT orders add a matching fraction below 0.01 USDT plus network fees. Confirm the exact amount before paying.
- Details, payment and terms: ${baseUrl}/members

## Codex Efficiency
- Free Lite: local usage review and general rules. One complete trial evaluation per account.
- Separate Pro base price: ${CODEX.price_usdt} USDT / ${CODEX.days} days; ${CODEX.projects} projects, ${CODEX.evaluations} evaluations per period and ${CODEX.history_days}-day result history. No model credits or automatic renewal.
- Pro checkout defaults closed; current availability and exact payment terms: ${baseUrl}/studio/codex-efficiency

## Third-party purchases
- Vendors set prices, collect payment, deliver subscriptions and handle refunds.
- ${affiliateDisclosure(false,affiliateEnabled)}
- Compare upgrades: ${baseUrl}/upgrade/

## Labelled advertising
- Separate from directory inclusion and ranking. Payment buys a specified placement and term; no guaranteed clicks or sales.
- Current price, inventory, payment availability and terms: ${baseUrl}/advertise

## Planned data services — not on sale
- Full-catalog monitoring, historical data export and higher MCP quotas have no set price and are not included in membership.
- Free webhook monitoring of up to 3 tools: ${baseUrl}/watch

## Never sold
- Paid inclusion, directory ranking or verified badges; commission influencing verdicts or directory ranking.

Details: ${baseUrl}/pricing
`;
}
