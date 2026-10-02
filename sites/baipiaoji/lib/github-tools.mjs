// Shared by the build and the browser. No network or model call is required.
export const MODES = {review:{zh:'先看官方要求',en:'Review official requirements'},web:{zh:'网页直接用',en:'Open in browser'},download:{zh:'下载安装',en:'Install an app'},deploy:{zh:'需要部署',en:'Run a server'},code:{zh:'需要命令行 / 编程',en:'Terminal / coding required'}};
export const KINDS = {project:{zh:'自动发现 · 类型待核对',en:'Automatic · type not reviewed'},app:{zh:'应用工具',en:'Application'},framework:{zh:'开发框架',en:'Developer framework'},model:{zh:'模型与权重',en:'Models & weights'}};
export const TOPICS = {ai:{zh:'全部 AI 项目',en:'All AI projects'},chat:{zh:'AI 聊天助手',en:'AI chat'},local:{zh:'本地模型与推理',en:'Local AI & inference'},knowledge:{zh:'知识库与 AI 搜索',en:'Knowledge & AI search'},agents:{zh:'Agent 与自动化',en:'Agents & automation'},coding:{zh:'AI 编程',en:'AI coding'},image:{zh:'图像创作',en:'Images'},audio:{zh:'语音与音频',en:'Speech & audio'},video:{zh:'视频创作',en:'Video'},models:{zh:'大模型与微调',en:'Models & fine-tuning'},documents:{zh:'OCR 与文档解析',en:'OCR & documents'},everyday:{zh:'日常实用工具',en:'Everyday tools'}};
export const PLATFORMS = {unspecified:'Not reviewed',browser:'Browser',windows:'Windows',macos:'macOS',linux:'Linux',android:'Android',ios:'iOS',server:'Server'};
export const normalize = value => String(value || '').normalize('NFKC').toLowerCase().trim().slice(0,160);
export function matchesTool(tool,query,{mode='',platform='',topic='',kind=''}={}) {
  if(mode && mode!==tool.mode)return false;
  if(platform && !tool.platforms.includes(platform))return false;
  if(kind && kind!==tool.kind)return false;
  if(topic && !(topic==='ai'?tool.ai:tool.topics.includes(topic)))return false;
  const q=normalize(query);if(!q)return true;
  const fields=[tool.name,tool.repo,tool.keywords,...Object.values(tool.task),...Object.values(tool.description)].map(normalize);
  if(q.split(/\s+/).every(term=>fields.some(field=>field.includes(term))))return true;
  // Recognize common task phrases inside a Chinese sentence without sending it to an LLM.
  return /[\u3400-\u9fff]/.test(q) && tool.keywords.split(/\s+/).some(term=>/[\u3400-\u9fff]/.test(term)&&term.length>=2&&q.includes(term));
}
export function githubSearchURL(query) {
  const url=new URL('https://github.com/search');url.searchParams.set('type','repositories');
  url.searchParams.set('q',normalize(query)||'topic:productivity');return url.href;
}
export function parseGithubToolEvent(path,ids) {
  const m=String(path||'').match(/^\/github-tools\/(view|search-hit|search-miss|guide|open|source|expand|share|vendor)\/([a-z0-9-]+)$/);
  if(!m)return null;
  return ['guide','open','source'].includes(m[1]) ? (ids.includes(m[2])?{action:m[1],id:m[2]}:null) : (m[2]==='catalog'?{action:m[1],id:m[2]}:null);
}
