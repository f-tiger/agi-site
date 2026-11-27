export const TRADE_PATH = '/studio/trade/';

const canadaSearch = 'https://ised-isde.canada.ca/app/ixb/cid-bdic/searchProduct.html';
const canadaReport = 'https://ised-isde.canada.ca/app/ixb/cid-bdic/productReport.html';
const euSearch = 'https://ted.europa.eu/en/advanced-search';
const euResults = 'https://ted.europa.eu/en/search/result';
const usSearch = 'https://sam.gov/opportunities';
const leadPath = '/studio/ai/trade-lead-priority';
const quotePath = '/studio/ai/trade-export-quote';
export const tradeTitle = {zh:'外贸找客与出口报价',en:'Find buyers and quote export orders'};

export function tradeCategoryGuide(BASE,lang) {
  const t = (zh,en) => lang === 'zh' ? zh : en;
  return `<section aria-labelledby="trade-category-guide"><h2 id="trade-category-guide">${t('从公开来源到报价','From a public source to a quote')}</h2>
    <p>${t('先在外贸工作台查进口商或采购公告，保存公司名称、市场、品类和来源链接。看到历史进口记录时，先核对这家公司是否仍采购你的品类。拿到采购公告后，核对截止时间、最小订量和投标资格。将资料导入线索工具，按优先级逐条跟进。','Find an importer or notice in the trade workbench and record the company, market, product and source link. For historical imports, confirm that the company still buys the product. For a tender, check the deadline, quantities and eligibility. Import the records and follow up in priority order.')}</p>
    <p>${t('收到询价后，按本次承担的运输、保险和其他卖方费用录入报价工具。把成本币换算为报价币，再扣除佣金和收款费，检查试报价能否达到你的目标利润。各笔订单的贸易术语与责任以双方确认的方案为准。','When an inquiry arrives, enter the freight, insurance and other seller costs for that order. Convert costs to the quote currency, account for commission and payment fees, and check whether a proposed price meets your target margin. Use the responsibilities agreed with the buyer.')}</p>
    <p><a href="${BASE+TRADE_PATH}">${tradeTitle[lang]}</a></p></section>`;
}

