// Two US model identities and task-based searches. No live offers or fit claims.
export const amazonProductReferences = Object.freeze([
 {id:'niubee-risers',task:'display-cases',asin:'B07KN5G9CQ',checked:'2026-11-13',
  en:{name:'NIUBEE acrylic risers',detail:'Two sets of graduated 3-, 4- and 5-inch sizes. An open option for separating rows on an existing shelf.',check:'Listing dimensions conflict. Confirm the variant and usable top surfaces. No verified load rating; open to dust.'},
  de:{name:'NIUBEE Acrylstufen',detail:'US-Modell; keine deutsche Produktseite bestätigt.',check:'Nutzflächen und Traglast sind nicht verifiziert.'},
  zh:{name:'NIUBEE 亚克力展示台',detail:'两组，每组三种 3、4、5 英寸规格，可作为在现有层架上分开前后排的开放式选项。',check:'商品页的尺寸信息有冲突。请确认每个可用台面和所选款式；没有已核实的承重数据，也没有防尘围护。'}},
 {id:'rub-4l',task:'storage-transport',asin:'B000KN4DQ4',checked:'2026-11-13',source:'https://www.reallyusefulproducts.co.uk/usa/html/onlineshop/rub/b04_0litreUS.php',
  en:{name:'Really Useful Box 4L · US model 4C',detail:'Clear box with a clip-lock lid. Consider it for small accessories stored indoors.',check:'Manufacturer’s approximate minimum inside L × W × depth: 12½ × 8½ × 2¾ in. Allow for padding and check the exact US 4C model. TDS has not tested shipping, moisture or archival protection.'},
  de:{name:'Really Useful Box 4L · US-Modell 4C',detail:'US-Modell; keine deutsche Produktseite bestätigt.',check:'US- und UK-Maße dürfen nicht gleichgesetzt werden.'},
  zh:{name:'Really Useful Box 4L · 美国 4C 型号',detail:'透明箱体，配夹扣式箱盖。可考虑用于室内小配件收纳。',check:'厂家标示的近似最小内部长 × 宽 × 深为 12½ × 8½ × 2¾ 英寸。须预留衬垫空间，并核对美国 4C 型号；TDS 未实测运输、防潮或长期收藏保护性能。'}}
]);

