const topics = {
  developer: 'coding code programming repository github 编程 代码 开发 版本控制 测试',
  data: 'sql database analytics spreadsheet 数据 数据库 分析 表格',
  search: 'web search browser crawl retrieval 网页 搜索 检索 浏览器',
  productivity: 'office calendar tasks notes 工作 办公 日历 笔记 协作',
  design: 'image video audio creative ui design 图像 视频 音频 设计 创作',
  knowledge: 'docs documentation research memory documents 文档 研究 知识 记忆',
  infrastructure: 'cloud deploy hosting monitoring 云 部署 运维 监控',
  automation: 'workflow integration automation 工作流 自动化 集成',
  other: 'other 其他',
};
export const categories = Object.keys(topics);

const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase();

export function searchCatalog(entries, {query = '', category = '', transport = '', featured = false} = {}) {
  const words = [...new Set(normalize(query.slice(0, 120)).split(/\s+/u).filter(Boolean))].slice(0, 8);
  const hits = [];
  for (const entry of entries) {
    if (category && entry.category !== category) continue;
    if (transport && !entry.transports.includes(transport)) continue;
    if (featured && !entry.featured) continue;
    if (!words.length) {
      hits.push({entry, score: 0});
      continue;
    }
    const name = normalize([entry.title, entry.id, entry.registryId].join(' '));
    const text = normalize([entry.description, entry.note, entry.noteZh, topics[entry.category]].join(' '));
    if (!words.every(word => name.includes(word) || text.includes(word))) continue;
    const score = words.reduce((sum, word) => sum + (name.includes(word) ? 4 : 1), entry.featured ? 1 : 0);
    hits.push({entry, score});
  }
  return hits.sort((a, b) => b.score - a.score).map(hit => hit.entry);
}
