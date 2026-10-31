// The existing series pages own checklist storage and browser printing.
export const smiskiEntry = {
 en: {
  title: 'SMISKI Checklists by Series — Print or Save PDF',
  heading: 'SMISKI collection checklists',
  intro: 'Find your SMISKI series, mark the figures you own, and print a checklist or save it as a PDF. Free in your browser, with no account needed.',
  primary: 'Choose my series',
  printTitle: 'Get a printable SMISKI checklist',
  steps: ['Open a series checklist below.', 'Mark the figures you own. Your selections stay in this browser.', 'Choose “Print / save PDF” on the series page, then choose your printer or “Save as PDF” in the browser dialog.'],
  limit: 'A text checklist using source-linked figure names, without product photos. Each PDF covers one series; use the collection tracker for a combined wishlist and backup. Available print options depend on your browser.',
  museum: 'Open the Museum checklist', construction: 'Open the Construction checklist',
  tracker: 'Open my combined collection and wishlist'
 },
 de: {
  title: 'SMISKI-Checklisten nach Serie — Drucken oder als PDF speichern',
  heading: 'SMISKI-Sammlungschecklisten',
  intro: 'SMISKI-Serie wählen, vorhandene Figuren markieren und die Checkliste drucken oder als PDF speichern. Kostenlos im Browser, ohne Konto.',
  primary: 'Meine Serie wählen',
  printTitle: 'Eine SMISKI-Checkliste zum Ausdrucken',
  steps: ['Unten eine Serien-Checkliste öffnen.', 'Vorhandene Figuren markieren. Die Auswahl bleibt in diesem Browser.', 'Auf der Serienseite „Drucken / als PDF speichern“ wählen und im Browserdialog den Drucker oder „Als PDF speichern“ auswählen.'],
  limit: 'Eine Textcheckliste mit belegten Figurennamen, ohne Produktfotos. Jede PDF umfasst eine Serie; die Sammlungsverwaltung bietet eine gemeinsame Wunschliste und Sicherung. Druckoptionen hängen vom Browser ab.',
  museum: 'Museum-Checkliste öffnen', construction: 'Construction-Checkliste öffnen',
  tracker: 'Gemeinsame Sammlung und Wunschliste öffnen'
 },
 zh: {
  title: 'SMISKI 系列收藏清单 — 打印或保存 PDF',
  heading: 'SMISKI 收藏清单',
  intro: '选择你的 SMISKI 系列，勾选已拥有的款式，再打印清单或保存为 PDF。浏览器内免费使用，无需注册。',
  primary: '选择我的系列',
  printTitle: '获取可打印的 SMISKI 清单',
  steps: ['打开下方的系列收藏清单。', '勾选已拥有的款式，选择会保存在当前浏览器。', '点击系列页的“打印 / 保存 PDF”，在浏览器对话框中选择打印机或“另存为 PDF”。'],
  limit: '这是使用有来源款式名称的文字清单，不含商品图片。每份 PDF 对应一个系列；跨系列愿望单和备份请使用收藏账本。可用打印选项取决于浏览器。',
  museum: '打开 Museum 系列清单', construction: '打开 Construction 系列清单',
  tracker: '打开跨系列收藏和愿望单（英文）'
 }
};

export function checklistEntryHTML(lang, route) {
 const c = smiskiEntry[lang];
 return `<section class="brand-method" aria-labelledby="printable-checklist"><h2 id="printable-checklist">${c.printTitle}</h2><ol>${c.steps.map(p=>`<li>${p}</li>`).join('')}</ol><p>${c.limit}</p><div class="actions"><a class="button" href="${route(lang,'series/smiski-museum')}#checklist">${c.museum}</a><a class="button" href="${route(lang,'series/smiski-construction')}#checklist">${c.construction}</a><a href="${route(lang==='de'?'de':'en','collection-tracker')}">${c.tracker}</a></div></section>`;
}