export function buildTradePages({layout,esc,BASE,LOCALE,write,pushPage}) {
  const lang = LOCALE.code;
  const t = (zh,en) => lang === 'zh' ? zh : en;
  const title = tradeTitle[lang];
  const url = BASE + TRADE_PATH;
  const description = t(
    '按 HS 编码查询加拿大进口商，搜索欧盟 TED 采购公告，整理买家线索，再算出口订单的最低报价和利润。',
    'Find Canadian importers by HS code, search EU TED tenders, prioritize buyer leads, and calculate your minimum export quote and profit.',
  );
  const leads = t('筛选买家线索','Prioritize buyer leads');
  const quote = t('计算出口报价','Calculate an export quote');
  const listing = t('制作跨境上新包','Prepare a cross-border listing');
  const workbench = t('使用 100 个外贸工具','Use 100 export trade tools');
  const links = [[leadPath,leads],[quotePath,quote],['/studio/listing-pack',listing],['/studio/trade-tools/',workbench]];
  const external = (href,label) => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
  const body = `<link rel="stylesheet" href="/studio-assets/trade.css?v=1">
  <main class="stage bpj-trade">
    <nav class="crumb" aria-label="${t('面包屑导航','Breadcrumb')}"><a href="${BASE}/studio/">${t('BPJ 自研工具','BPJ tools')}</a></nav>
    <header class="bpj-trade-heading"><h1>${title}</h1><p>${description}</p>
      <nav class="bpj-trade-quick" aria-label="${t('外贸工具快捷入口','Trade shortcuts')}">
        <a href="${BASE+leadPath}" data-bpj-next>${leads}</a><a href="${BASE+quotePath}" data-bpj-next>${quote}</a>
      </nav>
    </header>
    <div class="bpj-trade-layout">
      <section class="bpj-trade-sources" aria-labelledby="trade-sources">
        <h2 id="trade-sources">${t('找客源','Find buyers')}</h2>
        <section class="bpj-trade-source">
          <h3>${t('加拿大进口商','Canadian importers')}</h3>
          <p>${t('在加拿大政府名录中按 HS 编码查看具名进口商。历史记录可能包含报关代理，跟进前应核对企业和品类。','Use the Canadian government directory to find named importers by HS code. Historical records may include customs brokers. Confirm the company and product before following up.')}</p>
          <form action="${canadaReport}" method="get" target="_blank" rel="noopener noreferrer" data-trade-canada>
            <label for="trade-hs-code">${t('6 位 HS 商品编码','Six-digit HS product code')}</label>
            <div class="bpj-trade-fields">
              <input id="trade-hs-code" name="hsCode" type="text" inputmode="numeric" required pattern="[0-9]{6}" maxlength="6" placeholder="392410" autocomplete="off">
              <input type="hidden" name="lang" value="eng">
              <button type="submit">${t('查看官方名单','Open the importer report')}</button>
            </div>
          </form>
          <div class="bpj-trade-source-links">
            ${external(canadaSearch+'?lang=eng',t('按商品名找编码','Look up a product code'))}
            ${external(canadaReport+'?hsCode=392410&lang=eng',t('示例：塑料餐厨具 392410','Example: plastic tableware 392410'))}
          </div>
        </section>
        <section class="bpj-trade-source">
          <h3>${t('欧盟采购公告','EU public tenders')}</h3>
          <p>${t('用产品关键词搜索欧盟 TED 公告，查看发布买家与最晚分标截止日。请在原公告核对对应分标、截止时间和投标资格。','Search EU TED notices by product keyword for the contracting buyer and latest lot deadline. Check the original notice for the relevant lot, exact deadline and eligibility.')}</p>
          <form action="${euResults}" method="get" target="_blank" rel="noopener noreferrer" data-trade-ted>
            <label for="trade-ted-query">${t('产品关键词（英文或当地语言）','Product keywords (English or local language)')}</label>
            <div class="bpj-trade-fields">
              <input id="trade-ted-query" name="FT" type="search" maxlength="64" minlength="2" required placeholder="furniture" autocomplete="off">
              <input type="hidden" name="search-scope" value="ACTIVE">
              <button type="submit">${t('搜索欧盟采购','Search EU tenders')}</button>
            </div>
          </form>
          <p data-trade-status role="status"></p>
          <ul data-trade-results hidden></ul>
          <a href="${euSearch}" target="_blank" rel="noopener noreferrer" data-trade-ted-fallback>${t('打开 TED 官方搜索','Open the official TED search')}</a>
        </section>
        <section class="bpj-trade-source bpj-trade-source-last">
          <h3>${t('美国政府采购','US government procurement')}</h3>
          <p>${t('在 SAM.gov 按产品关键词或 NAICS 行业编码找采购机会。报名与投标条件以公告为准。','Search SAM.gov by product keyword or NAICS code. The notice lists registration and eligibility requirements.')}</p>
          ${external(usSearch,t('打开 SAM.gov 采购搜索','Open SAM.gov opportunities'))}
        </section>
      </section>
      <aside class="bpj-trade-tools" aria-labelledby="trade-next">
        <h2 id="trade-next">${t('从线索到报价','From shortlist to quote')}</h2>
        <a href="${BASE+leadPath}" data-bpj-next><strong>${leads}</strong><span>${t('导入 CSV 或 JSON，按市场、品类、采购信号和截止日排优先级。','Rank CSV or JSON leads by market, product, buying signal and deadline.')}</span></a>
        <a href="${BASE+quotePath}" data-bpj-next><strong>${quote}</strong><span>${t('填数量、成本、汇率与费用，计算目标利润下的最低单价。','Enter quantities, costs, exchange rates and fees to find the unit price that meets your target margin.')}</span></a>
        <a href="${BASE}/studio/listing-pack" data-bpj-next><strong>${listing}</strong><span>${t('复核英文草稿和商品事实，导出上新资料。','Review English copy against product facts and export your listing files.')}</span></a>
        <a href="${BASE}/studio/trade-tools/" data-bpj-next><strong>${workbench}</strong><span>${t('试算关务、退税、外汇和单证，访客每天共 2 次。','Try customs, tax refunds, FX and document tools with 2 guest runs a day across the workbench.')}</span></a>
        <p>${t('网页筛选和报价在浏览器本地运行。搜索欧盟公告时，产品关键词会发送至 TED。','Lead ranking and quote calculations run locally in your browser. EU tender searches send the product keywords to TED.')}</p>
      </aside>
    </div>
  </main><script type="module" src="/studio-assets/trade.mjs?v=2"></script>`;
  const itemList = links.map(([path,label],index) => ({
    '@type':'ListItem', position:index+1, name:label, url:BASE+path,
  }));
  write('studio/trade/index.html',layout({
    title:title+' · BPJ',description,path:TRADE_PATH,body,wide:true,
    schema:[{'@context':'https://schema.org','@type':'CollectionPage',name:title,url,description,inLanguage:lang,
      mainEntity:{'@type':'ItemList',itemListElement:itemList}}],
  }));
  write('studio/trade/index.md',`# ${title}\n\n${description}\n\n${links.map(([path,label])=>`- [${label}](${BASE+path})`).join('\n')}\n\n## ${t('公开买家和采购来源','Public buyer and procurement sources')}\n\n- [${t('加拿大政府进口商名录','Canadian Importers Database')}](${canadaSearch}?lang=eng)\n- [TED](${euSearch})\n- [SAM.gov](${usSearch})\n`);
  pushPage(url,'0.9');
}
