import { HUB_TASKS } from '../../document-assets/hub-core.mjs';

export const hubCopy = {
 en:{
  title:'Free document tools: PDF, file verification & delivery',
  heading:['Check, compare','and verify files.'],
  intro:'Review PDFs, extract and compare text, check file copies, or prepare a client handover. Six free tools, all on your device.',
  shareBody:'Share this toolkit with your team so they can choose the tool they need.',
  embed:'Link to this toolkit from your website',embedHelp:'Copy this HTML into a relevant resource page or README. It links to the public tool directory; no files or results are shared.',
  nav:'All tools', browse:'Choose your task', groupNav:'Browse by task', tools:'Six tools, ready to use', open:'Open tool',
  groups:[['Check documents','Find issues before a document is published.'],['Extract & compare','Reuse text and understand what changed.'],['Verify & deliver','Check a copy and keep a record of your handover.']],
  entries:{
   audit:['PDF accessibility checker','Find missing titles, language declarations, tags and page-level issues.','PDF preflight'],
   batch:['Batch PDF audit','Review up to 10 PDFs and export one combined findings list.','Up to 10 PDFs'],
   text:['PDF to text','Extract existing text by page and save a TXT file.','Text extraction'],
   compare:['Compare PDF text','Locate changed, added and removed text pages across two versions.','Two PDF versions'],
   verify:['File verification','Create a checksum link or check a received copy against one.','SHA-256 + file size'],
   delivery:['Delivery record','List delivered files, add your notes and export a portable record.','File inventory'],
  },
  workflows:'Start with the situation you are in',
  journeys:[
   ['I need to send a set of documents.','Review the batch, record the files you send, then give recipients a way to check their copies.',['batch','delivery','verify']],
   ['I received a revised PDF.','Compare the wording first. Use a checksum when you need to check exact file bytes.',['compare','verify']],
   ['I need text from a PDF.','Try extraction. If pages have no text layer, use the guide to decide whether a separate OCR workflow is needed.',['text']],
  ],
  trust:'Free tools. Files stay on your device.',
  trustBody:'No account or file upload is needed. Keep your original files unchanged and download the results you need. Each tool explains its limits before you start.',
  methodLink:'See what the checks can tell you', guideTitle:'Get a useful answer before you start',
  faqTitle:'About the toolkit',
  faq:[
   ['Are all six tools free?','Yes. PDF checks, batch review, text extraction, comparison, file verification and delivery records are free to use. No account is required.'],
   ['Do you upload or store my files?','File processing runs in your browser. Files and document text are not uploaded. If you choose to share a verification link, it contains a SHA-256 fingerprint and byte count; full exports can contain filenames and your notes.'],
   ['Which tool checks whether a file has changed?','File verification compares SHA-256 and byte count with a sender-provided reference. Text comparison checks extracted wording instead. Neither tool proves identity, delivery, acceptance or malware safety.'],
  ]
 },
 de:{
  title:'Kostenlose Dokument-Tools: PDF, Dateiprüfung & Übergabe',
  heading:['Dokumente prüfen.','Übergabe vorbereiten.'],
  intro:'Wählen Sie das passende Werkzeug: PDFs prüfen, Text extrahieren oder vergleichen, Dateien abgleichen und eine Kundenübergabe dokumentieren. Alles läuft auf Ihrem Gerät.',
  shareBody:'Teilen Sie diese Werkzeugübersicht mit Ihrem Team, damit alle das passende Werkzeug finden.',
  embed:'Diese Werkzeugübersicht verlinken',embedHelp:'Dieses HTML auf einer passenden Ressourcenseite oder in einer README einfügen. Es verlinkt die öffentliche Übersicht; Dateien und Ergebnisse werden nicht geteilt.',
  nav:'Alle Werkzeuge',browse:'Aufgabe wählen',groupNav:'Nach Aufgabe auswählen',tools:'Sechs Werkzeuge, direkt nutzbar',open:'Werkzeug öffnen',
  groups:[['Dokumente prüfen','Probleme vor der Veröffentlichung finden.'],['Text nutzen & vergleichen','Text übernehmen und Änderungen erkennen.'],['Dateien prüfen & übergeben','Kopien abgleichen und die Übergabe dokumentieren.']],
  entries:{
   audit:['PDF-Barrierefreiheit prüfen','Fehlende Titel, Sprachangaben, Tags und seitenbezogene Hinweise finden.','PDF-Vorprüfung'],
   batch:['PDF-Stapelprüfung','Bis zu 10 PDFs prüfen und eine gemeinsame Befundliste exportieren.','Bis zu 10 PDFs'],
   text:['PDF in Text umwandeln','Vorhandenen Text nach Seiten extrahieren und als TXT speichern.','Textextraktion'],
   compare:['PDF-Text vergleichen','Geänderte, ergänzte und entfernte Textseiten zweier Fassungen erkennen.','Zwei PDF-Fassungen'],
   verify:['Datei verifizieren','Einen Prüfsummen-Link erstellen oder eine empfangene Datei abgleichen.','SHA-256 + Dateigröße'],
   delivery:['Dateiübergabe dokumentieren','Dateien auflisten, Notizen ergänzen und eine portable Aufzeichnung exportieren.','Dateiliste'],
  },
  workflows:'Mit Ihrer konkreten Aufgabe beginnen',
  journeys:[
   ['Ich möchte mehrere Dokumente versenden.','Stapel prüfen, versendete Dateien dokumentieren und Empfängern den Abgleich ihrer Kopien ermöglichen.',['batch','delivery','verify']],
   ['Ich habe eine neue PDF-Fassung erhalten.','Zuerst Textänderungen vergleichen. Für die exakten Dateibytes anschließend eine Prüfsumme nutzen.',['compare','verify']],
   ['Ich brauche den Text aus einem PDF.','Textextraktion versuchen. Fehlt die Textebene, hilft die Anleitung bei der Entscheidung für eine separate OCR-Lösung.',['text']],
  ],
  trust:'Kostenlose Werkzeuge. Dateien bleiben auf Ihrem Gerät.',
  trustBody:'Kein Konto und kein Datei-Upload nötig. Originaldateien bleiben unverändert; Ergebnisse können Sie herunterladen. Jedes Werkzeug erklärt vorab seine Grenzen.',
  methodLink:'Was die Prüfungen aussagen',guideTitle:'Vor dem Start die richtige Antwort finden',faqTitle:'Über die Werkzeuge',
  faq:[
   ['Sind alle sechs Werkzeuge kostenlos?','Ja. PDF-Prüfung, Stapelprüfung, Textextraktion, Vergleich, Dateiverifizierung und Übergabedokumentation sind kostenlos. Ein Konto ist nicht erforderlich.'],
   ['Werden meine Dateien hochgeladen oder gespeichert?','Die Verarbeitung läuft im Browser. Dateien und Dokumenttext werden nicht hochgeladen. Ein freiwillig geteilter Prüflink enthält SHA-256 und Bytezahl; vollständige Exporte können Dateinamen und Ihre Notizen enthalten.'],
   ['Welches Werkzeug prüft eine unveränderte Datei?','Die Dateiverifizierung vergleicht SHA-256 und Bytezahl mit einer Referenz des Absenders. Der Textvergleich prüft extrahierten Wortlaut. Beide belegen weder Identität noch Zustellung, Abnahme oder Freiheit von Schadsoftware.'],
  ]
 },
 zh:{
  title:'免费文档工具：PDF 处理、文件核验与交付记录',
  heading:['检查、比较、核验，','把文件交付做好。'],
  intro:'按眼前的任务选择工具：检查 PDF、提取与比较文字、核验文件版本，或整理客户交付记录。所有文件处理都在你的设备上完成。',
  shareBody:'把这套工具分享给同事，让他们按任务选择合适的入口。',
  embed:'在你的网站引用这套工具',embedHelp:'把这段 HTML 复制到相关资源页或 README。链接指向公开工具总览，不会分享文件或处理结果。',
  nav:'全部工具',browse:'选择你的任务',groupNav:'按任务查找',tools:'六个工具，直接开始使用',open:'打开工具',
  groups:[['检查文档','发布之前，先找到需要处理的问题。'],['提取与比较','复用文字，弄清两个版本改了什么。'],['核验与交付','确认文件副本，整理清晰的交付记录。']],
  entries:{
   audit:['PDF 无障碍检查','检查标题、语言声明、标签结构，并按页定位问题线索。','PDF 发布前预检'],
   batch:['PDF 批量审查','一次检查最多 10 份 PDF，导出一张合并的问题清单。','最多 10 份 PDF'],
   text:['PDF 转文字','按页提取 PDF 中已有文字，保存为 TXT 文件。','提取已有文本'],
   compare:['PDF 文本对比','比较两个版本，定位修改、新增和删除的文字页面。','比较两个 PDF 版本'],
   verify:['文件核验','创建校验链接，或核对收到的文件是否与参考版本一致。','SHA-256 与文件大小'],
   delivery:['文件交付记录','列出交付文件，填写备注，导出可携带的记录。','文件清单与备注'],
  },
  workflows:'从你正在做的事情开始',
  journeys:[
   ['我要向客户发送一批文档。','先做批量检查，再记录交付的文件，最后让接收者能够核对自己的副本。',['batch','delivery','verify']],
   ['我收到了一份修订版 PDF。','先比较文字改动；需要确认文件字节完全一致时，再用校验链接核对。',['compare','verify']],
   ['我需要复制 PDF 里的文字。','先尝试提取。遇到没有文本层的页面，再按指南判断是否需要另外做 OCR。',['text']],
  ],
  trust:'工具免费，文件留在你的设备上。',
  trustBody:'无需注册，也无需上传文件。原文件保持不变，结果可按需下载。每个工具都会明确说明适用范围与限制。',
  methodLink:'了解各项检查能说明什么',guideTitle:'开始之前，先找到实用答案',faqTitle:'关于这套工具',
  faq:[
   ['六个工具都能免费使用吗？','可以。PDF 检查、批量审查、文本提取、版本对比、文件核验与交付记录均可免费使用，无需注册。'],
   ['我的文件会被上传或保存吗？','文件处理在浏览器内完成，不上传文件或文档正文。若你主动分享核验链接，链接包含 SHA-256 指纹和字节数；完整导出文件可能含文件名和你填写的备注。'],
   ['用哪个工具确认文件没有变化？','文件核验会把 SHA-256 和字节数与发送者提供的参考值比较；文本对比则检查提取后的文字。这些工具都不证明身份、送达、验收或文件安全。'],
  ]
 }
};

