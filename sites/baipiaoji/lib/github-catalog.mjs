import curated from '../data/github-tools.json' with {type:'json'};
import discovered from '../data/github-discovery.json' with {type:'json'};
import {TOPICS} from './github-tools.mjs';

// Automatic records describe what was observed; they do not invent installation,
// licensing, hardware or quality judgments from repository popularity.
export function discoveryCard(r) {
  const topic=TOPICS[r.topic]||TOPICS.ai;
  return {id:r.id,name:r.name,repo:r.repo,mode:'review',platforms:['unspecified'],
    category:r.topic,topics:[r.topic],kind:'project',ai:r.topic!=='everyday',
    url:'https://github.com/'+r.repo,sources:['https://github.com/'+r.repo+'#readme'],
    origin:'automatic',discoveredAt:r.discoveredAt,
    task:{zh:topic.zh+' · 查看项目说明',en:topic.en+' · explore the project'},
    description:{zh:'每日自动发现的 '+topic.zh+' 项目。用途分类来自 GitHub 搜索主题；请先阅读官方 README。',en:'Discovered by the daily '+topic.en+' topic search. Read the official README to confirm that it fits your task.'},
    publisherDescription:r.description||'',
    cost:{zh:'费用未人工核实；公开仓库不代表 API、服务或模型权重免费。',en:'Costs have not been reviewed. A public repository does not imply free APIs, services or model weights.'},
    requirements:{zh:'设备、安装方式和硬件要求待核对；以官方 README 为准。',en:'Device, installation and hardware requirements need review against the official README.'},
    caution:{zh:'自动收录：仓库活跃且 README 可达；未安装实测，不构成安全或易用性推荐。',en:'Automatic listing: active repository and reachable README. No installation test, security assessment or usability endorsement.'},
    steps:{zh:['打开官方仓库，确认用途与演示是否符合需求。','阅读安装、设备、许可证及 API 费用说明。','按官方文档操作；不确定时先查看 Issues 和维护记录。'],en:['Open the official repository and check its purpose and demo.','Review installation, device, license and API cost requirements.','Follow the official docs; consult issues and maintenance history if uncertain.']},
    keywords:r.repo+' '+topic.zh+' '+topic.en+' '+(r.topics||[]).join(' '),
    github:{repo:r.repo,stars:r.stars,archived:false,pushedAt:r.pushedAt,license:r.license||null,homepage:r.homepage||'',source:'https://github.com/'+r.repo,checkedAt:r.checkedAt}};
}
export function mergeCatalog(editorial,automatic) {
  const ids=new Set(editorial.tools.map(t=>t.id)),repos=new Set(editorial.tools.map(t=>t.repo.toLowerCase()));
  const added=(automatic.tools||[]).filter(t=>{if(t.active===false||ids.has(t.id)||repos.has(t.repo.toLowerCase()))return false;ids.add(t.id);repos.add(t.repo.toLowerCase());return true;}).map(discoveryCard);
  return {...editorial,discoveryCheckedAt:automatic.checkedAt||null,curatedCount:editorial.tools.length,automaticCount:added.length,tools:[...editorial.tools,...added]};
}
export const GITHUB_TOOLS=mergeCatalog(curated,discovered);
