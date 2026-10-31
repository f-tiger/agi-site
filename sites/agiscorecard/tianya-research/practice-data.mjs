import {ledger} from './practice-ledger.mjs';
import {dualPath} from './dual-path-data.mjs';
export const practice={
 version:'practice-2',issued:'2026-10-05',status:'方案已制定；真实试点未开始，尚无付款、收益或实测验证结果。',ledger,dualPath,
 recommendation:'产品创业先做一个能接触到买方、能取得真实任务记录的 30 天付费试点；投资先核实行业、盈利和估值的传导，再作模拟交易。两条线分开记账，不用创业收入或行业增长证明投资获利。',
 rationale:'现有就业与产出预测没有证明某个产品能赚钱。AI 工作流优先试验，是因为可用现成工具、能在小样本中计时计费、退出成本较低；这是行动顺序建议，不是模型收益排名。',
 example:'首个候选：把客户来件整理成结构化表格，再由人工验收。冻结一种来件、一个字段清单、一个买方；不同时做聊天、知识库和自动审批。',
 budget:{days:30,cashCNY:3000,personHours:30,note:'建议试验上限，尚未授权支出；按你的资源可另定。现金与工时任一耗尽即停。任何改动都在试验前记入新版本。'},
 gates:[
  '可行性样本建议 50 个连续进入的真实任务，两种方法处理同一任务集；固定验收标准，隐去处理方法并随机验收顺序。不能只挑成功案例。50 不是经功效分析确定的样本量，也不证明普遍有效。',
  '每个合格结果的持续总成本下降至少 20%，质量合格率不低于人工基线，重大错误为 0；失败、复核、返工和模型费用全部计入。20% 是建议经营门槛，不是算法学出的最优阈值。',
  '外部产品须有 1 个独立客户真实付费，收入扣除全部交付成本后为正；内部降本须有负责人验收，释放工时确被重新分配或现金支出实际减少。口头意向与理论省时不算实现收益。',
  '第 30 天未通过成本、质量与商业/内部使用门槛，停止扩大。保留未通过结果；如要改客户、任务或价格，另开试验。通过只允许下一轮小幅扩大，不能推断规模化盈利。'
 ],
 phases:[
  {when:'第 1—7 天',title:'确定一件值得付费的事',action:'与一个目标负责人核实任务量、人工做法、痛点和可接受报价；取连续任务记录。先记录人工耗时、合格率、返工与成本，再确定固定工具和方案。',deliverable:'买方/负责人、任务定义、成本基线、质量红线、预算和停止日期。',stop:'无法取得真实任务、合格标准或明确负责人，暂停搭建。'},
  {when:'第 8—14 天',title:'跑同一批任务，查真实差额',action:'使用现成工具完成同一任务集；记录所有尝试及人工接管。验收人员按预定标准检查两种方法，按任务类型一起报告。',deliverable:'原始记录、合格结果单位成本、重大错误清单；第 14 天做一次可行性判断。',stop:'质量红线触发立即停止上线；净节省不达门槛则不扩大，原方案按未通过保留。'},
  {when:'第 15—30 天',title:'用付费或实际使用验收',action:'外部产品只做一个限定范围的付费交付；内部工具在一个小团队内使用并跟踪复核和返工。第 30 天按原门槛结算。',deliverable:'真实到账与交付成本，或实际任务产能/现金支出变化；包含退款、失败和接入成本。',stop:'没有付款/实际使用，或扣除成本不为正，停止扩大。'},
  {when:'第 31—90 天',title:'检查能否重复，再决定投入',action:'仅在首轮通过后，验证自然续费或第二位独立付费客户；内部项目换一批任务复测。记录维护、获客和质量漂移。',deliverable:'重复交付成本、留存/续费、维护工时；新旧样本都纳入。',stop:'靠补贴、熟人支持、持续人工兜底才能维持，撤回扩张计划。'}
 ],
 directions:[
  {topic:'AI / 代理工具',action:'做来件结构化、核对或文档整理中的一个流程；用现成工具先交付。',proof:'负责人愿意付费；合格交付成本下降，复核和返工已计入。',stop:'必须不断人工重做，或没有采购人。',basis:'优先低成本试点；IT 就业信号不证明某类 AI 产品收入。'},
  {topic:'机器人',action:'先做故障分析、人工接管记录或维护服务；有现成设备客户再试固定工序。',proof:'覆盖真实班次的有效作业时长、每次合格作业总成本和客户实际复购。',stop:'只能演示，不能连续运行；首轮验证必须先自购昂贵设备。',basis:'机器人方向来自行业资料与条件推演；当前五条时序序列未直接预测机器人订单。'},
  {topic:'能源 / 数据中心',action:'先为一个真实场站做账单核对或能耗诊断，再验证可实施的一项改造。',proof:'按天气、产量、运行时长调整的可比节能与净回收期，包含改造和维护费。',stop:'只有电量季节波动，没有可核验节省；客户无法提供账单。',basis:'美国未季调公用事业产出有季节性，不能直接推断本地缺电或节能收益。'},
  {topic:'Web3 / 稳定币',action:'若能接触合法业务客户，先验证财务对账、报表或跨渠道核对需求。',proof:'端到端费用、差错和处理时间下降；去除代币奖励后仍重复付费使用。',stop:'没有合法经营路径或真实客户，收入只靠币价和补贴。',basis:'当前没有币价时序预测；采用增长与代币回报须分别验证。'},
  {topic:'医疗 / 养老服务',action:'在有资质的合作方内验证排班、随访协调或辅具售后流程。',proof:'服务完成率、投诉、付费续用与人工交付成本；医疗判断由专业人员承担。',stop:'把总需求当作支付能力，或无法落实服务质量责任。',basis:'美国就业增量只是需求线索，不能代表本地支付能力。'},
  {topic:'金融 / 热门资产',action:'目前先列观察清单和模拟研究方案，补齐具体资产、估值、可交易时点与费用数据。',proof:'冻结标的、基准、入场/退出规则后，记录含费用的模拟净回报及最大回撤。',stop:'只因行业增长就买资产；事后换标的、抹掉亏损或追认低点买入。',basis:'现有产出/就业模型没有收益预测或可执行交易信号。'}
 ],
 investment:{title:'如果目的是投资：先建立可复核的模拟记录',rules:[
  '先定义具体市场、可交易工具、允许的风险和持有期。目前这些信息未指定，因此不生成买卖指令。',
  '启动前固定观察/模拟组合、买入条件、退出条件、权重上限、同币种总回报基准；只用信号发布后下一个可交易时点价格，计入费用与滑点。不能用数据所属月份的价格假装当时已经知道。',
  '记录所有信号、未交易理由和亏损；按预定 30/90 天报告净回报、相对基准收益和最大回撤。结果不足一个完整周期时标记未完成，短期盈利不证明策略有效。',
  '预测是否准确、具体资产是否受益、价格是否已经反映预期、扣费后是否盈利，四项分别检验。当前模拟组合尚未建立，无实际交易。'
 ]},
 loop:'每周核对任务、工时、费用和错误；第 14/30/90 天按原门槛作决定。短期试点立即可准备；宏观预测须等官方发布后再核验。没有自动监控、自动交易或已设置的提醒。'
};