const groups=[['audit','batch'],['text','compare'],['verify','delivery']];
const groupIds=['check-documents','extract-compare','verify-deliver'];
const icons={audit:'<path d="m7 12 3 3 7-7"/>',batch:'<path d="M7 7h12v13H7zM4 16V4h12"/>',text:'<path d="M6 6h12M12 6v13M8 19h8"/>',compare:'<path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4"/>',verify:'<path d="m7 4-2 16M16 4l-2 16M3 9h16M2 15h16"/>',delivery:'<path d="M4 5h11v15H4zM8 9h4M8 13h4m4-3 4 4-4 4M12 14h8"/>'};
export function hubLink(lang,task,route,esc,full=false) {
 const c=hubCopy[lang],entry=c.entries[task];
 const url=route(lang,HUB_TASKS[task]);
 if(!full)return `<a data-hub-task="${task}" href="${url}">${esc(entry[0])}</a>`;
 return `<a class="hub-tool" data-hub-task="${task}" href="${url}"><span class="hub-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icons[task]}</svg></span><div><h3>${esc(entry[0])}</h3><p>${esc(entry[1])}</p><span class="hub-tool-meta"><span class="hub-tool-type">${esc(entry[2])}</span><span class="hub-tool-open">${esc(c.open)} <span aria-hidden="true">→</span></span></span></div></a>`;
}
export function homeHub(lang,copy,route,esc,guideLinks) {
 const c=hubCopy[lang];
 return `<section class="hub-hero"><h1>${c.heading.map(s=>`<span>${esc(s)}</span>`).join(' ')}</h1><div class="hub-intro"><p>${esc(c.intro)}</p><ul class="benefits">${copy.benefits.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div></section><section class="hub-directory" id="tools" aria-labelledby="hub-tools-heading"><div class="hub-directory-heading"><h2 id="hub-tools-heading">${esc(c.tools)}</h2><nav class="hub-category-nav" aria-label="${esc(c.groupNav)}">${c.groups.map(([label],i)=>`<a href="#${groupIds[i]}">${esc(label)}</a>`).join('')}</nav></div><div class="hub-groups">${groups.map((tasks,i)=>`<section class="hub-group" id="${groupIds[i]}" aria-labelledby="${groupIds[i]}-title"><header><h2 id="${groupIds[i]}-title">${esc(c.groups[i][0])}</h2><p>${esc(c.groups[i][1])}</p></header>${tasks.map(task=>hubLink(lang,task,route,esc,true)).join('')}</section>`).join('')}</div></section><section class="section hub-workflows"><h2>${esc(c.workflows)}</h2><div class="hub-journeys">${c.journeys.map(([title,body,tasks],i)=>`<article><h3>${esc(title)}</h3><p>${esc(body)}</p><ol>${tasks.map(task=>`<li>${hubLink(lang,task,route,esc)}</li>`).join('')}</ol>${i===2?`<a class="hub-guide-link" href="${route(lang,'learn/scanned-pdf-vs-text-pdf')}">${esc(copy.guideTitles[1])}</a>`:''}</article>`).join('')}</div></section><section class="free-band hub-trust"><div><h2>${esc(c.trust)}</h2><p>${esc(c.trustBody)}</p></div><a href="${route(lang,'methodology')}">${esc(c.methodLink)}</a></section><section class="section" id="guides"><h2>${esc(c.guideTitle)}</h2>${guideLinks(lang)}</section><section class="section faq"><h2>${esc(c.faqTitle)}</h2>${c.faq.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`;
}
export function hubText(lang,route) {
 const c=hubCopy[lang];
 return [c.intro,...Object.entries(c.entries).flatMap(([task,entry])=>[...entry,'https://thedollscout.com'+route(lang,HUB_TASKS[task])]),...c.journeys.flatMap(([title,body])=>[title,body]),c.trust,c.trustBody,...c.faq.flat()];
}
