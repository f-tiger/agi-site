/**
 * Local, dependency-free case retrieval and planning. No fetch, storage or API calls.
 * The denoising autoencoder learns to reconstruct source-text features, NOT outcomes.
 * Its similarities are related-text scores, never commercial success probabilities.
 */
const MODEL_VERSION = 'bpj-text-dae-v2';
const HASH_DIMENSIONS = 96;
const HIDDEN_DIMENSIONS = 20;
const EPOCHS = 36;
const MAX_CASES = 512;
const MAX_QUERY = 2000;
const MAX_PROFILE_TEXT = 600;

const MECHANISMS = [
  ['image', '图像与设计', 'Images and design', ['image', 'photo', 'photography', 'headshot', 'portrait', 'avatar', 'design', 'logo', '图像', '图片', '商品图', '产品图', '头像', '摄影', '写真', '设计']],
  ['coding', '编程与开发', 'Coding and development', ['coding', 'code', 'programming', 'software development', 'developer tools', 'editor', 'copilot', '编程', '代码', '软件开发', '开发工具', '程序', '编辑器']],
  ['video', '视频与剪辑', 'Video and editing', ['video', 'film', 'clip', 'editing', '视频', '剪辑', '短剧', '短片']],
  ['audio', '音频与配音', 'Audio and voice', ['audio', 'voice', 'music', 'podcast', '音频', '配音', '音乐', '播客']],
  ['writing', '写作与内容', 'Writing and content', ['writing', 'writer', 'content', 'copywriting', 'copywriter', '文案', '写作', '内容', '文章']],
  ['commerce', '电商与销售', 'Commerce and sales', ['ecommerce', 'e-commerce', 'shop', 'store', 'sales', 'retail', '电商', '商店', '店铺', '销售', '卖家']],
  ['support', '客服与知识库', 'Customer support and knowledge bases', ['customer support', 'customer service', 'helpdesk', 'help desk', 'knowledge base', 'chatbot', 'faq', 'support bot', '客服', '客户支持', '知识库', '问答机器人']],
  ['workflow', '重复工作与自动化', 'Repeated work and automation', ['workflow', 'automation', 'automate', 'repetitive', 'integration', '工作流', '自动化', '重复任务', '集成']],
  ['website', '网站与产品', 'Websites and products', ['website', 'web', 'site', 'builder', 'app', 'application', '网站', '建站', '站点', '应用']],
  ['search', '搜索与获客', 'Search and acquisition', ['seo', 'search', 'organic', '搜索', '获客', '自然流量']],
  ['audience', '已有受众与分发', 'Existing audience and distribution', ['audience', 'distribution', 'newsletter', 'community', 'social', 'youtube', 'tiktok', '受众', '分发', '社区', '社群', '粉丝', '短视频', '渠道']],
  ['service', '人工服务与交付', 'Services and delivery', ['service', 'agency', 'consulting', 'freelance', 'delivery', '服务', '接单', '咨询', '交付', '外包']],
  ['subscription', '订阅与留存', 'Subscriptions and retention', ['subscription', 'subscriber', 'retention', 'churn', 'recurring', 'saas', '订阅', '留存', '复购', '续费', '流失']],
  ['pricing', '付费与定价', 'Payments and pricing', ['paid', 'payment', 'pricing', 'price', 'purchase', 'monetization', '付费', '付款', '定价', '价格', '购买', '变现']],
  ['cost', '成本与单位经济', 'Costs and unit economics', ['cost', 'margin', 'profit', 'compute', 'inference', 'gpu', 'unit economics', '成本', '利润', '算力', '毛利', '推理费用']],
  ['validation', '客户需求验证', 'Customer demand validation', ['validation', 'interview', 'pilot', 'problem', 'demand', 'niche', '需求', '访谈', '验证', '试点', '痛点', '细分']],
  ['reliability', '质量与可靠性', 'Quality and reliability', ['quality', 'accuracy', 'reliability', 'hallucination', 'trust', '质量', '可靠', '准确', '幻觉', '信任']],
  ['platform', '平台依赖与竞争', 'Platform dependency and competition', ['platform', 'competition', 'competitor', 'moat', 'copycat', 'wrapper', '平台', '竞争', '同质化', '套壳', '护城河']],
  ['privacy', '隐私与商用边界', 'Privacy and commercial rights', ['privacy', 'copyright', 'license', 'licence', 'compliance', 'security', '隐私', '版权', '授权', '合规', '安全']],
  ['hardware', '硬件与资本开支', 'Hardware and capital expenditure', ['hardware', 'device', 'wearable', 'manufacturing', 'robot', '硬件', '设备', '穿戴', '制造', '机器人']],
  ['ads', '广告与赞助', 'Advertising and sponsorship', ['advertising', 'sponsor', 'sponsorship', 'affiliate', '广告', '赞助', '联盟']],
];
const DIMENSIONS = HASH_DIMENSIONS + MECHANISMS.length;
const DOMAIN_IDS = new Set(['image', 'coding', 'video', 'audio', 'writing', 'commerce', 'support', 'website', 'hardware']);
const STOPWORDS = new Set(('the and for with from this that your you are was were have has can how what who into about using use ai artificial intelligence business startup founder company success failure make money revenue income user users product products tool tools 我们 你们 一个 如何 怎么 赚钱 营收 收入 成功 失败 用户 客户 产品 工具 可以 没有 使用 通过 这个').split(' '));
const PENDING_STATUSES = new Set(['draft', 'pending', 'pending-review', 'review-required', 'change-pending', 'unverified', 'disputed', 'retracted']);
const string = (value, max = 2000) => typeof value === 'string' ? value.replace(/\u0000/g, '').trim().slice(0, max) : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
const list = value => Array.isArray(value) ? value : [];
const unique = values => [...new Set(values)];
const round = value => Math.round(value * 1e6) / 1e6;

