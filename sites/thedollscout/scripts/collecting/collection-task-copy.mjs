export const collectionTaskCopy = {
 en: {
  title: 'Collection checklists for your AI assistant',
  intro: 'Ask your assistant to find a SMISKI or Sonny Angel series, compare the figures you own, and return a sourced checklist you can use in the conversation.',
  aiLead: 'Find a series, compare your owned figures and get a usable checklist in the conversation.',
  limits: 'You choose what to send',
  limitBody: 'The assistant sends the names you choose to the TDS MCP server to prepare the result. TDS does not save those arguments or include them in its usage telemetry; successful calls may record only a fixed tool name and result category. Your assistant provider has its own data handling. MCP cannot read or update your browser collection, private files, account or membership. Browser tracking and backups remain separate.',
  workflow: 'Try a collection task',
  prompt: 'Use TDS to find the SMISKI Museum series. I own Smiski Dali and Smiski Pearl Earring. Show the catalog names I have not marked as owned, with the source and check date. Only Smiski Bacchus is on my wishlist. Return a copyable checklist and keep any unrecognized names unresolved.',
  stepSearch: 'Find the exact series',
  searchHelp: 'Call search_collection_series first. Use a returned seriesId and the source names for the comparison.',
  stepPrepare: 'Prepare the checklist',
  prepareHelp: 'These are tools/call parameters. Only explicitly supplied wanted names become the wishlist; an unmarked figure is not automatically a purchase request.',
  resultTitle: 'Example result from the current named catalog',
  ownedLabel: 'Marked owned', unmarkedLabel: 'Not marked owned', wantedLabel: 'Explicit wishlist',
  catalogLimit: 'This compares the named figures verified in TDS, not every item ever released. Secret figures or variants may be absent. It cannot certify a complete set, ownership, authenticity, stock or value. Repeated name inputs are not duplicate-figure quantities or trade offers.',
  sourceLabel: 'Official series source', checkedLabel: 'Source checked',
  setupTitle: 'Connect with Claude Code',
  setupBody: 'With Claude Code installed, run this in the terminal for your current project, then inspect the connection. The first command adds the configuration; it is not proof of a successful tool call.',
  setupCheck: 'In Claude Code, open /mcp to check the server and its tools, then send the collection request above. Client availability, plan requirements and organization rules may differ.',
  setupSource: 'Claude Code MCP setup documentation',
  rawLabel: 'Copyable tools/call parameters',
  resultNote: 'Example only. Reading this page does not call a tool, save a collection or count as a completed collection task.'
 },
 de: {
  title: 'Sammlung mit KI planen',
  intro: 'Den Assistenten eine SMISKI- oder Sonny-Angel-Serie suchen lassen, vorhandene Figuren abgleichen und eine belegte Checkliste direkt im Gespräch erhalten.',
  aiLead: 'Serie finden, vorhandene Figuren abgleichen und eine nutzbare Checkliste im Gespräch erhalten.',
  limits: 'Sie bestimmen, welche Angaben Sie senden',
  limitBody: 'Der Assistent sendet die von Ihnen gewählten Namen zur Verarbeitung an den TDS-MCP-Server. TDS speichert diese Argumente nicht und nimmt sie nicht in die Nutzungsstatistik auf; erfolgreiche Aufrufe können nur nach festem Werkzeugnamen und Ergebniskategorie gezählt werden. Ihr Assistentenanbieter verarbeitet Daten nach eigenen Regeln. MCP kann weder die Browsersammlung noch private Dateien, Konten oder Mitgliedschaften lesen oder ändern. Browserverwaltung und Sicherungen bleiben getrennt.',
  workflow: 'Eine Sammlungsaufgabe ausprobieren',
  prompt: 'Mit TDS die Serie SMISKI Museum suchen. Ich besitze Smiski Dali und Smiski Pearl Earring. Zeige die Katalognamen, die ich nicht als vorhanden markiert habe, mit Quelle und Prüfdatum. Nur Smiski Bacchus steht auf meiner Wunschliste. Gib eine kopierbare Checkliste aus und lasse unbekannte Namen ungeklärt.',
  stepSearch: 'Die genaue Serie finden',
  searchHelp: 'Zuerst search_collection_series aufrufen. Eine zurückgegebene seriesId und die belegten Figurennamen für den Abgleich verwenden.',
  stepPrepare: 'Die Checkliste erstellen',
  prepareHelp: 'Dies sind Parameter für tools/call. Nur ausdrücklich angegebene wanted-Namen kommen auf die Wunschliste; eine nicht markierte Figur ist kein automatisches Kaufgesuch.',
  resultTitle: 'Beispiel aus dem aktuellen Namenskatalog',
  ownedLabel: 'Als vorhanden markiert', unmarkedLabel: 'Nicht als vorhanden markiert', wantedLabel: 'Ausdrückliche Wunschliste',
  catalogLimit: 'Verglichen werden die bei TDS verifizierten Figurennamen, nicht alle jemals erschienenen Produkte. Secrets oder Varianten können fehlen. Das Ergebnis bestätigt weder eine vollständige Serie noch Besitz, Echtheit, Bestand oder Wert. Wiederholte Namenseingaben sind keine Stückzahlen oder Tauschangebote.',
  sourceLabel: 'Offizielle Serienquelle', checkedLabel: 'Quelle geprüft',
  setupTitle: 'Mit Claude Code verbinden',
  setupBody: 'Bei installiertem Claude Code diese Befehle im Terminal für das aktuelle Projekt ausführen und die Verbindung prüfen. Der erste Befehl ergänzt die Konfiguration; er belegt noch keinen erfolgreichen Werkzeugaufruf.',
  setupCheck: 'In Claude Code /mcp öffnen, Server und Werkzeuge prüfen und danach die Sammlungsanfrage oben stellen. Verfügbarkeit, Tarifbedingungen und Organisationsregeln können je nach Client abweichen.',
  setupSource: 'Claude-Code-Anleitung für MCP',
  rawLabel: 'Kopierbare tools/call-Parameter',
  resultNote: 'Nur ein Beispiel. Das Lesen dieser Seite ruft kein Werkzeug auf, speichert keine Sammlung und zählt nicht als erledigte Sammlungsaufgabe.'
 },
 zh: {
  title: '让 AI 助手直接整理收藏清单',
  intro: '让助手查找 SMISKI 或 Sonny Angel 系列，核对你提供的已拥有款式，并在对话中返回有来源、可直接使用的收藏清单。',
  aiLead: '查找系列、核对已有款式，在对话中拿到可用的收藏清单。',
  limits: '由你决定发送哪些数据',
  limitBody: '助手会把你选择提供的款式名称发送给 TDS MCP 服务以计算结果。TDS 不保存这些输入参数，也不将其写入使用统计；成功调用仅可能按固定工具名和结果类别计数。助手提供方有自己的数据处理方式。MCP 无法读取或修改你的浏览器收藏、私人文件、账户或会员信息；浏览器收藏与备份仍单独管理。',
  workflow: '试一个具体收藏任务',
  prompt: '用 TDS 查找 SMISKI Museum 系列。我已有 Smiski Dali 和 Smiski Pearl Earring。列出目录中我尚未标记拥有的款式，附来源和核对日期。我只明确想要 Smiski Bacchus。返回可复制的清单，无法识别的名字保留为待核对。',
  stepSearch: '找到准确系列',
  searchHelp: '先调用 search_collection_series，再使用返回的 seriesId 和有来源的款式名称进行核对。',
  stepPrepare: '生成收藏清单',
  prepareHelp: '下面是 tools/call 的参数。只有明确提供的 wanted 款式才进入愿望单；未标记拥有不代表想购买。',
  resultTitle: '基于当前具名目录的示例结果',
  ownedLabel: '已标记拥有', unmarkedLabel: '尚未标记拥有', wantedLabel: '明确愿望单',
  catalogLimit: '比较范围仅是 TDS 已核实的具名款式，不代表所有已发售商品。目录可能缺少隐藏款或其他版本；结果不能证明全系列集齐、持有、真伪、库存或价值。重复输入同一名字不等于重复藏品数量，也不等于愿意交换。',
  sourceLabel: '官方系列来源', checkedLabel: '来源核对日期',
  setupTitle: '在 Claude Code 中连接',
  setupBody: '已安装 Claude Code 时，在当前项目的终端运行以下命令并检查连接。第一条命令添加的是配置，并不代表工具已成功调用。',
  setupCheck: '在 Claude Code 中打开 /mcp 检查服务与工具，再发送上面的收藏任务。不同客户端的可用性、套餐要求和组织规则可能不同。',
  setupSource: 'Claude Code MCP 官方接入文档',
  rawLabel: '可复制的 tools/call 参数',
  resultNote: '仅为示例。阅读此页不会调用工具、保存收藏或计为收藏任务完成。'
 }
};

