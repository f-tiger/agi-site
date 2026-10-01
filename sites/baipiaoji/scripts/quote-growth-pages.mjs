import {escapeHTML as e} from '../../../tools/quote-page-lab/core.mjs';
export const VIDEO_QUOTE_ROUTE='/studio/video-quote';
export function quoteVideoEntry(BASE,zh){return `<section class="studio-info quote-acquisition"><p class="studio-meta">${zh?'接单前先确认范围':'BEFORE YOU START A CLIENT PROJECT'}</p><h2>${zh?'客户说“再加一版”，报价会怎样变？':'“Can we add another version?” Show the new estimate.'}</h2><p>${zh?'把剪辑条数、额外画幅和修改轮次拆开，让客户自己选范围，再带着费用明细回来沟通。':'Separate edits, extra formats and revision rounds. Let clients choose their scope and bring an itemized estimate back to the conversation.'}</p><a class="studio-button primary" href="${BASE}${VIDEO_QUOTE_ROUTE}">${zh?'试用视频接单报价模板':'Try the video quote template'}</a></section>`;}
export function buildQuoteGrowth({layout,railOf,BASE,LOCALE,site,write,pushPage,faqLd}){
 const zh=LOCALE.code==='zh',lang=zh?'zh':'en',url=BASE+VIDEO_QUOTE_ROUTE;
 const title=zh?'视频剪辑报价模板：让客户自选条数、画幅与修改轮次':'Video editing quote template: edits, formats and revisions';
 const description=zh?'免费互动视频报价模板。用虚构示例先体验客户如何选择剪辑条数、额外画幅和修改轮次，再填入你的价格，分享报价链接与需求摘要。无需注册。':'Try a free interactive video editing quote template. Clients choose edits, extra formats and revision rounds. Replace fictional sample rates with your own and share a link. No signup.';
 const demo=BASE+'/studio/quote-builder?template=video&demo=1&source=video-guide',start=BASE+'/studio/quote-builder?template=video&source=video-guide';
 const sections=zh?[
  ['报价前，先问清这六件事','成片条数与每条时长；原始素材总量和整理责任；需要的画幅与字幕语言；包含的修改轮次；首稿与反馈时间；交付格式及素材权利。数量相同不代表工作量相同，先确认这些条件，再填写单价。'],
  ['把“再加一点”变成具体选项','模板把短视频剪辑、额外画幅、额外修改轮次分为三项。基础服务费可以覆盖一次性的项目准备工作，交付说明可以写清每条时长、原始素材上限和已包含的修改次数。不要同时在基础价和附加项中重复计算同一项工作。'],
  ['演示：从三条增加到五条','纯算术示例：剪辑每条 120，额外画幅每版 30，基础费为零。三条加一版为 390；五条加一版为 630。这里的金额只用于演示，不代表市场价或推荐收费。实际项目要用你自己的成本、工作量与报价替换。'],
  ['怎样交给客户','先体验客户页，调整数量观察明细。返回编辑后，填写自己的品牌、单价与交付说明，核对币种并勾选确认。复制客户链接发送给对方；客户复制需求摘要回到已有聊天，双方再确认最终范围、排期与总价。无需客户注册，也不会自动下单。'],
  ['什么时候用表格，什么时候用这个模板','还在估算人工时、利润和复杂费用时，表格更灵活。服务已拆成明确选项、希望客户自己调整数量时，可以用互动报价。需要电子签名、开票、收款或身份核验时，请使用具备这些能力的服务；本工具不提供这些功能。']
 ]:[
  ['Ask six questions before setting a rate','Confirm the number and length of finished edits, source-footage volume and preparation, aspect ratios and subtitle languages, included revision rounds, first-draft and feedback timing, and delivery formats and asset rights. Two projects with the same number of videos can require very different amounts of work.'],
  ['Turn “one more thing” into an explicit option','The template separates short-video edits, extra aspect ratios and extra revision rounds. A base fee can cover one-time project setup. Use delivery notes to define finished length, source-footage limits and included revisions. Do not charge the same work in both the base fee and an add-on.'],
  ['Example: three edits become five','Fictional arithmetic example: 120 per edit, 30 per extra format and no base fee. Three edits plus one format total 390; five edits plus one format total 630. These are demonstration numbers, not market benchmarks or recommended rates. Replace them with your own project rates and scope.'],
  ['Hand it to the client','Try the client view and change quantities to inspect the breakdown. Return to the editor, enter your brand, rates and delivery notes, check currency and confirm readiness. Copy the link to your existing client conversation. The client copies a scope summary back for mutual confirmation. No client account is needed and no order is submitted.'],
  ['Spreadsheet or interactive quote?','A spreadsheet is more flexible while you are estimating labor, margin and complex costs. An interactive quote fits clearly defined service options that clients can adjust by quantity. For electronic signatures, invoices, payments or identity verification, choose a service that actually provides those features; this tool does not.']
 ];
 const faqs=zh?[
  {q:'这是视频剪辑市场价计算器吗？',a:'不是。模板只按你输入的价格和数量计算。示例金额是虚构的，不建议直接作为实际收费。'},
  {q:'报价链接能撤回或更新吗？',a:'不能。链接片段含完整配置，任何持有链接的人都能读取或修改。不要填写客户隐私信息；修改报价后需要重新发送链接。'},
  {q:'客户可以直接付款或签约吗？',a:'不能。页面提供预估与需求摘要，不生成订单、合同或付款凭证，税费和未列明费用也不计入。'},
 ]:[
  {q:'Is this a video-editing market-rate calculator?',a:'No. It calculates your rates and quantities. Sample amounts are fictional and should not be used as a recommended price.'},
  {q:'Can I revoke or update a shared quote?',a:'No. The URL fragment contains the entire configuration, and anyone with it can read or change it. Omit private client details and send a new link after changing the quote.'},
  {q:'Can clients pay or sign a contract here?',a:'No. This provides an estimate and scope summary, not an order, contract or payment receipt. Taxes and unlisted costs are excluded.'},
 ];
 const body=`${railOf()}<main class="stage studio-main" id="main-content"><nav class="crumb"><a href="${BASE}/studio/">${zh?'BPJ 自研工具':'Built by BPJ'}</a><i>/</i><span>${zh?'视频接单报价':'Video quote template'}</span></nav><header class="studio-hero"><span class="studio-sign">${zh?'免费 · 无需注册 · 本机计算':'FREE · NO SIGNUP · LOCAL CALCULATIONS'}</span><h1>${title}</h1><p>${zh?'让客户先选好范围，再讨论总价。无需填表，先试一份可操作的示例。':'Let clients choose the scope before you agree the price. Try a working example before filling anything in.'}</p><div class="studio-actions"><a class="studio-button primary" href="${demo}">${zh?'先试客户报价页':'Try the client quote'}</a><a href="${start}">${zh?'使用模板，填我的价格':'Use template with my rates'}</a></div></header><section class="studio-info"><h2>${zh?'从模糊要求到明确交付':'From a vague request to an explicit scope'}</h2><table><thead><tr><th>${zh?'原来的说法':'The request'}</th><th>${zh?'报价中明确什么':'Make this explicit'}</th></tr></thead><tbody><tr><td>${zh?'做一组短视频':'A batch of short videos'}</td><td>${zh?'成片条数、每条时长与素材上限':'Edit count, finished length and footage limits'}</td></tr><tr><td>${zh?'再加几个平台版本':'A few more platform versions'}</td><td>${zh?'额外画幅数量、字幕与重新排版要求':'Extra formats, subtitles and layout changes'}</td></tr><tr><td>${zh?'改到满意为止':'Revise until it feels right'}</td><td>${zh?'已含修改轮次、额外轮次与反馈方式':'Included rounds, extra rounds and feedback process'}</td></tr></tbody></table></section>${sections.map(([h,p])=>`<section class="studio-info"><h2>${h}</h2><p>${p}</p></section>`).join('')}<section class="studio-info"><h2>${zh?'开始一份你自己的报价':'Build a quote for your own project'}</h2><p>${description}</p><a class="studio-button primary" href="${start}">${zh?'免费使用视频报价模板':'Use the free video quote template'}</a><p><a href="${BASE}/video/">${zh?'继续制作视频与交付文件':'Continue with video production and delivery'}</a> · <a href="${BASE}/studio/quote-builder">${zh?'网站设计与内容服务模板':'Web design and content-service templates'}</a></p></section><section class="studio-info">${faqs.map(f=>`<h2>${f.q}</h2><p>${f.a}</p>`).join('')}</section></main>`;
 let html=layout({title:title+' - BPJ',description,path:VIDEO_QUOTE_ROUTE,body,wide:true,schema:[{'@context':'https://schema.org','@type':'WebPage',name:title,url,description},faqLd(faqs)]});
 const image=site.base_url+'/studio-assets/quote-social-'+lang+'.png';
 html=html.replace(/(<meta property="og:image" content=")[^"]+("[^>]*>)/,`$1${e(image)}$2`).replace(/(<meta name="twitter:image" content=")[^"]+("[^>]*>)/,`$1${e(image)}$2`);
 if(!html.includes('property="og:image"'))html=html.replace('</head>',`<meta property="og:image" content="${e(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"></head>`);
 if(!html.includes('name="twitter:image"'))html=html.replace('</head>',`<meta name="twitter:image" content="${e(image)}"></head>`);
 html=html.replace('name="twitter:card" content="summary"','name="twitter:card" content="summary_large_image"');
 write('studio/video-quote.html',html);pushPage(url+'.html','0.8');
 write('studio/video-quote.md',`# ${title}\n\nCanonical: ${url}\n\n${description}\n\n${sections.map(([h,p])=>`## ${h}\n\n${p}`).join('\n\n')}\n\n${faqs.map(f=>`## ${f.q}\n\n${f.a}`).join('\n\n')}\n\n[${zh?'试用客户报价页':'Try the client quote'}](${demo})\n`);
}
