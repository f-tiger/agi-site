// Shared by the build and the browser. No network or model call is required.
export const MODES = {web:{zh:'网页直接用',en:'Open in browser'},download:{zh:'下载安装',en:'Install an app'},deploy:{zh:'需要部署',en:'Run a server'}};
export const PLATFORMS = {browser:'Browser',windows:'Windows',macos:'macOS',linux:'Linux',android:'Android',ios:'iOS',server:'Server'};
export const GITHUB_TOOL_IDS=['excalidraw','drawio','squoosh','localsend','handbrake','shotcut','obs','audacity','joplin','keepassxc','sharex','immich'];
export const normalize = value => String(value || '').normalize('NFKC').toLowerCase().trim().slice(0,160);
export function matchesTool(tool,query,{mode='',platform=''}={}) {
  if(mode && mode!==tool.mode)return false;
  if(platform && !tool.platforms.includes(platform))return false;
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