function httpURL(value) {
  try { const url = new URL(string(value, 1500)); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
function stableJSON(value) {
  if (Array.isArray(value)) return '[' + value.map(stableJSON).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableJSON(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function hashText(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
function corpusHash(cases) {
  const text = stableJSON(cases);
  return hashText(text).toString(16).padStart(8, '0') + hashText('bpj-corpus-v1:' + text).toString(16).padStart(8, '0');
}
function randomGenerator(seed) {
  let value = seed || 1;
  return () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; };
}

function normalizeCases(input) {
  const seen = new Set();
  return list(input).slice(0, MAX_CASES).flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const id = string(item.id, 100);
    if (!id || seen.has(id) || !['success', 'failure'].includes(item.outcome)) return [];
    seen.add(id);
    const sources = list(item.sources).slice(0, 12).flatMap(source => {
      const url = httpURL(source?.url);
      if (!url) return [];
      return [{url, title: string(source.title, 300), titleEn: string(source.titleEn, 300), publishedAt: string(source.publishedAt, 40), evidence: string(source.evidence, 3000), evidenceEn: string(source.evidenceEn, 3000), supports: Array.isArray(source.supports) ? source.supports.slice(0, 15).map(x => string(x, 150)) : string(source.supports, 1000), supportsEn: Array.isArray(source.supportsEn) ? source.supportsEn.slice(0, 15).map(x => string(x, 150)) : string(source.supportsEn, 1000), status: string(source.status, 40)}];
    });
    return [{id, name: string(item.name, 150) || id, nameEn: string(item.nameEn, 150), outcome: item.outcome, failureSubtype: string(item.failureSubtype, 100), scope: ['solo', 'small-team', 'company'].includes(item.scope) ? item.scope : 'unknown', category: string(item.category, 120), categoryEn: string(item.categoryEn, 120), summary: string(item.summary, 3000), summaryEn: string(item.summaryEn, 3000), metrics: list(item.metrics).slice(0, 12).map(metric => ({label: string(metric?.label, 150), labelEn: string(metric?.labelEn, 150), value: string(metric?.value, 300), valueEn: string(metric?.valueEn, 300), period: string(metric?.period, 200), periodEn: string(metric?.periodEn, 200), kind: string(metric?.kind, 80)})), sources, observedAt: string(item.observedAt, 40), drivers: list(item.drivers).slice(0, 12).map(driver => ({text: string(driver?.text, 1000), textEn: string(driver?.textEn, 1000), kind: driver?.kind === 'reported' ? 'reported' : 'inference', sourceUrl: httpURL(driver?.sourceUrl)})), risks: list(item.risks).slice(0, 12).map(risk => string(risk, 600)), risksEn: list(item.risksEn).slice(0, 12).map(risk => string(risk, 600)), soloRelevance: string(item.soloRelevance, 1000), soloRelevanceEn: string(item.soloRelevanceEn, 1000), status: string(item.evidenceStatus || item.status, 40)}];
  }).sort((a, b) => a.id.localeCompare(b.id, 'en'));
}
function eligible(item, includeUnverified = false) {
  return item.sources.some(source => includeUnverified || !PENDING_STATUSES.has(source.status)) && (includeUnverified || !PENDING_STATUSES.has(item.status));
}
function sourceText(item) {
  return [item.name, item.category, item.categoryEn, item.summary, item.summaryEn, item.soloRelevance, item.soloRelevanceEn, ...item.drivers.flatMap(x => [x.text, x.textEn]), ...item.risks, ...item.risksEn, ...item.sources.flatMap(x => [x.title, x.evidence, x.evidenceEn])].join(' ').toLowerCase().normalize('NFKC');
}
function caseMechanisms(item) {
  // A comment such as "do not copy its product design" is not image-business evidence.
  const facts = [item.name, item.nameEn, item.category, item.categoryEn, item.summary, item.summaryEn].join(' ');
  return unique([...mechanismIDs(facts), ...mechanismIDs(sourceText(item)).filter(id => !DOMAIN_IDS.has(id))]);
}
function taskDomains(text) {
  const ids = mechanismIDs(text).filter(id => DOMAIN_IDS.has(id));
  // A concrete deliverable outranks incidental skills or a generic app/commerce context.
  const specific = ids.filter(id => ['support', 'image', 'video', 'audio', 'writing', 'hardware'].includes(id));
  return specific.length ? specific : ids;
}
function tokenize(text) {
  const value = string(text, 50000).toLowerCase().normalize('NFKC');
  const result = (value.match(/[a-z][a-z0-9+.#-]{1,39}/g) || []).filter(token => !STOPWORDS.has(token));
  for (const span of value.match(/[\u3400-\u9fff]+/gu) || []) {
    for (let size = 2; size <= 3; size++) for (let start = 0; start + size <= span.length; start++) {
      const token = span.slice(start, start + size);
      if (!STOPWORDS.has(token)) result.push(token);
    }
  }
  return result;
}
function mechanismIDs(text) {
  const value = string(text, 50000).toLowerCase().normalize('NFKC');
  return MECHANISMS.filter(([, , , terms]) => terms.some(term => /[\u3400-\u9fff]/u.test(term) ? value.includes(term) : new RegExp('(?:^|[^a-z])' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:$|[^a-z])', 'i').test(value))).map(([id]) => id);
}
function featureVector(text, mechanisms = mechanismIDs(text)) {
  const vector = Array(DIMENSIONS).fill(0);
  const counts = new Map();
  for (const token of tokenize(text)) counts.set(token, (counts.get(token) || 0) + 1);
  for (const [token, count] of counts) vector[hashText(token) % HASH_DIMENSIONS] += Math.min(2.5, 1 + Math.log(count));
  // Derived, bilingual text features; no human-assigned outcome score enters training.
  for (const id of mechanisms) vector[HASH_DIMENSIONS + MECHANISMS.findIndex(row => row[0] === id)] = 3;
  const norm = Math.hypot(...vector);
  return norm ? vector.map(value => value / norm) : vector;
}
function encode(vector, weights) {
  return weights.encoderBias.map((bias, hidden) => {
    let value = bias;
    const offset = hidden * DIMENSIONS;
    for (let input = 0; input < DIMENSIONS; input++) value += weights.encoder[offset + input] * vector[input];
    return Math.tanh(value);
  });
}
function decode(hidden, weights) {
  return weights.decoderBias.map((bias, output) => {
    let value = bias;
    const offset = output * HIDDEN_DIMENSIONS;
    for (let i = 0; i < HIDDEN_DIMENSIONS; i++) value += weights.decoder[offset + i] * hidden[i];
    return value;
  });
}
function reconstructionLoss(vectors, weights) {
  if (!vectors.length) return null;
  let loss = 0;
  for (const vector of vectors) {
    const reconstructed = decode(encode(vector, weights), weights);
    for (let i = 0; i < DIMENSIONS; i++) loss += (reconstructed[i] - vector[i]) ** 2;
  }
  return loss / (vectors.length * DIMENSIONS);
}
function cosine(left, right) {
  let dot = 0, a = 0, b = 0;
  for (let i = 0; i < left.length; i++) { dot += left[i] * right[i]; a += left[i] ** 2; b += right[i] ** 2; }
  return a && b ? Math.max(0, Math.min(1, dot / Math.sqrt(a * b))) : 0;
}

/** Deterministic actual SGD training. Any case/source/content change changes the seed. */
export function buildModel(input) {
  const allCases = normalizeCases(input);
  const cases = allCases.filter(item => eligible(item));
  const contentHash = corpusHash(allCases);
  const random = randomGenerator(hashText(contentHash));
  const weights = {encoder: Array.from({length: DIMENSIONS * HIDDEN_DIMENSIONS}, () => (random() - .5) * .24), encoderBias: Array(HIDDEN_DIMENSIONS).fill(0), decoder: Array.from({length: DIMENSIONS * HIDDEN_DIMENSIONS}, () => (random() - .5) * .24), decoderBias: Array(DIMENSIONS).fill(0)};
  const initialWeights = [...weights.encoder, ...weights.encoderBias, ...weights.decoder, ...weights.decoderBias];
  const documents = cases.map(item => { const text = sourceText(item), mechanisms = caseMechanisms(item); return {id: item.id, tokens: unique(tokenize(text)), mechanisms, vector: featureVector(text, mechanisms)}; });
  const vectors = documents.map(document => document.vector);
  const initialLoss = reconstructionLoss(vectors, weights);
  const checkpoints = [];
  const epochs = vectors.length ? EPOCHS : 0;
  const learningRate = .055;
  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let step = 0; step < vectors.length; step++) {
      const vector = vectors[(step + epoch) % vectors.length];
      const corrupted = vector.map(value => value && random() < .16 ? 0 : value);
      const hidden = encode(corrupted, weights);
      const output = decode(hidden, weights);
      const errors = output.map((value, i) => Math.max(-1, Math.min(1, value - vector[i])));
      const hiddenErrors = hidden.map((value, i) => {
        let error = 0;
        for (let j = 0; j < DIMENSIONS; j++) error += errors[j] * weights.decoder[j * HIDDEN_DIMENSIONS + i];
        return error * (1 - value * value);
      });
      for (let j = 0; j < DIMENSIONS; j++) {
        weights.decoderBias[j] -= learningRate * errors[j];
        for (let i = 0; i < HIDDEN_DIMENSIONS; i++) weights.decoder[j * HIDDEN_DIMENSIONS + i] -= learningRate * errors[j] * hidden[i];
      }
      for (let i = 0; i < HIDDEN_DIMENSIONS; i++) {
        weights.encoderBias[i] -= learningRate * hiddenErrors[i];
        for (let j = 0; j < DIMENSIONS; j++) weights.encoder[i * DIMENSIONS + j] -= learningRate * hiddenErrors[i] * corrupted[j];
      }
    }
    if ((epoch + 1) % 6 === 0) checkpoints.push({epoch: epoch + 1, loss: reconstructionLoss(vectors, weights)});
  }
  const finalWeights = [...weights.encoder, ...weights.encoderBias, ...weights.decoder, ...weights.decoderBias];
  const weightDelta = finalWeights.reduce((sum, value, index) => sum + Math.abs(value - initialWeights[index]), 0);
  const finalLoss = reconstructionLoss(vectors, weights);
  return {version: MODEL_VERSION, contentHash, trained: vectors.length > 0 && Number.isFinite(finalLoss), caseIds: cases.map(item => item.id), documents, weights, embeddings: documents.map(document => encode(document.vector, weights)), training: {caseCount: vectors.length, excludedCaseCount: allCases.length - vectors.length, dimensions: DIMENSIONS, hashDimensions: HASH_DIMENSIONS, hiddenDimensions: HIDDEN_DIMENSIONS, epochs, learningRate, corruptionRate: .16, initialLoss, finalLoss, weightDelta, checkpoints, objective: 'denoising text-feature reconstruction, not outcome prediction', operationBudget: epochs * vectors.length * DIMENSIONS * HIDDEN_DIMENSIONS * 4, maximumCases: MAX_CASES}};
}
function validModel(model, contentHash) {
  return model?.version === MODEL_VERSION && model.contentHash === contentHash && model.weights?.encoder?.length === DIMENSIONS * HIDDEN_DIMENSIONS && model.weights?.decoder?.length === DIMENSIONS * HIDDEN_DIMENSIONS && model.weights?.encoderBias?.length === HIDDEN_DIMENSIONS && model.weights?.decoderBias?.length === DIMENSIONS && Array.isArray(model.documents) && Array.isArray(model.embeddings);
}
function currentModel(cases, model) { return validModel(model, corpusHash(cases)) ? model : buildModel(cases); }

/** Related-text scores combine trained embeddings, token overlap and mechanism overlap. */
export function retrieveCases(input, suppliedModel, query, options = {}) {
  const cases = normalizeCases(input);
  const text = string(query, MAX_QUERY);
  if (!text) return [];
  const queryTokens = unique(tokenize(text));
  const queryMechanisms = mechanismIDs(text);
  const primaryText = string(options.primaryQuery, MAX_QUERY) || text;
  const primaryTokens = unique(tokenize(primaryText));
  const primaryMechanisms = mechanismIDs(primaryText);
  const domainHint = Array.isArray(options.domainHint) ? options.domainHint.filter(id => DOMAIN_IDS.has(id)) : taskDomains(primaryText);
  if (!queryTokens.length && !queryMechanisms.length) return [];
  const model = currentModel(cases, suppliedModel);
  const embedding = encode(featureVector(text), model.weights);
  const byID = new Map(cases.map(item => [item.id, item]));
  const frequency = new Map();
  for (const document of model.documents) for (const token of document.tokens) frequency.set(token, (frequency.get(token) || 0) + 1);
  const tokenWeight = token => 1 + Math.log((model.documents.length + 1) / ((frequency.get(token) || 0) + 1));
  const queryWeight = queryTokens.reduce((sum, token) => sum + tokenWeight(token), 0);
  const primaryWeight = primaryTokens.reduce((sum, token) => sum + tokenWeight(token), 0);
  const limit = Math.max(1, Math.min(MAX_CASES, Number.isFinite(Number(options.limit)) ? Math.floor(Number(options.limit)) : 8));
  const minScore = Math.max(0, Math.min(1, Number.isFinite(Number(options.minScore)) ? Number(options.minScore) : .09));
  return model.documents.flatMap((document, index) => {
    const item = byID.get(document.id);
    if (!item || !eligible(item) || options.outcome && item.outcome !== options.outcome || options.scope && item.scope !== options.scope) return [];
    if (domainHint.length && !domainHint.some(id => document.mechanisms.includes(id))) return [];
    const tokens = new Set(document.tokens);
    const matchedTokens = queryTokens.filter(token => tokens.has(token));
    const matchedMechanisms = queryMechanisms.filter(id => document.mechanisms.includes(id));
    // An embedding alone cannot turn an unrelated case into matching evidence.
    if (!matchedTokens.length && !matchedMechanisms.length) return [];
    const contextLexical = queryWeight ? matchedTokens.reduce((sum, token) => sum + tokenWeight(token), 0) / queryWeight : 0;
    const primaryLexical = primaryWeight ? primaryTokens.filter(token => tokens.has(token)).reduce((sum, token) => sum + tokenWeight(token), 0) / primaryWeight : contextLexical;
    const lexicalScore = .8 * primaryLexical + .2 * contextLexical;
    const contextMechanism = queryMechanisms.length ? matchedMechanisms.length / queryMechanisms.length : 0;
    const primaryMechanism = primaryMechanisms.length ? primaryMechanisms.filter(id => document.mechanisms.includes(id)).length / primaryMechanisms.length : contextMechanism;
    const mechanismScore = .8 * primaryMechanism + .2 * contextMechanism;
    const neuralScore = cosine(embedding, model.embeddings[index]);
    const score = .5 * lexicalScore + .32 * mechanismScore + .18 * neuralScore;
    return score >= minScore ? [{case: item, score: round(score), lexicalScore: round(lexicalScore), neuralScore: round(neuralScore), matchedMechanisms}] : [];
  }).sort((a, b) => b.score - a.score || a.case.id.localeCompare(b.case.id, 'en')).slice(0, limit);
}

/** Collection counts describe a selected corpus; they are not population success rates. */
export function analyzePatterns(input) {
  const allCases = normalizeCases(input);
  const cases = allCases.filter(item => eligible(item));
  const documents = cases.map(item => ({item, mechanisms: caseMechanisms(item)}));
  return {corpusSize: allCases.length, sourcedCases: cases.length, excludedCases: allCases.length - cases.length, successCount: cases.filter(item => item.outcome === 'success').length, failureCount: cases.filter(item => item.outcome === 'failure').length, mechanisms: MECHANISMS.map(([id, zh, en]) => {
    const relevant = documents.filter(document => document.mechanisms.includes(id));
    const successIds = relevant.filter(({item}) => item.outcome === 'success').map(({item}) => item.id);
    const failureIds = relevant.filter(({item}) => item.outcome === 'failure').map(({item}) => item.id);
    return {id, label: {zh, en}, successCount: successIds.length, failureCount: failureIds.length, successIds, failureIds};
  }).filter(row => row.successCount + row.failureCount > 0), limitations: ['人工收录样本不代表市场总体；频次不是商业成功概率。', '相似模式是相关性线索，不能单凭案例确认因果关系。', '案例是各自时间点的观察，收入、用户增长、利润与收购需要分别解释。']};
}

function validateProfile(input) {
  const profile = input && typeof input === 'object' ? input : {};
  const language = profile.language === 'en' ? 'en' : 'zh';
  const issues = [];
  const number = (key, max) => {
    const value = profile[key];
    if (value === '' || value === null || value === undefined) return null;
    if (typeof value !== 'number' && typeof value !== 'string' || typeof value === 'string' && !/^\s*(?:\d+(?:\.\d+)?|\.\d+)\s*$/.test(value)) {
      issues.push(language === 'zh' ? `${key}不是有效的非负数字，已标为未知。` : `${key} is not a valid non-negative number and is treated as unknown.`); return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) { issues.push(language === 'zh' ? `${key}超出有效范围，已标为未知。` : `${key} is outside the accepted range and is treated as unknown.`); return null; }
    return parsed;
  };
  const text = (key, max = MAX_PROFILE_TEXT) => {
    if (typeof profile[key] === 'string' && profile[key].length > max) issues.push(language === 'zh' ? `${key}过长，仅使用前${max}个字符。` : `${key} is too long; only its first ${max} characters are used.`);
    return string(profile[key], max);
  };
  return {profile: {question: text('question', MAX_QUERY), skill: text('skill'), customer: text('customer'), budget: number('budget', 1e9), hours: number('hours', 168), stage: text('stage', 120), price: number('price', 1e9), variableCost: number('variableCost', 1e9), fixedCost: number('fixedCost', 1e12), language}, issues};
}
function economics(profile) {
  const {price, variableCost, fixedCost, language} = profile;
  const zh = language === 'zh';
  const missing = ['price', 'variableCost', 'fixedCost'].filter(key => profile[key] === null);
  const contribution = price !== null && variableCost !== null ? round(price - variableCost) : null;
  const marginRate = contribution !== null && price > 0 ? round(contribution / price) : null;
  const breakEvenCustomers = contribution !== null && contribution > 0 && fixedCost !== null ? Math.ceil(fixedCost / contribution) : null;
  const status = contribution === null ? 'unknown' : contribution < 0 ? 'negative-margin' : contribution === 0 ? 'zero-margin' : missing.length ? 'unknown' : 'viable-margin';
  let note = zh ? '按输入的同一货币、同一周期估算；变动成本需含推理、支付、退款、人工交付等，固定成本需含维护与支持。未计入的成本仍未知，正贡献额不是已实现利润。' : 'Estimate uses the same currency and period across your inputs. Variable costs should include inference, payment fees, refunds and delivery labour; fixed costs should include maintenance and support. Omitted costs remain unknown. A positive contribution is not realized profit.';
  if (contribution !== null && contribution <= 0) note = (zh ? '每单贡献额不为正，当前条件下增加销量不能覆盖固定成本；先调整价格、交付范围或成本。' : 'Contribution per sale is not positive; more sales cannot cover fixed costs under these inputs. Change price, scope or cost first.') + ' ' + note;
  if (missing.length) note += zh ? ` 未填写：${missing.join('、')}，没有假设它们为零。` : ` Missing: ${missing.join(', ')}. These are not assumed to be zero.`;
  return {status, currency: 'same-input-unit', price, variableCost, fixedCost, contribution, marginRate, breakEvenCustomers, missing, note};
}
function evidence(hit, language) {
  const item = hit.case, zh = language === 'zh';
  const englishOr = (value, fallback) => /[\u3400-\u9fff]/u.test(value) ? fallback : value;
  return {id: item.id, name: zh ? item.name : item.nameEn || item.name, outcome: item.outcome, scope: item.scope, category: zh ? item.category : item.categoryEn || 'Category translation unavailable', summary: zh ? item.summary : item.summaryEn || 'An English summary is not available; inspect the linked original source.', observedAt: item.observedAt, metrics: item.metrics.map(metric => ({label: zh ? metric.label : metric.labelEn || metric.kind || 'Reported metric', value: zh ? metric.value : metric.valueEn || englishOr(metric.value, 'See original metric; translation unavailable'), period: zh ? metric.period : metric.periodEn || englishOr(metric.period, 'Period translation unavailable'), kind: metric.kind})), sources: item.sources.filter(source => !PENDING_STATUSES.has(source.status)).map(source => ({url: source.url, title: zh ? source.title : source.titleEn || englishOr(source.title, `${item.nameEn || item.name} source`), publishedAt: source.publishedAt, evidence: zh ? source.evidence : source.evidenceEn || englishOr(source.evidence, 'See linked original evidence'), supports: zh ? source.supports : source.supportsEn || 'See the original source for support details.'})), drivers: item.drivers.map(driver => ({text: zh ? driver.text : driver.textEn || 'An English explanation is unavailable; the original source must be checked.', kind: driver.kind, sourceUrl: driver.sourceUrl})), risks: zh ? item.risks : item.risksEn, soloRelevance: zh ? item.soloRelevance : item.soloRelevanceEn || 'Team scale and execution constraints need to be checked before adapting this case.', relevance: hit.score, matchedMechanisms: hit.matchedMechanisms, qualification: zh ? '来源所述时期的观察；商业成功可指收入或用户市场认可，不能由此推定盈利或今天仍有相同表现。企业案例不证明单人可以复制。' : 'An observation for the source period. Commercial success may mean revenue or user adoption; it does not establish profitability or the same performance today. A company case does not prove solo feasibility.'};
}

function acquisitionRoutes(profile, mechanisms) {
  const zh = profile.language === 'zh';
  const customer = profile.customer || (zh ? '一个你能触达且有明确购买决策人的细分客户群' : 'one reachable customer segment with an identifiable buyer');
  const targeted = mechanisms.includes('commerce') || mechanisms.includes('image') || mechanisms.includes('video');
  const developer = mechanisms.includes('coding') || mechanisms.includes('workflow');
  const route = targeted ? (zh ? '现有商家关系与行业社群' : 'Existing merchant relationships and industry communities') : developer ? (zh ? '开发者社群与公开工作流演示' : 'Developer communities and public workflow demonstrations') : (zh ? '已有关系与客户所在社区' : 'Existing relationships and customer communities');
  return [{channel: route, action: zh ? `围绕${customer}的一个重复任务制作前后对照，先联系愿意接受访谈的人，问最近一次真实损失、现用替代方案及谁付钱；不把点赞当购买。` : `Show a before-and-after example for one repeated task faced by ${customer}. Invite willing participants to discuss their most recent loss, current alternative and payer. Likes are not purchases.`, metric: zh ? '分别记录合适触达人数、有效对话、试交付、实际付款与复购；点击单列。' : 'Count qualified reach, substantive conversations, pilot deliveries, actual payments and repeat purchases separately from clicks.', stopRule: zh ? '触达不足先换渠道；有有效对话但没有痛点或付费意愿，再修改问题与报价。' : 'If reach is insufficient, test another channel. If substantive conversations reveal little pain or willingness to pay, revise the problem and offer.'}, {channel: zh ? '搜索与案例内容' : 'Search and case content', action: zh ? '发布一篇细分任务的操作演示与可下载结果，写清价格、来源、局限和下一步；BPJ内链到相应工具。搜索流量需要时间，不作为14天唯一获客渠道。' : 'Publish a practical walkthrough for the specific task with a downloadable result, price, sources, limits and next step. Link the relevant BPJ tool. Search traffic takes time; use another acquisition channel during the 14-day test.', metric: zh ? '合适访问→工具完成→方案导出→真实报价请求→已验证付款。' : 'Qualified visits → tool completion → plan export → genuine quote request → verified payment.', stopRule: zh ? '只有抓取或展示没有真实使用时，不扩大内容生产或广告开支。' : 'If there are only crawler hits or impressions without real use, hold content and advertising expansion.'}];
}
function mechanismCheck(id, language) {
  const checks = {
    image: ['先与客户约定图像风格、商用授权、尺寸和可接受返工次数，记录每张最终可用图片的完整成本。', 'Agree image style, commercial rights, dimensions and rework limits; record the complete cost of each accepted image.'],
    coding: ['在客户现有开发流程中测量一项任务的前后耗时与缺陷，不用生成代码行数替代交付质量。', 'Measure task time and defects inside the customer’s existing development workflow; generated line counts are not delivery quality.'],
    video: ['固定一条视频的时长、素材权利、画幅与修改次数，以客户验收的成片作为计量单位。', 'Fix duration, material rights, aspect ratio and revision limits; measure a customer-accepted final video.'],
    audio: ['核对声音和音乐使用权，以可验收的音频时长与返工次数估算交付成本。', 'Check voice and music rights; estimate cost using accepted audio duration and rework.'],
    writing: ['要求一项有具体用途、来源可检查的内容交付，记录编辑时间和客户后续是否继续使用。', 'Deliver content for one specific use with checkable sources; record editing time and whether the customer continues using it.'],
    commerce: ['围绕同一卖家的单一商品任务交付，区分素材验收、商品转化和最终销售收入。', 'Deliver one product task for the same merchant; separate asset acceptance, conversion and final sales revenue.'],
    support: ['从客户已有知识库选一个可核查的客服任务，记录回答正确率、人工转接、数据边界与每次解决成本。', 'Choose one checkable support task from the customer’s existing knowledge base; record answer accuracy, human handoffs, data boundaries and cost per resolution.'],
    workflow: ['核对输入、输出与接入条件，在原工作流中测量返工和节省时间。', 'Check inputs, outputs and integration requirements; measure rework and time saved in the existing workflow.'],
    website: ['先选一个能够完成任务的站内入口，测量实际完成与真实询盘，不把上线页数当需求。', 'Start with one page that completes a task; measure actual completion and real inquiries rather than page count.'],
    search: ['选一个具体搜索问题与下一步行动，区分抓取、展示、真人点击和工具完成。', 'Choose one specific search problem and next action; separate crawling, impressions, human clicks and tool completion.'],
    audience: ['先核对自己已有受众是否包含购买人，并同时测试一个不依赖单一平台的触达入口。', 'Check whether an existing audience includes buyers and test an additional acquisition route beyond one platform.'],
    service: ['将一次交付的范围、验收与修改次数写入报价，用实际工时核算服务贡献额。', 'Put scope, acceptance and revision limits into the offer and calculate contribution with actual labour time.'],
    subscription: ['用实际续用或复购验证重复价值；14天意向不能代替长期留存与获客回本。', 'Validate repeated value through actual repeat use or purchase; 14-day intent does not establish long-term retention or acquisition payback.'],
    pricing: ['对有购买条件的客户提出明确报价，记录真实付款与拒绝原因，不把口头意向当成交。', 'Give qualified buyers an explicit offer and record actual payment and rejection reasons; verbal intent is not a transaction.'],
    cost: ['将推理、支付、退款、人工交付和维护分别核算，成本未知时先限制用量与承诺。', 'Separate inference, payments, refunds, labour and maintenance costs; cap usage and promises while costs remain unknown.'],
    validation: ['先问最近一次问题与替代方案，再测试愿意付款的具体成果；没有触达不等于没有需求。', 'Ask about the latest problem and existing alternative, then test a specific payable outcome; no reach does not mean no demand.'],
    reliability: ['与客户共同定义可检查的质量标准，记录失败率、人工复核与退款成本。', 'Define inspectable quality criteria with the customer; record errors, human review and refund costs.'],
    platform: ['列出模型或平台升级可能替代的能力，保留客户关系和可迁移数据，再验证自己的交付价值。', 'List capabilities that a model or platform upgrade could replace, retain customer relationships and portable data, and validate your delivery value.'],
    privacy: ['先确认客户数据、商用授权与行业限制，不用未经许可的素材验证商业需求。', 'Check customer data, commercial rights and industry constraints; do not test demand using unlicensed materials.'],
    hardware: ['先用不采购量产设备的演示验证需求；制造、库存、退货与认证资金仍需独立核算。', 'Test demand with a demonstration before buying production hardware; manufacturing, inventory, returns and certification need separate financing.'],
    ads: ['核对已有真人触达与广告履约能力，先取得合适报价请求，不把曝光当广告收入。', 'Check real human reach and advertising fulfillment, seek qualified quote requests, and do not count impressions as advertising revenue.'],
  };
  return checks[id]?.[language === 'zh' ? 0 : 1] || '';
}
function contrastPatterns(corpus, matchedCases, mechanisms, language) {
  const zh = language === 'zh';
  return corpus.mechanisms.filter(pattern => mechanisms.includes(pattern.id)).slice(0, 5).map(pattern => {
    const reasons = outcome => matchedCases.filter(item => item.outcome === outcome && item.matchedMechanisms.includes(pattern.id)).slice(0, 2).flatMap(item => {
      const driver = item.drivers.find(value => mechanismIDs(value.text).includes(pattern.id)) || item.drivers[0];
      return driver?.text ? [{caseId: item.id, caseName: item.name, text: driver.text, kind: driver.kind, sourceUrl: driver.sourceUrl || item.sources[0]?.url || ''}] : [];
    });
    const successReasons = reasons('success'), failureReasons = reasons('failure');
    const description = reason => `${reason.caseName}: ${reason.text} (${reason.kind === 'reported' ? (zh ? '来源陈述' : 'source report') : (zh ? '案例作者推断' : 'case-author inference')})`;
    const count = zh ? `当前收录中涉及“${pattern.label.zh}”的成功案例${pattern.successCount}个、失败案例${pattern.failureCount}个。频次不是成功率，案例解释不能单独证明原因。` : `The selected collection contains ${pattern.successCount} success and ${pattern.failureCount} failure cases mentioning ${pattern.label.en.toLowerCase()}. Frequency is not a success rate, and case explanations alone cannot prove causes.`;
    const contrast = [successReasons.length ? (zh ? '成功对照：' : 'Success comparison: ') + successReasons.map(description).join('; ') : '', failureReasons.length ? (zh ? '失败对照：' : 'Failure comparison: ') + failureReasons.map(description).join('; ') : ''].filter(Boolean).join(' ');
    const testableGuidance = mechanismCheck(pattern.id, language);
    return {id: pattern.id, title: pattern.label[language], observation: [count, contrast, testableGuidance].filter(Boolean).join(' '), successIds: pattern.successIds, failureIds: pattern.failureIds, successReasons, failureReasons, testableGuidance};
  });
}
function baseExperiments(profile, references, mechanisms) {
  const zh = profile.language === 'zh';
  const budgetNote = profile.budget === null ? (zh ? '预算未知：先设定14天可承受损失上限，再承诺现金开支。' : 'Budget unknown: set an affordable 14-day loss cap before committing cash.') : profile.budget === 0 ? (zh ? '现金预算为0：用已有设备、手工交付和可合法商用的免费额度，人工时间仍计入成本。' : 'Cash budget is zero: use existing equipment, manual delivery and commercially permitted free quotas. Labour still has a cost.') : (zh ? `14天总现金开支不超过输入预算${profile.budget}；先记录每次交付真实成本。` : `Keep total 14-day cash spending within your input budget of ${profile.budget}; measure real delivery cost first.`);
  const timeNote = profile.hours === null ? (zh ? '每周可用时间未知，先补交付工时。' : 'Weekly availability is unknown; estimate delivery time first.') : (zh ? `两周可用时间上限约${profile.hours * 2}小时；范围必须装进这个上限。` : `Available time over two weeks is at most about ${profile.hours * 2} hours; scope must fit this limit.`);
  const checks = mechanisms.slice(0, 2).map(id => mechanismCheck(id, profile.language)).filter(Boolean).join(' ');
  return [{days: '1–3', title: zh ? '确认真实问题与购买人' : 'Identify a real problem and buyer', action: zh ? '与5位合适潜在客户聊最近30天的具体任务，记录替代方案、损失、使用频次与谁能批准付款。' : 'Discuss a task from the past 30 days with 5 qualified potential customers. Record alternatives, loss, frequency and who can approve payment.', measure: zh ? '有效访谈与能描述最近真实问题的人数。' : 'Substantive interviews and customers able to describe a recent real problem.', gate: zh ? '建议决策门：至少3人有近期同类问题，至少1人能指出购买决策人；这是试验规则，不是统计保证。' : 'Proposed decision gate: at least 3 have a recent similar problem and at least 1 identifies a buyer. This is an operating rule, not statistical assurance.', stopRule: zh ? '未达标先改客户细分；没有约到访谈，不能判断需求不存在。' : 'If unmet, change the segment. If interviews did not happen, absence of demand has not been demonstrated.', budgetNote, evidenceIds: references}, {days: '4–7', title: zh ? '手工交付一个窄任务' : 'Manually deliver one narrow task', action: (zh ? '给2位愿意试用的人交付可检查的结果，记录返工、耗时、模型与第三方成本。先只做一项能验收的承诺。' : 'Deliver an inspectable result to 2 willing testers. Record rework, labour, model and third-party costs. Start with one promise that can be checked.') + (checks ? ' ' + checks : ''), measure: zh ? '达到验收标准的交付数、每单人工小时与现金成本。' : 'Accepted deliveries, labour hours and cash cost per sale.', gate: zh ? '建议决策门：至少1次被客户验收；交付范围能放进两周时间上限。' : 'Proposed decision gate: at least 1 customer-accepted delivery and a scope that fits the two-week time limit.', stopRule: zh ? '结果无法可靠验收就缩小范围或停做；先不自动化放大。' : 'Reduce scope or stop if results cannot be accepted reliably; defer automation expansion.', budgetNote: `${budgetNote} ${timeNote}`, evidenceIds: references}, {days: '8–10', title: zh ? '提出明确的付费试点' : 'Offer an explicit paid pilot', action: zh ? '向5位有相同问题且具备购买条件的人给出清晰报价、交付物、修改次数和退款边界，记录真实成交与未成交原因。' : 'Give 5 qualified buyers a clear price, deliverable, revision limit and refund terms. Record actual transactions and reasons for non-purchase.', measure: zh ? '合适报价请求数、实际付款数、每单贡献额；意向与付款分开。' : 'Qualified offers, actual payments and contribution per sale; intent and payment are separate.', gate: zh ? '建议决策门：至少1笔真实付款，已知变动成本下贡献额为正；未知成本必须补测。' : 'Proposed decision gate: at least 1 actual payment and positive contribution after known variable costs; measure unknown costs.', stopRule: zh ? '5个合适报价都未付款，先区分信任、报价、需求和渠道原因，再修改一次；不靠追加广告掩盖问题。' : 'If none of 5 qualified offers pays, separate trust, pricing, demand and channel causes before revising once; do not mask the issue with more advertising.', budgetNote, evidenceIds: references}, {days: '11–14', title: zh ? '验证复用与是否继续' : 'Check repeatability and decide whether to continue', action: zh ? '争取第二位独立付费客户或真实复购；复盘获客时间、交付返工、贡献额与客户结果，决定继续手工、缩小问题或停止。' : 'Seek a second independent paying customer or an actual repeat purchase. Review acquisition time, rework, contribution and customer outcome, then continue manually, narrow the problem or stop.', measure: zh ? '独立付款/复购、总交付工时、退款与贡献额。' : 'Independent payments or repeat purchases, delivery hours, refunds and contribution.', gate: zh ? '建议决策门：至少2笔可核实的付款或1次复购，交付可控且贡献额为正；达标只支持继续小规模验证。' : 'Proposed decision gate: at least 2 verifiable payments or 1 repeat purchase, controlled delivery and positive contribution. Passing supports further small-scale testing only.', stopRule: zh ? '达不到门槛先保留证据再暂停扩大；没有足够触达时延长获客验证并保持原预算。' : 'If unmet, retain the evidence and pause expansion. If reach was insufficient, extend acquisition testing within the original budget.', budgetNote: `${budgetNote} ${timeNote}`, evidenceIds: references}];
}
function experiments(profile, references, mechanisms) {
  const zh = profile.language === 'zh';
  const steps = baseExperiments(profile, references, mechanisms);
  if (profile.hours === 0) return [{days: zh ? '未排期' : 'Unscheduled', title: zh ? '先解决执行时间缺口' : 'Resolve the execution-time gap first', action: zh ? '当前每周可用工时为0，不安排客户访谈、交付或获客任务。先明确可投入时间；如选择委托，补充授权范围和真实人工成本后重新生成计划。' : 'Weekly availability is zero, so customer interviews, delivery and acquisition are not scheduled. Allocate time first. If delegating, specify the authorized scope and real labour costs before rebuilding this plan.', measure: zh ? '明确可投入工时或委托成本。' : 'Specified availability or delegation cost.', gate: zh ? '只有确认有人且有时间负责执行，才启动14天验证。' : 'Start a 14-day test only after a responsible person has confirmed execution time.', stopRule: zh ? '时间和职责未确认时保持暂停，不增加现金承诺。' : 'Remain paused without confirmed time and responsibility; make no new cash commitments.', budgetNote: steps[0].budgetNote, evidenceIds: references}];
  const stage = profile.stage.toLowerCase();
  if (['prototype', 'prelaunch', '原型'].includes(stage)) {
    Object.assign(steps[0], {title: zh ? '用现有原型核对任务与购买人' : 'Check the task and buyer with the existing prototype', action: zh ? '向5位合适潜在客户演示现有原型，让他们带入最近30天的真实任务，记录哪里能完成、哪里卡住、现有替代及谁批准付款；先不继续扩功能。' : 'Show the existing prototype to 5 qualified potential customers using a real task from the past 30 days. Record completed steps, blockers, alternatives and who approves payment; hold feature expansion.', measure: zh ? '实际试用、任务完成、最近真实问题与购买人。' : 'Actual trials, task completion, recent problems and the buyer.'});
    Object.assign(steps[1], {title: zh ? '测试原型的窄交付闭环' : 'Test one narrow end-to-end prototype task', action: (zh ? '让2位愿意试用的人用现有原型完成同一窄任务，只修阻止验收的一个问题，记录耗时、返工和模型成本。' : 'Have 2 willing testers complete the same narrow task with the existing prototype. Fix one acceptance-blocking issue and record time, rework and model cost.') + ' ' + mechanisms.slice(0, 2).map(id => mechanismCheck(id, profile.language)).join(' ')});
  }
  if (['users', 'launched', '有用户'].includes(stage)) {
    Object.assign(steps[0], {title: zh ? '核对已有用户的实际任务' : 'Inspect existing users’ actual tasks', action: zh ? '从已有用户中选择5位近期真实使用者，复核他们完成了什么、为什么继续使用、免费替代和购买人；区分注册、活跃与核心任务完成。' : 'Review 5 recent real users: what they completed, why they return, free alternatives and the buyer. Separate registration, activity and core-task completion.', measure: zh ? '真实完成、再次使用、购买条件与未付费原因。' : 'Actual completion, return use, buying conditions and nonpayment reasons.', gate: zh ? '建议决策门：至少3位完成核心任务，至少1位能说明愿意付费的具体成果；不把活跃直接算收入。' : 'Proposed gate: at least 3 complete the core task and at least 1 identifies a specific payable outcome. Activity is not revenue.'});
    Object.assign(steps[1], {title: zh ? '修一个影响重复价值的问题' : 'Fix one problem affecting repeated value', action: zh ? '与2位现有用户复测一项使用障碍或质量缺口，记录修复前后任务完成、返工与成本；不为了收费重建产品。' : 'Retest one usage or quality problem with 2 existing users. Measure task completion, rework and cost before and after; do not rebuild the product merely to charge.'});
    Object.assign(steps[2], {action: zh ? '向5位已有使用价值且具备购买条件的用户提出明确付费范围，记录真实付款、免费替代是否足够及未购买原因；原有免费承诺需保留。' : 'Offer a clear paid scope to 5 existing users with demonstrated value and buying conditions. Record actual payments, whether a free alternative suffices and rejection reasons. Preserve existing free commitments.'});
  }
  if (['revenue', 'paid', '有收入', '已有收入'].includes(stage)) {
    Object.assign(steps[0], {title: zh ? '复核现有收入与成本' : 'Reconcile existing revenue and costs', action: zh ? '按同一期间复核现有付款、退款、变动成本、交付工时与用户批次；找出一个贡献额、退款或留存问题。已有收入不需要从首次客户访谈重新开始。' : 'Reconcile payments, refunds, variable costs, delivery hours and customer cohorts for the same period. Identify one contribution, refund or retention problem; do not restart first-customer discovery.', measure: zh ? '已确认收入、退款、每单贡献额、交付与获客工时、批次留存。' : 'Confirmed revenue, refunds, contribution per sale, delivery and acquisition hours, and cohort retention.', gate: zh ? '建议决策门：至少能完整核算一个真实客户或批次；账目与成本不完整则先补测。' : 'Proposed gate: reconcile at least one real customer or cohort completely. Measure missing accounts or costs first.', stopRule: zh ? '核算后贡献额不为正时暂停扩大，先改价格、用量或交付范围。' : 'Pause expansion if reconciled contribution is not positive; revise price, usage or scope first.'});
    Object.assign(steps[1], {title: zh ? '只优化一个现有交付瓶颈' : 'Improve one existing delivery bottleneck', action: (zh ? '在2位现有付费客户的同类任务上，只改一个质量、支持或交付成本瓶颈；对照改动前后验收、返工、工时与成本。' : 'Change one quality, support or delivery-cost bottleneck for comparable tasks from 2 existing paying customers. Compare acceptance, rework, hours and cost.') + ' ' + mechanisms.slice(0, 2).map(id => mechanismCheck(id, profile.language)).join(' '), gate: zh ? '建议决策门：至少1位付费客户确认结果可用，记录贡献额改善且质量不下降；小样本不证明因果。' : 'Proposed gate: at least 1 paying customer accepts the result, with recorded contribution improvement and no quality decline. A small sample does not prove causality.'});
    Object.assign(steps[2], {title: zh ? '验证续用、复购或现有付费范围' : 'Test continued use, repeat purchase or the existing paid scope', action: zh ? '优先复核现有客户续用/复购障碍；如调整报价，只向有真实需求的客户提出可履约范围并记录接受、拒绝与退款，不以涨价意向代替收入。' : 'Review barriers to continued use or repeat purchase among existing customers. If revising an offer, present a fulfillable scope to customers with a real need and record acceptance, rejection and refunds. Pricing intent is not revenue.', measure: zh ? '真实续用/复购、确认收款、退款与每单贡献额。' : 'Actual continued use or repeat purchases, confirmed receipts, refunds and contribution per sale.', gate: zh ? '建议决策门：至少1次真实复购/续费，或已付费客户继续完成任务且贡献额为正；正常周期超过14天时只记早期信号。' : 'Proposed gate: at least 1 actual repeat purchase/renewal, or an existing paying customer continues completing the task with positive contribution. If the normal cycle exceeds 14 days, record early signals only.'});
    Object.assign(steps[3], {title: zh ? '按贡献额与留存决定是否扩大' : 'Decide whether to expand using contribution and retention', action: zh ? '将真实收款、退款、交付/获客时间、单位贡献和批次留存与同口径基线比较，决定保留、回退或小范围扩大；周期未结束时延长观察，不判失败。' : 'Compare actual receipts, refunds, delivery/acquisition time, contribution and cohort retention with a consistent baseline. Keep, revert or expand cautiously. Extend observation if the normal cycle has not ended; do not classify that as failure.', gate: zh ? '建议决策门：贡献额为正、交付可控、至少1位现有客户保持实际使用且无质量恶化；这只支持继续验证，不证明增长可持续。' : 'Proposed gate: positive contribution, controlled delivery, at least 1 existing customer continuing actual use and no quality deterioration. This supports more testing, not a claim of sustainable growth.', stopRule: zh ? '贡献额或质量恶化先回退；尚未到续费/复购周期时保留原预算继续观察。' : 'Revert if contribution or quality worsens. If a renewal/repurchase cycle has not arrived, continue observation within the original budget.'});
  }
  return steps;
}
function siteRecommendations(language) {
  const zh = language === 'zh';
  return [
    {title: zh ? '让用户完成一项具体工具选择' : 'Help users complete one concrete tool decision', action: zh ? '将案例连接到BPJ已有工具选择、额度核查和操作内容，按同一任务、单位和周期比较选项；显示来源、未知和可执行下一步，先测实际任务完成与回访。' : 'Connect cases to existing BPJ selection aids, allowance checks and practical content. Compare options for the same task, unit and period, expose sources and unknowns, and give an executable next step. Measure real task completion and return use first.', metric: zh ? '合适访问、工具选择完成、实际使用、方案导出与回访分开记录；不收集咨询输入。' : 'Measure qualified visits, completed decisions, actual use, exports and return visits separately; never collect consultation inputs.', gate: zh ? '未有重复任务证据前，不用新增付费功能、服务或目录数量代替需求验证。' : 'Without repeated-task evidence, do not substitute more paid features, services or directories for demand validation.'},
    {title: zh ? '核对现有权益和真实佣金链路' : 'Verify existing entitlements and real commission paths', action: zh ? '仅对确有需要的用户说明现有账户收藏与会员云工作区权益及免费本机替代；厂商另走已有加急核实/明示赞助入口。联盟收入只采用已获批计划、有效归因与可核对佣金；不新增报价或挪用会员/广告支付。' : 'Describe existing account bookmarks and membership cloud-workspace entitlements, with free local alternatives, only when relevant. Vendors use existing expedited-verification or clearly marked sponsorship paths. Affiliate revenue requires an approved program, valid attribution and verifiable commission; do not add offers or repurpose membership/advertising checkout.', metric: zh ? '实际收藏/云功能需求、正确权益确认付款、厂商订单与确认佣金单列；普通原厂出站点击不是本站收入。' : 'Record actual bookmark/cloud needs, entitlement-correct payments, vendor orders and confirmed commissions separately. Ordinary vendor outbound clicks are not BPJ revenue.', gate: zh ? '权益与付款readiness未核验就保持未知；没有批准的联盟资格和确认佣金不报告联盟收入。' : 'Keep entitlement and payment readiness unknown until verified; no approved affiliate eligibility and confirmed commission means no reported affiliate revenue.'},
    {title: zh ? '让证据与发现同步更新' : 'Keep evidence and discovery in sync', action: zh ? '新增或更改案例时重算模型与指导；同步可见内容、结构化数据、中文/英文、sitemap和AI可读镜像。部署后按现有流程核对SEO、GEO、GA4与IndexNow。' : 'Recompute the model and guidance when cases change. Keep visible content, structured data, translations, sitemap and AI-readable mirrors consistent. Follow existing SEO, GEO, GA4 and IndexNow checks after deployment.', metric: zh ? '来源可用性、真实工具使用、合适询盘与已验证收入；索引和AI引用单列。' : 'Source availability, real tool usage, qualified inquiries and verified revenue; indexing and AI citations are separate.', gate: zh ? '发布与提交回执不代表已收录、已被引用或已产生营收。' : 'Publication and submission receipts do not establish indexing, citation or revenue.'},
  ];
}

/** Template-based local Agent: evidence-grounded recommendations, not an LLM. */
export function generatePlan(input, suppliedModel, rawProfile) {
  const cases = normalizeCases(input);
  const {profile, issues} = validateProfile(rawProfile);
  const zh = profile.language === 'zh';
  const model = currentModel(cases, suppliedModel);
  const query = [profile.question, profile.skill, profile.customer].filter(Boolean).join(' ').slice(0, MAX_QUERY);
  const primaryQuery = profile.question || profile.customer || profile.skill;
  const domainHint = taskDomains(primaryQuery);
  const successes = retrieveCases(cases, model, query, {outcome: 'success', limit: 3, primaryQuery, domainHint}).map(hit => evidence(hit, profile.language));
  const failures = retrieveCases(cases, model, query, {outcome: 'failure', limit: 3, primaryQuery, domainHint}).map(hit => evidence(hit, profile.language));
  const matchedCases = [...successes, ...failures];
  const matched = matchedCases.length > 0;
  const status = !model.caseIds.length ? 'no-data' : !matched ? 'needs-context' : 'matched';
  const corpus = analyzePatterns(cases);
  const mechanismMatches = unique(matchedCases.flatMap(item => item.matchedMechanisms));
  const patterns = contrastPatterns(corpus, matchedCases, mechanismMatches, profile.language);
  const unknowns = [...issues];
  if (!profile.customer) unknowns.push(zh ? '未确定谁遇到问题、谁付钱，以及如何触达购买人。' : 'The affected user, payer and route to the buyer are not specified.');
  if (!profile.skill) unknowns.push(zh ? '现有技能与可交付成果未知。' : 'Current skills and deliverable outputs are not specified.');
  if (profile.budget === null) unknowns.push(zh ? '现金预算未知，没有假设能承担API、广告或订阅开支。' : 'Cash budget is unknown; API, advertising and subscription affordability is not assumed.');
  if (profile.hours === null) unknowns.push(zh ? '每周可用工时未知，没有假设能持续运维产品。' : 'Weekly availability is unknown; sustained maintenance capacity is not assumed.');
  if (profile.hours === 0) unknowns.push(zh ? '可用工时为0：无法执行交付试验，先调整时间或委托并补计成本。' : 'Available hours are zero: delivery experiments cannot run until time is allocated or delegation costs are included.');
  if (!successes.length) unknowns.push(zh ? '未找到与当前描述相符且带可用来源的成功案例，不能提供成功对照。' : 'No matching sourced success case was found; a success comparison is unavailable.');
  if (!failures.length) unknowns.push(zh ? '未找到与当前描述相符且带可用来源的失败案例，不能视为没有失败风险。' : 'No matching sourced failure case was found; this does not establish absence of failure risk.');
  const unitEconomics = economics(profile);
  const limitations = zh ? ['本地Agent由文本检索、真实训练的小型去噪自编码器与确定性方案模板组成，不是通用大语言模型。', '网络仅学习文本相关模式；相关度不是成功概率，也不能证明成功或失败的因果关系。', '收录样本有选择偏差，创始人自报、用户数、收入、利润、融资和收购应分开阅读。', '指导不保证收入、利润、用户增长或商业成功，所有经营假设都需要现实验证。', '模型随已审核案例内容变动而重训；联网搜集和来源复核需经过数据维护流程，不会在咨询时实时抓取。', '个人输入仅在本地运算；本模块不联网、不保存、不发送咨询内容。'] : ['This local Agent combines text retrieval, an actually trained small denoising autoencoder and deterministic plan templates; it is not a general language model.', 'The network learns related-text patterns. Relevance is not a success probability and cannot establish causes of success or failure.', 'The selected corpus has selection bias. Founder reports, user counts, revenue, profit, funding and acquisitions must be interpreted separately.', 'Guidance guarantees no income, profit, user growth or commercial success; operating hypotheses require real-world validation.', 'The model retrains when reviewed case content changes. Source research and review use the data-maintenance workflow; consultations do not crawl the web.', 'Personal inputs are processed locally; this module makes no network, storage or consultation-content transmission calls.'];
  let summary = !model.caseIds.length ? (zh ? '当前没有可用的带来源案例。无法生成案例指导，先补充核实后的案例；可以先填写客户、任务与成本。' : 'There are no eligible sourced cases. Evidence-based guidance is unavailable; add reviewed cases and specify the customer, task and costs.') : !matched ? (zh ? '没有找到与你的描述实质匹配的案例。先补充具体客户、重复任务、已有技能与付费方式；当前只给需求验证框架，不把无关案例硬套成赚钱建议。' : 'No case substantially matches your description. Specify the customer, repeated task, existing skills and payment model. The current output is a demand-validation framework without unrelated case recommendations.') : (zh ? `找到${successes.length}个成功与${failures.length}个失败对照。优先验证一个可验收、可付费的窄任务，再根据真实交付和成本决定是否扩大。案例仅是各自来源日期的观察。` : `Found ${successes.length} success and ${failures.length} failure comparisons. Validate one inspectable, payable task, then decide whether to expand using actual delivery and cost evidence. Cases reflect their source periods.`);
  if (unitEconomics.contribution !== null && unitEconomics.contribution <= 0) summary += zh ? ' 当前单位贡献额不为正，先调整报价或成本，再进行付费扩张。' : ' Current unit contribution is not positive; revise price or cost before expanding paid delivery.';
  if (profile.hours === 0) summary += zh ? ' 当前工时为0，计划只能作为待执行草案。' : ' With zero available hours, this is a draft for future execution.';
  const references = matchedCases.map(item => item.id);
  const steps14days = experiments(profile, references, mechanismMatches);
  const siteUpgrades = siteRecommendations(profile.language);
  const avoidance = zh ? ['先确认可商用授权、客户资料处理边界与输出质量，交付前人工检查。', '收入、利润、活跃用户、累计用户、融资和收购分开记录；历史成绩不当作当前承诺。', '不以低价无限额度启动；设交付范围、修改次数与用量上限，并记录真实成本。', '平台与模型能力会改变，保留可迁移的数据和客户关系，不把套壳本身视为护城河。', '企业案例的资本、团队与渠道不可直接复制到单人业务；以两周工时和现金上限调整范围。', ...failures.flatMap(item => item.risks).slice(0, 4)] : ['Check commercial rights, customer-data handling and output quality; manually inspect deliveries.', 'Separate revenue, profit, active users, cumulative users, funding and acquisitions. Historical results are not present promises.', 'Avoid low-price unlimited access; define scope, revisions and usage caps, and measure actual costs.', 'Platform and model capabilities change. Retain portable data and customer relationships; a wrapper alone is not a moat.', 'Capital, staffing and distribution in company cases cannot be copied directly into a solo business. Scope to the two-week time and cash limits.', ...failures.flatMap(item => item.risks).slice(0, 4)];
  const questions = zh ? ['你能触达的具体客户是谁，他们最近一次遇到什么重复问题？', '你现有的技能、每周工时和14天可承受现金损失上限是多少？', '客户愿意为哪项可验收成果付费；单价、变动成本和同期固定成本是多少？'] : ['Which specific customers can you reach, and what repeated problem did they face most recently?', 'What skills, weekly hours and affordable 14-day cash-loss cap do you have?', 'Which inspectable outcome would a customer pay for, and what are its price, variable cost and same-period fixed cost?'];
  return {version: 'bpj-ai-solo-plan-v1', language: profile.language, profile, model: {version: model.version, contentHash: model.contentHash, trained: model.trained, training: model.training}, caseVersion: model.contentHash, modelVersion: model.version, matched, status, summary, evidence: {success: successes, failure: failures}, matchedCases, patterns, acquisition: acquisitionRoutes(profile, mechanismMatches), experiments: steps14days, steps14days, avoidance, unitEconomics, siteUpgrades, siteRecommendations: siteUpgrades, unknowns, caveats: limitations, limitations, questions};
}

/** Portable, readable plan; all dynamic values remain text, never executable markup. */
export function planMarkdown(plan) {
  if (!plan || typeof plan !== 'object') return '';
  const zh = plan.language !== 'en';
  const lines = [zh ? '# AI Solo 商业化验证方案' : '# AI Solo commercialization validation plan', '', string(plan.summary, 6000), '', `${zh ? '案例版本' : 'Case version'}: ${string(plan.caseVersion, 100)}`, `${zh ? '模型版本' : 'Model version'}: ${string(plan.modelVersion, 100)}`, '', zh ? '## 成功与失败对照' : '## Success and failure comparisons', ''];
  for (const item of list(plan.matchedCases)) {
    lines.push(`### ${string(item.name, 150)} (${item.outcome === 'success' ? (zh ? '商业成功' : 'commercial success') : (zh ? '商业失败' : 'commercial failure')})`, '', string(item.summary, 3000), '', `${zh ? '观察日期' : 'Observed at'}: ${string(item.observedAt, 40) || (zh ? '未知' : 'unknown')}`, string(item.qualification, 1500));
    for (const metric of list(item.metrics)) lines.push(`- ${string(metric.label, 150)}: ${string(metric.value, 300)}; ${string(metric.period, 200) || (zh ? '时期未知' : 'period unknown')}; ${string(metric.kind, 80)}`);
    for (const source of list(item.sources)) { const url = httpURL(source.url); if (url) lines.push(`- ${zh ? '来源' : 'Source'}: ${string(source.title, 300)} — ${url} (${string(source.publishedAt, 40) || (zh ? '日期未知' : 'date unknown')})`); }
    lines.push('');
  }
  if (!list(plan.matchedCases).length) lines.push(zh ? '没有匹配的带来源案例，待补充具体客户与任务。' : 'No matching sourced case; specify the customer and task.', '');
  lines.push(zh ? '## 客户获得路线' : '## Customer acquisition', '');
  for (const item of list(plan.acquisition)) lines.push(`### ${string(item.channel, 300)}`, '', string(item.action, 3000), '', `${zh ? '记录' : 'Measure'}: ${string(item.metric, 1500)}`, `${zh ? '停止规则' : 'Stop rule'}: ${string(item.stopRule, 1500)}`, '');
  lines.push(zh ? '## 14天可证伪实验' : '## Falsifiable 14-day experiments', '');
  for (const item of list(plan.steps14days)) lines.push(`### ${string(item.days, 30)}: ${string(item.title, 300)}`, '', string(item.action, 3000), '', `${zh ? '记录' : 'Measure'}: ${string(item.measure, 1500)}`, `${zh ? '决策门' : 'Decision gate'}: ${string(item.gate, 1500)}`, `${zh ? '停止规则' : 'Stop rule'}: ${string(item.stopRule, 1500)}`, string(item.budgetNote, 1500), `${zh ? '对照案例' : 'Comparison cases'}: ${list(item.evidenceIds).map(value => string(value, 100)).join(', ') || (zh ? '无匹配案例' : 'none matched')}`, '');
  lines.push(zh ? '## 单位经济' : '## Unit economics', '');
  const economics = plan.unitEconomics || {};
  for (const key of ['price', 'variableCost', 'fixedCost', 'contribution', 'marginRate', 'breakEvenCustomers']) lines.push(`- ${key}: ${typeof economics[key] === 'number' && Number.isFinite(economics[key]) ? economics[key] : (zh ? '未知' : 'unknown')}`);
  lines.push('', string(economics.note, 3000), '', zh ? '## 失败规避' : '## Failure avoidance', '');
  for (const text of list(plan.avoidance)) lines.push(`- ${string(text, 3000)}`);
  lines.push('', zh ? '## BPJ全站商业化升级' : '## BPJ commercialization upgrades', '');
  for (const item of list(plan.siteRecommendations)) lines.push(`### ${string(item.title, 300)}`, '', string(item.action, 3000), `${zh ? '记录' : 'Measure'}: ${string(item.metric, 1500)}`, `${zh ? '决策门' : 'Decision gate'}: ${string(item.gate, 1500)}`, '');
  lines.push(zh ? '## 未知项与边界' : '## Unknowns and limitations', '');
  for (const text of [...list(plan.unknowns), ...list(plan.limitations)]) lines.push(`- ${string(text, 3000)}`);
  lines.push('', zh ? '## 待补充' : '## Clarifications', '');
  for (const text of list(plan.questions)) lines.push(`- ${string(text, 2000)}`);
  return lines.join('\n') + '\n';
}
