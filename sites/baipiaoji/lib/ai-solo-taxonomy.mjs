// Editorial navigation by customer job, not financial verification or model prediction.
export const jobGroups = [
 ['appearance','形象、美妆与空间设计','Appearance, beauty & interiors','consumer','photo-ai interior-ai headshotpro photoroom glam-up glow-ai glowly-ai glamour-color solo-color-microcase'],
 ['daily-life','记账、习惯与日常小工具','Expenses, habits & daily utilities','consumer','social-wizard monai erly humi-journal'],
 ['wellness','运动、陪伴与情绪支持','Fitness, companionship & emotional support','consumer','vibe-ai yara-ai luca-running'],
 ['ai-clients','AI 客户端与个人助手','AI clients & personal assistants','prosumer','typingmind boltai super-ai poppy brainstory'],
 ['writing-learning','写作、学习与笔记','Writing, learning & notes','prosumer','audiopen jenni-ai'],
 ['media','图像、视频与语音生成','Image, video & voice generation','prosumer','midjourney elevenlabs synthesia heygen coqui'],
 ['content-work','内容复用、营销与演示','Content reuse, marketing & presentations','prosumer','castmagic gamma tome-slides content-goblin contenda-studio jasper'],
 ['coding','编程与应用开发','Coding & app development','prosumer','bolt cursor lovable replit kite builder-ai windsurf github-copilot'],
 ['support','客服与企业知识问答','Support & business knowledge answers','business','sitegpt my-askai docsbot customgpt chatbase'],
 ['knowledge','文档、数据与会议处理','Documents, data & meeting workflows','prosumer','pdf-ai formula-bot julius-ai glean fireflies otter-ai'],
 ['discovery','搜索与资讯发现','Search & news discovery','consumer','neeva-consumer-search artifact'],
 ['legal','法律工作辅助','Legal assistance','business','harvey casetext ross-intelligence donotpay'],
 ['clinical','医疗工作流','Clinical workflows','business','cydoc olive-ai'],
 ['hardware','硬件、机器人与自动驾驶','Hardware, robots & autonomous driving','consumer','humane-ai-pin embodied ghost-autonomy argo-ai cruise-robotaxi anki'],
].map(([id,zh,en,audience,ids])=>({id,zh,en,audience,ids:ids.split(' ')}));
export const audienceLabels={consumer:{zh:'普通消费者',en:'Consumers'},prosumer:{zh:'个人专业用户与创作者',en:'Individual professionals & creators'},business:{zh:'企业与专业机构',en:'Businesses & institutions'}};
const overrides={ 'interior-ai':'prosumer',headshotpro:'prosumer',photoroom:'prosumer',poppy:'consumer','brainstory':'consumer',synthesia:'business',jasper:'business','contenda-studio':'business','builder-ai':'business',glean:'business',fireflies:'business','otter-ai':'business',donotpay:'consumer','ghost-autonomy':'business','argo-ai':'business','cruise-robotaxi':'business'};
export function classificationFor(c){const groups=jobGroups.filter(g=>g.ids.includes(c.id));if(groups.length!==1)throw Error('Case needs exactly one reviewed job group: '+c.id);return {version:1,job:groups[0].id,audience:overrides[c.id]||groups[0].audience,basis:'editorial',sourceUrls:c.sources.map(s=>s.url)};}
export const groupFor=c=>jobGroups.find(g=>g.id===c.classification?.job);
export function validateClassification(cases){const known=new Set(cases.map(c=>c.id));for(const g of jobGroups)for(const id of g.ids)if(!known.has(id))throw Error('Unknown taxonomy case '+id);for(const c of cases){const expected=classificationFor(c);if(JSON.stringify(c.classification)!==JSON.stringify(expected))throw Error('Missing or stale classification '+c.id);}return true;}
export function signalIds(c){return [...new Set([...(c.metrics||[]).filter(m=>m.kind==='revenue').map(()=> 'revenue'),...(c.metrics||[]).filter(m=>['users','paid-customers','usage','downloads'].includes(m.kind)).map(()=>'adoption'),...(c.outcome==='failure'?[c.failureSubtype]:[])])];}
export const signalLabels={revenue:{zh:'有历史收入记录',en:'Historical revenue recorded'},adoption:{zh:'有用户或使用记录',en:'Adoption or usage recorded'},shutdown:{zh:'经营停运',en:'Shutdown'},'product-discontinued':{zh:'产品停止',en:'Product discontinued'},pivot:{zh:'转型',en:'Pivot'},'commercial-setback':{zh:'商业化受挫',en:'Commercial setback'}};