const copy={
 en:{title:'Find Amazon options for your task',guideTitle:'Amazon options for this task',intro:'Start with the job and the measurements. Named US models and product-type searches are labelled separately.',market:'Amazon.com · United States',type:'Search a product type',typeNote:'Search results are not verified models. Check the exact listing, seller, delivered total and returns.',consider:'Consider this when',check:'Check before choosing',skip:'Skip the purchase when',model:'Specific US model to check',modelCTA:'Check this model on Amazon US',searchCTA:'Search this type on Amazon US',source:'Manufacturer’s US measurements · non-affiliate source',checked:'Model and source checked',alternatives:'Compare other product types',supplement:'Additional product references',supplementBody:'The comparison below also includes IKEA and official brand sources. These are separate alternatives, not Amazon offers. Your saved shortlist remains available.',
  tasks:{
   'display-cases':{use:'Show the figures you already own on a shelf or inside a separate case.',check:'Compare usable inside space, each riser’s top surface and clearance above the tallest piece. Open risers do not enclose dust.',skip:'Your existing shelf is stable, has enough room and gives you the view you want.',labels:['Figure display cases','Display risers']},
   'storage-transport':{use:'Separate small accessories at home or prepare figures for a short trip.',check:'Storage and carrying are different jobs. Check compartment space after padding, contact materials and the closure.',skip:'Suitable original packaging already holds the pieces securely.',labels:['Divided storage boxes','Padded carrying cases']},
   'plush-display':{use:'Give plush toys room in their natural display pose.',check:'Measure ears, tails and the full footprint. Check usable shelf depth and basket openings without squeezing the plush.',skip:'A shelf or basket you own already supports the shape and leaves lifting room.',labels:['Open shelf organisers','Plush storage baskets']},
   'collector-gifts':{use:'Buy an accessory for a recipient whose collection and available space you know.',check:'Confirm the intended use, measurements, included parts, delivery date and return terms before choosing.',skip:'You cannot confirm what the recipient wants or whether the accessory will fit.',labels:['Display accessories','Small storage organisers']}
  }},
 de:{title:'Amazon-Optionen für deine Aufgabe',guideTitle:'Amazon-Optionen für diese Aufgabe',intro:'Zuerst Aufgabe und Maße klären. Die folgenden Links suchen Produktarten bei Amazon Deutschland; sie sind keine geprüften Modellangebote.',market:'Amazon.de · Deutschland',type:'Nach einer Produktart suchen',typeNote:'Produkttyp-Suche, kein geprüftes Modell. Angebot, Verkäufer, Gesamtpreis und Rückgabe prüfen.',consider:'Sinnvoll, wenn',check:'Vor der Auswahl prüfen',skip:'Nichts kaufen, wenn',model:'Konkretes US-Modell zum Prüfen',modelCTA:'Dieses Modell bei Amazon USA prüfen',searchCTA:'Diese Produktart bei Amazon.de suchen',source:'US-Herstellermaße · keine Affiliate-Quelle',checked:'Modell und Quelle geprüft',alternatives:'Weitere Produktarten vergleichen',supplement:'Ergänzende Produktquellen',supplementBody:'Der Vergleich unten enthält auch IKEA und offizielle Markenquellen. Das sind eigenständige Alternativen, keine Amazon-Angebote. Deine gespeicherte Auswahl bleibt verfügbar.',
  tasks:{
   'display-cases':{use:'Vorhandene Figuren auf einem Regal oder in einer eigenen Vitrine zeigen.',check:'Innenraum, jede Stufenfläche und Platz über der höchsten Figur vergleichen. Offene Stufen schließen Staub nicht aus.',skip:'Dein vorhandenes Regal stabil ist, ausreichend Platz bietet und die Figuren gut sichtbar sind.',labels:['Figurenvitrinen','Display-Stufen']},
   'storage-transport':{use:'Kleines Zubehör zu Hause trennen oder Figuren für einen kurzen Weg vorbereiten.',check:'Lagern und Tragen sind verschiedene Aufgaben. Fachraum nach der Polsterung, Kontaktmaterial und Verschluss prüfen.',skip:'Passende Originalverpackung die Stücke bereits sicher hält.',labels:['Boxen mit Trennfächern','Gepolsterte Transporttaschen']},
   'plush-display':{use:'Plüschtiere in ihrer natürlichen Haltung aufstellen.',check:'Ohren, Schwanz und die ganze Standfläche messen. Nutzbare Regaltiefe und Korböffnung ohne Zusammendrücken prüfen.',skip:'Ein vorhandenes Regal oder ein Korb die Form trägt und Platz zum Herausheben lässt.',labels:['Offene Regal-Einsätze','Körbe für Plüsch']},
   'collector-gifts':{use:'Zubehör für jemanden wählen, dessen Sammlung und verfügbaren Platz du kennst.',check:'Aufgabe, Maße, Lieferumfang, Zustelldatum und Rückgabe vor der Auswahl klären.',skip:'Wunsch oder Passform des Zubehörs nicht geklärt sind.',labels:['Display-Zubehör','Kleine Aufbewahrungsboxen']}
  }},
 zh:{title:'按用途在 Amazon 选配件',guideTitle:'这个用途的 Amazon 选购入口',intro:'先明确用途和尺寸。具体美国型号与商品类型搜索分开标示；中文页面使用美国商城。',market:'Amazon.com · 美国站；不保证向中国或其他地区配送',type:'搜索商品类型',typeNote:'搜索结果不代表已核验型号。请核对具体商品、卖家、到手总价与退货条件。',consider:'适合考虑的情况',check:'选择前先核对',skip:'这些情况可以不买',model:'可进一步核对的美国型号',modelCTA:'在 Amazon 美国查看这个型号',searchCTA:'在 Amazon 美国搜索此类商品',source:'厂家美国规格 · 非联盟来源',checked:'型号与来源核对日期',alternatives:'比较其他商品类型',supplement:'补充商品参考',supplementBody:'下方比较还包含 IKEA 和品牌官方资料，是独立替代方案，并非 Amazon 商品。你已保存的候选清单仍可使用。',
  tasks:{
   'display-cases':{use:'在已有层架或独立展示盒中摆放手里的公仔。',check:'比较可用内空间、每个展示台面和最高藏品上方的余量；开放式展示台不能隔绝灰尘。',skip:'已有层架稳定、空间足够，而且藏品已经能清楚展示。',labels:['公仔展示盒','阶梯展示架']},
   'storage-transport':{use:'在家分开放小配件，或为短途携带公仔做准备。',check:'收纳与携带是不同任务。核对加入衬垫后的格子空间、接触材料和闭合方式。',skip:'合适的原包装已经可以妥善固定藏品。',labels:['分格收纳盒','带衬垫携带箱']},
   'plush-display':{use:'让毛绒按自然姿态摆放，不必挤压造型。',check:'量耳朵、尾巴和完整占地；核对可用架面深度、篮口和拿取空间。',skip:'已有架子或篮子能承托造型，也留有提起藏品的空间。',labels:['开放式层架整理架','毛绒收纳篮']},
   'collector-gifts':{use:'已了解收礼人的收藏和可用空间，准备选一件配件。',check:'先确认用途、尺寸、所含配件、送达日期与退货条件。',skip:'不能确认对方想要什么，或配件是否放得下。',labels:['展示配件','小型分格收纳盒']}
  }}
};

