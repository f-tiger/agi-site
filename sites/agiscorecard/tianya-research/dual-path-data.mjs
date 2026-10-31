export const dualPath={
 version:'startup-investment-1',asOf:'2026-10-05',status:'创业待试点；投资仅观察与模拟方案，未建仓、未计收益。',
 startup:{
  customer:'先找一个每月需要人工整理至少数百条重复来件的贸易或服务企业，直接面向运营/财务负责人。数量只是筛选线索，须核实实际工时和付款能力。',
  offer:'只卖一个结果：把一种订单或报价单整理成固定字段表，并人工复核。冻结输入范围、交付时间、验收字段、错误处理与收费方式。',
  firstWeek:'列出 10 家你能接触的候选企业，争取 3 次问题访谈、1 家愿意提供合法使用样本的客户。这个目标是行动安排，不是已存在的客户或转化率。网站不会替你联系他们。',
  alternative:'同时比较人工、现成表格/OCR 工具与 AI 辅助；若简单工具更便宜且质量相同，就采用简单工具。客户购买的是合格交付。',
  pricing:'先测实际合格交付成本，再核实客户愿付价格。报价下界可按“持续单位成本 ÷ (1−目标贡献率)”试算，上界按客户替代成本与可确认价值确定；没有重叠区间就换方案，不能用预想规模掩盖亏损。',
  example:'按下方默认示例，人工合格成本约 16.33 元，工具辅助约 7.62 元。若暂定 30% 贡献率及客户至少省 20%，试算报价区间约 10.88—13.06 元/合格件。每件 12 元只是试算，未验证客户愿付。',
  warning:'默认 49 件合格交付即使全部按 12 元收费，计入 1,200 元接入费用仍亏约 985.33 元；在其他费用已完整计入、每件贡献不变的假设下，累计约 274 件合格交付才覆盖接入费用。这正是付费试点不能直接等于盈利的原因。',
  scale:'首轮出现付款仍只算付费信号。扣除全部成本通过、并获得自然续费或第二个独立付费客户后，再扩大。10 家、3 次、50 条、20% 和 30% 都是建议试验参数，未做统计功效或最优参数估计。'
 },
 investment:{
  scope:'先用美国上市产品作研究样本，以匹配当前模型主要使用的美国数据；这不意味着适合你的账户或构成个人资产配置。价格、估值、财报门槛尚未逐项核实，当前所有对象保持观察。',
  distinction:'创业检验客户价值与交付利润；投资检验标的利润、买入估值和含费用回报。创业收款、行业增长或模型误差较低，都不能代替资产收益检验。',
  priority:'优先补查 SMH、IGV、XLU 的盈利与估值资料；BOTZ、XLV 作映射较弱的对照。IBIT 单列比特币观察，不用当前宏观模型给它生成买卖信号。此顺序是资料核查顺序，不是预期收益排名。',
  watchlist:[
   {ticker:'SMH',theme:'算力 / 半导体',exposure:'半导体生产与设备股票',source:'https://www.vaneck.com/us/en/investments/semiconductor-etf-smh/',
    thesis:'电子硬件产出只提供需求线索；需要进一步确认订单能进入持仓公司的利润和自由现金流。',
    verify:'冻结研究日的前五大持仓；核对最近两次已公布财报的收入同比、经营利润率和自由现金流，再查同口径估值。',
    invalidate:'订单增长但利润率或现金流转差，或主要依赖少数客户资本开支且估值未留容错。',mapping:'中等：电子产品产出比半导体更宽；ETF 还持有非美国经营主体。'},
   {ticker:'IGV',theme:'软件 / AI 商业化',exposure:'北美软件及部分互动媒体、服务股票',source:'https://www.ishares.com/us/products/239771/ishares-us-technology-etf',
    thesis:'就业放缓可能来自降本，也可能来自需求走弱；只有付费收入和利润能区分。',
    verify:'核对冻结前五大持仓的订阅/服务收入、公开披露的留存指标、经营利润率及扣除相关成本后的现金流。缺失指标记缺失。',
    invalidate:'AI 功能增加，却靠折扣维持收入、续费变差或交付成本抵消收入。',mapping:'偏弱：系统设计服务就业与软件股票不是同一个行业口径。'},
   {ticker:'XLU',theme:'电力 / 公用事业',exposure:'美国公用事业股票',source:'https://www.ssga.com/us/en/individual/etfs/state-street-utilities-select-sector-spdr-etf-xlu',
    thesis:'用电需求须经过允许收费、资本支出和融资成本，才可能转成股东收益。',
    verify:'核对主要持仓的获批投资/费率、利息成本、资金缺口与盈利；比较同口径估值。',
    invalidate:'电量增加而融资和建设成本上升更快，或项目回报未获支持。',mapping:'中等：未季调产出的季节回落不是公用事业股卖出信号。'},
   {ticker:'BOTZ',theme:'机器人 / 自动化',exposure:'全球机器人与 AI 相关股票',source:'https://www.globalxetfs.com/funds/botz',
    thesis:'从演示转到付费设备运行、扩单与售后经济性，才有可检验的商业传导。',
    verify:'核对持仓覆盖、订单转收入、服务成本与利润；不能拿单一人形机器人新闻代替基金持仓经营结果。',
    invalidate:'订单未转成收入或收入增长但维修、交付成本使利润下降。',mapping:'弱：现有五条时序序列没有直接建模机器人订单。'},
   {ticker:'XLV',theme:'医疗 / 长期服务需求',exposure:'美国医疗保健股票，含制药、设备和服务',source:'https://www.ssga.com/us/en/individual/etfs/state-street-health-care-select-sector-spdr-etf-xlv',
    thesis:'医疗就业增加提供用工线索，不能直接推出制药、保险或设备股票获利。',
    verify:'先核对实际持仓收入来源，分别研究支付、价格、研发和成本，避免用就业人数代替盈利。',
    invalidate:'需求增长被支付压力、人工成本、专利或研发风险抵消。',mapping:'弱：ETF 含多个与医疗服务就业差别较大的行业。'},
   {ticker:'IBIT',theme:'Web3 / 比特币单列观察',exposure:'比特币信托型交易产品，不是 Web3 企业股票组合',source:'https://www.ishares.com/us/products/333011/ishares-bitcoin-trust-etf',
    thesis:'比特币价格敞口与支付/对账产品采用是不同命题；IBIT 也不代表稳定币企业利润。',
    verify:'另建比特币价格、流动性、费用和托管风险研究；当前无可用币价策略，因此不纳入本版股票模拟入场规则。',
    invalidate:'以稳定币使用增长直接推导比特币上涨，或把基金规模变化误作价格预测能力。',mapping:'无直接映射：不适用股票盈利和 P/E 门槛。'}
  ],
  entryRules:[
   '先固定研究日的持仓和指标，不用后来换入的赢家回填。股票基金拟用研究日前五大持仓；按冻结权重计算指标，缺财报或口径无法统一时保持待核验。',
   '基本面建议门槛：前五大持仓在各自最近两次公开财报中，加权收入同比均为正、加权经营利润率同比均未下降；另报告每家异常与所覆盖基金权重。覆盖不足不外推整个基金。此为待验证研究规则。',
   '估值建议门槛：基金同口径正 P/E 不高于自身过去 60 个月月末值的第 60 百分位；不足 60 个有效值、方法变更或 P/E 不适用则不触发，需事先另立协议。这个阈值未经收益回测，不代表合理价格的客观界线。',
   '两门槛均经带时间戳来源核实后，才允许记录一笔模拟入场；采用判定完成后的下一个正常交易日开盘价，不能使用财报所属季度或旧数据月份的价格。确认账户准入、资金用途和可承受损失后才能另议实盘。'
  ],
  paperRules:[
   '拟设 100,000 美元虚拟本金；初始无持仓、100% 虚拟现金。每笔入场时名义仓位上限为当时虚拟权益的 5%，同时最多三笔；新增后按当时市值计算的总主题仓位不超过 15%；持有期间随价格漂移的权重另记，超过 15% 暂停新增，不把入场上限误称为全程硬上限。不使用融资或杠杆。多只主题基金可能持仓重叠，不能当作独立分散。',
   '每笔按预定退出价计算的计划损失预算最多为虚拟权益的 0.5%；含每边 10 个基点的假设交易成本，用下方公式计算股数。这是纸面试验参数，未按你的财务情况定制。真实费用和滑点不同，须另记录。',
   '每周五正常收盘后复核。出现基本面反证、收盘跌破事先记录的退出触发价或到达该笔第 90 个日历日，按下一正常交易日开盘价模拟退出；不延期挽救亏损。组合从每日收盘净值峰值回撤达 3% 时暂停新增并复核。触发价不是保证成交价，跳空可能超过计划损失。',
   '每次入场同时买入等名义金额的 SPY 对照，和试验同日退出、相同成本假设；两边其余虚拟现金不计息。另报全仓 SPY 持有期总回报作为参考，不因 85% 以上现金而夸称战胜全仓股票风险。',
   '用非复权价记实际股数与成交，分红入虚拟现金、拆股调整股数；逐日记权益、总收益、含费用相对收益、最大回撤、换手和持仓覆盖期。只有总收益较好而回撤也较大，不能概括为更优。',
   '第 30/90 天报告所有发生的入场、退出和未触发理由，未到期限的交易单列。90 天或少量交易只能发现明显问题，不能证明长期盈利；任何策略改动新建版本。'
  ],
  benchmark:{ticker:'SPY',source:'https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-500-etf-trust-spy',description:'跟踪标普 500 的研究对照；同期、同仓位现金暴露、同费用口径。'},
  evidenceNote:'2026-10-05 核对发行商产品范围。本文没有把网页价格当作实时行情，没有完成上述持仓财报、历史估值或收益回测；所有触发状态均为待核验。'
 }
};

export function sizePaperPosition(v){
 const keys=['equity','entry','exit','riskPct','capPct','feeBps'];
 if(keys.some(k=>!Number.isFinite(v[k])||v[k]<0)||v.equity<=0||v.entry<=0||v.exit<=0||v.exit>=v.entry)return {valid:false,message:'请完整填写数字；虚拟本金和价格须大于 0，退出触发价须低于拟入场价。'};
 if(v.riskPct>.5||v.capPct>5||v.feeBps>100)return {valid:false,message:'本版模拟规则限定风险预算不超过 0.5%、名义仓位不超过 5%；每边费用在 0—100 基点内试算。'};
 const feeRate=v.feeBps/10000,lossPerShare=v.entry-v.exit+(v.entry+v.exit)*feeRate;
 const riskBudget=v.equity*v.riskPct/100;
 const shares=Math.max(0,Math.min(Math.floor(riskBudget/lossPerShare),Math.floor(v.equity*v.capPct/100/v.entry),Math.floor(v.equity/(v.entry*(1+feeRate)))));
 return {valid:true,shares,riskBudget,lossPerShare,plannedLoss:shares*lossPerShare,notional:shares*v.entry,buyCash:shares*v.entry*(1+feeRate),simulated:true,executed:false};
}