export const CLAUDE_SETUP_URL = 'https://code.claude.com/docs/en/mcp';
export const CLAUDE_SETUP = 'claude mcp add --transport http tds https://thedollscout.com/mcp\nclaude mcp get tds';
export function collectionTaskExample(series, lang) {
 const owned = ['Smiski Dali', 'Smiski Pearl Earring'];
 const wanted = ['Smiski Bacchus'];
 return {
  search: {name:'search_collection_series', arguments:{query:'Museum',brand:'smiski',limit:5,language:lang}},
  prepare: {name:'prepare_collection_checklist',arguments:{seriesId:series.id,owned,wanted,language:lang}},
  owned: series.names.filter(n=>owned.includes(n)),
  notMarkedOwned: series.names.filter(n=>!owned.includes(n)),
  wanted: series.names.filter(n=>wanted.includes(n)),
  source: series.source,
  checked: series.checked
 };
}

export function collectionTaskHTML(lang, example, esc) {
 const c=collectionTaskCopy[lang];
 const list=(label,names)=>`<h3>${label} (${names.length})</h3><ul>${names.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`;
 return `<section id="collection-workflow" class="agent-example agent-catalog"><h2>${c.workflow}</h2><blockquote>${c.prompt}</blockquote><h3>${c.stepSearch}</h3><p>${c.searchHelp}</p><pre aria-label="${c.rawLabel}">${esc(JSON.stringify(example.search,null,2))}</pre><h3>${c.stepPrepare}</h3><p>${c.prepareHelp}</p><pre aria-label="${c.rawLabel}">${esc(JSON.stringify(example.prepare,null,2))}</pre><h2>${c.resultTitle}</h2>${list(c.ownedLabel,example.owned)}${list(c.unmarkedLabel,example.notMarkedOwned)}${list(c.wantedLabel,example.wanted)}<p><a href="${esc(example.source)}" rel="noopener">${c.sourceLabel}</a> · ${c.checkedLabel}: <time datetime="${esc(example.checked)}">${esc(example.checked)}</time></p><p>${c.catalogLimit}</p><p class="small">${c.resultNote}</p></section>`;
}

export function collectionTaskParagraphs(lang, example) {
 const c=collectionTaskCopy[lang];
 return [c.workflow,c.prompt,c.stepSearch,c.searchHelp,JSON.stringify(example.search),c.stepPrepare,c.prepareHelp,JSON.stringify(example.prepare),c.resultTitle,c.ownedLabel+': '+example.owned.join(', '),c.unmarkedLabel+': '+example.notMarkedOwned.join(', '),c.wantedLabel+': '+example.wanted.join(', '),c.sourceLabel+': '+example.source,c.checkedLabel+': '+example.checked,c.catalogLimit,c.resultNote,c.setupTitle,c.setupBody,CLAUDE_SETUP,c.setupCheck,CLAUDE_SETUP_URL];
}