function eligibleReference(lang,task){return lang==='de'?null:amazonProductReferences.find(p=>p.task===task);}
function productHTML(p,{lang,esc,placement,c,disclosure}){
 const d=p[lang],href=`https://www.amazon.com/dp/${p.asin}?tag=ecoback0d-20`;
 return `<section class="amazon-model-reference" data-amazon-model="${p.id}"><p class="amazon-model-label">${c.model}</p><h4>${esc(d.name)}</h4><p>${esc(d.detail)}</p><p class="amazon-model-check">${esc(d.check)}</p><p class="shop-disclosure">${esc(disclosure)}</p><a class="button primary" href="${esc(href)}" rel="sponsored nofollow noopener" data-shopping-item="${p.id}" data-shopping-placement="${placement}" data-shopping-destination>${c.modelCTA}</a>${p.source?`<a class="amazon-manufacturer" href="${esc(p.source)}" rel="noopener">${c.source}</a>`:''}<p class="amazon-source-date">${c.checked}: <time datetime="${p.checked}">${p.checked}</time></p></section>`;
}

export function amazonShoppingHTML({lang,route,esc,guides,merchantURL,disclosure,guide=null}){
 const c=copy[lang],list=guide?[guide]:guides,placement=guide?'guide':'card';
 return `<section class="amazon-shopping${guide?' amazon-shopping-guide':''}" id="amazon-shopping" data-amazon-shopping><header><h2>${guide?c.guideTitle:c.title}</h2><p class="amazon-market">${c.market}</p></header><div class="amazon-task-grid">${list.map(g=>{const d=c.tasks[g.slug],p=eligibleReference(lang,g.slug),queries=g.queries[lang==='de'?'de':'en'];return `<article class="amazon-task-card" data-amazon-task="${g.slug}"><h3>${esc(g[lang].title)}</h3><p class="amazon-task-use">${esc(d.use)}</p>${p?productHTML(p,{lang,esc,placement,c,disclosure}):''}<div class="amazon-type-search"><h4>${p?c.alternatives:c.type}</h4><p>${c.typeNote}</p><p class="shop-disclosure">${esc(disclosure)}</p><div class="amazon-type-links">${queries.map(([,query],i)=>`<a class="button${!p&&i===0?' primary':''}" href="${esc(merchantURL(lang,query))}" rel="sponsored nofollow noopener" data-shopping-merchant>${esc(d.labels[i])} · ${c.searchCTA}</a>`).join('')}</div></div><dl><div><dt>${c.check}</dt><dd>${esc(d.check)}</dd></div><div><dt>${c.skip}</dt><dd>${esc(d.skip)}</dd></div></dl>${!guide?`<a class="amazon-guide-link" href="${route(lang,'shop/'+g.slug)}">${lang==='zh'?'查看完整测量与选购指南':lang==='de'?'Maße und Kaufkriterien im Detail':'Read the measurements and buying checks'} →</a>`:''}</article>`;}).join('')}</div></section>`;
}

export function amazonShoppingText({lang,guides,guide=null}){
 const c=copy[lang];
 return [guide?c.guideTitle:c.title,...(guide?[guide]:guides).flatMap(g=>{const d=c.tasks[g.slug],p=eligibleReference(lang,g.slug);return[g[lang].title,d.use,c.check+': '+d.check,c.skip+': '+d.skip,...(p?[p[lang].name,p[lang].detail,p[lang].check,c.checked+': '+p.checked,...(p.source?[p.source]:[])]:[]),c.typeNote,...d.labels];})];
}

export function amazonSupplementHTML(lang){const c=copy[lang];return `<header class="amazon-supplement"><h2>${c.supplement}</h2><p>${c.supplementBody}</p></header>`;}
export function amazonSupplementText(lang){return[copy[lang].supplement,copy[lang].supplementBody];}