// Pure what-if calculation: every attempted task incurs cost, including failed work.
export function calculatePilot(v){
 const keys=['tasks','baseMinutes','trialMinutes','hourlyCNY','extraCNY','setupCNY','monthlyTasks','basePass','trialPass','majorErrors','quoteCNY'];
 if(keys.some(k=>!Number.isFinite(v[k])||v[k]<0))return {valid:false,message:'请完整填写非负数字。空白不能按 0 处理。'};
 if(!Number.isInteger(v.tasks)||v.tasks<1||!Number.isInteger(v.monthlyTasks)||v.monthlyTasks<1||['basePass','trialPass','majorErrors'].some(k=>!Number.isInteger(v[k])||v[k]>v.tasks))return {valid:false,message:'任务量须为正整数；合格数和重大错误任务数须为 0 到总任务数的整数。'};
 if(v.basePass===0||v.trialPass===0)return {valid:false,message:'没有合格结果，单位合格成本不可计算；不得扩大。'};
 const baselineTotal=v.tasks*v.baseMinutes/60*v.hourlyCNY;
 const trialTotal=v.tasks*(v.trialMinutes/60*v.hourlyCNY+v.extraCNY);
 if(baselineTotal===0)return {valid:false,message:'人工基线成本为 0，无法用降本比例判定。请核对基线。'};
 const baselineUnit=baselineTotal/v.basePass,trialUnit=trialTotal/v.trialPass;
 const savingPercent=100*(1-trialUnit/baselineUnit);
 const monthlyValue=(baselineTotal-trialTotal)*v.monthlyTasks/v.tasks;
 const releasedHours=(v.baseMinutes-v.trialMinutes)*v.monthlyTasks/60;
 const gates={sample:v.tasks>=50,cost:savingPercent>=20-1e-10,quality:v.trialPass>=v.basePass,critical:v.majorErrors===0};
 const quotedRevenue=v.quoteCNY*v.trialPass,contributionPerPass=v.quoteCNY-trialUnit;
 return {valid:true,baselineUnit,trialUnit,pilotUnit:(trialTotal+v.setupCNY)/v.trialPass,savingPercent,
  quotedRevenue,trialProfit:quotedRevenue-trialTotal-v.setupCNY,contributionPerPass,
  breakEvenPasses:contributionPerPass>0?Math.ceil(v.setupCNY/contributionPerPass):null,
  priceFloor:trialUnit/.7,priceCeiling:baselineUnit*.8,
  monthlyValue,releasedHours,paybackMonths:monthlyValue>0?v.setupCNY/monthlyValue:null,gates,
  demoGate:Object.values(gates).every(Boolean),measured:false};
}
