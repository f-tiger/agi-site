import { utilityCopy } from './utility-copy.mjs';
import { HUB_TASKS } from '../../document-assets/hub-core.mjs';

export const hubCopy = {
 en:{
  title:'Free online tools for images, JSON, time zones & PDFs',
  heading:['Everyday tasks.','One useful toolkit.'],
  intro:'Prepare images, check JSON, plan across time zones, verify files or work with PDFs. Nine free tools, organised around the job you need to finish.',
  shareBody:'Share this toolkit with your team so they can choose the tool they need.',
  embed:'Link to this toolkit from your website',embedHelp:'Copy this HTML into a relevant resource page or README. It links to the public tool directory; no files or results are shared.',
  nav:'All tools', browse:'Choose your task', groupNav:'Browse by task', tools:'Nine tools across five categories', open:'Open tool',
  groups:[['Images','Prepare a lighter image for the web.'],['Text & data','Read and compare structured data.'],['Time & collaboration','Agree on the same moment across cities.'],['Files & delivery','Check copies and record what you hand over.'],['PDF tools','Review documents, extract text and compare versions.']],
  entries:{
   image:[utilityCopy.en.tools.image.name,'Resize and convert JPEG, PNG and WebP; compare actual output size.','Images'],
   json:[utilityCopy.en.tools.json.name,'Validate, format and compare fields without rounding large numbers.','Structured data'],
   meeting:[utilityCopy.en.tools.meeting.name,'Compare city times and export a calendar file with DST checks.','Time zones + .ics'],
   audit:['PDF accessibility checker','Find missing titles, language declarations, tags and page-level issues.','PDF preflight'],
   batch:['Batch PDF audit','Review up to 10 PDFs and export one combined findings list.','Up to 10 PDFs'],
   text:['PDF to text','Extract existing text by page and save a TXT file.','Text extraction'],
   compare:['Compare PDF text','Locate changed, added and removed text pages across two versions.','Two PDF versions'],
   verify:['File verification','Create a checksum link or check a received copy against one.','SHA-256 + file size'],
   delivery:['Delivery record','List delivered files, add your notes and export a portable record.','File inventory'],
  },
  workflows:'Start with the situation you are in',
  journeys:[['My images are too large to publish.','Resize and inspect the exported images, then record the final files you hand over.',['image','delivery']],['An API response or configuration changed.','Compare JSON fields and download the change report. Object key order will not create noise.',['json']],['My team works in different time zones.','Check the local times and download one calendar file. Import it into your calendar when ready.',['meeting']]],
  trust:'Free tools. Files stay on your device.',
  trustBody:'No account or file upload is needed. Keep your original files unchanged and download the results you need. Each tool explains its limits before you start.',
  methodLink:'See what the checks can tell you', guideTitle:'Get a useful answer before you start',
  faqTitle:'About the toolkit',
  faq:[
   ['Are all nine tools free?','Yes. Image processing, JSON, meeting planning, file verification, delivery records and all PDF tools are free. No account is required.'],
   ['Do you upload or store my files?','File processing runs in your browser. Files and document text are not uploaded. If you choose to share a verification link, it contains a SHA-256 fingerprint and byte count; full exports can contain filenames and your notes.'],
   ['Which tool checks whether a file has changed?','File verification compares SHA-256 and byte count with a sender-provided reference. Text comparison checks extracted wording instead. Neither tool proves identity, delivery, acceptance or malware safety.'],
  ]
 },
 de:{
  title:'Kostenlose Online-Tools für Bilder, JSON, Zeitzonen & PDF',
  heading:['Alltagsaufgaben.','Passende Werkzeuge.'],
  intro:'Bilder vorbereiten, JSON prüfen, Termine über Zeitzonen planen, Dateien abgleichen oder PDFs bearbeiten. Neun kostenlose Werkzeuge für konkrete Aufgaben.',
  shareBody:'Teilen Sie diese Werkzeugübersicht mit Ihrem Team, damit alle das passende Werkzeug finden.',
  embed:'Diese Werkzeugübersicht verlinken',embedHelp:'Dieses HTML auf einer passenden Ressourcenseite oder in einer README einfügen. Es verlinkt die öffentliche Übersicht; Dateien und Ergebnisse werden nicht geteilt.',
  nav:'Alle Werkzeuge',browse:'Aufgabe wählen',groupNav:'Nach Aufgabe auswählen',tools:'Neun Werkzeuge in fünf Kategorien',open:'Werkzeug öffnen',
  groups:[['Bilder','Kleinere Bilder fürs Web vorbereiten.'],['Text & Daten','Strukturierte Daten lesen und vergleichen.'],['Zeit & Zusammenarbeit','Einen gemeinsamen Zeitpunkt finden.'],['Dateien & Übergabe','Kopien prüfen und Übergaben dokumentieren.'],['PDF-Werkzeuge','Dokumente prüfen, Text extrahieren und Fassungen vergleichen.']],
  entries:{
   image:[utilityCopy.de.tools.image.name,'JPEG, PNG und WebP verkleinern, umwandeln und die Ausgabegröße prüfen.','Bilder'],
   json:[utilityCopy.de.tools.json.name,'Felder validieren, formatieren und ohne Rundung großer Zahlen vergleichen.','Strukturierte Daten'],
   meeting:[utilityCopy.de.tools.meeting.name,'Stadtzeiten vergleichen, Zeitumstellungen prüfen und Kalender exportieren.','Zeitzonen + .ics'],
   audit:['PDF-Barrierefreiheit prüfen','Fehlende Titel, Sprachangaben, Tags und seitenbezogene Hinweise finden.','PDF-Vorprüfung'],
   batch:['PDF-Stapelprüfung','Bis zu 10 PDFs prüfen und eine gemeinsame Befundliste exportieren.','Bis zu 10 PDFs'],
   text:['PDF in Text umwandeln','Vorhandenen Text nach Seiten extrahieren und als TXT speichern.','Textextraktion'],
   compare:['PDF-Text vergleichen','Geänderte, ergänzte und entfernte Textseiten zweier Fassungen erkennen.','Zwei PDF-Fassungen'],
   verify:['Datei verifizieren','Einen Prüfsummen-Link erstellen oder eine empfangene Datei abgleichen.','SHA-256 + Dateigröße'],
   delivery:['Dateiübergabe dokumentieren','Dateien auflisten, Notizen ergänzen und eine portable Aufzeichnung exportieren.','Dateiliste'],
  },
  workflows:'Mit Ihrer konkreten Aufgabe beginnen',
  journeys:[['Meine Bilder sind zu groß für die Veröffentlichung.','Bilder verkleinern, Exporte prüfen und die übergebenen Dateien dokumentieren.',['image','delivery']],['Eine API-Antwort oder Konfiguration wurde geändert.','JSON-Felder vergleichen und den Bericht herunterladen. Schlüsselreihenfolge erzeugt keine Unterschiede.',['json']],['Mein Team arbeitet in mehreren Zeitzonen.','Lokale Uhrzeiten prüfen und eine Kalenderdatei herunterladen, die Sie anschließend importieren können.',['meeting']]],
  trust:'Kostenlose Werkzeuge. Dateien bleiben auf Ihrem Gerät.',
  trustBody:'Kein Konto und kein Datei-Upload nötig. Originaldateien bleiben unverändert; Ergebnisse können Sie herunterladen. Jedes Werkzeug erklärt vorab seine Grenzen.',
  methodLink:'Was die Prüfungen aussagen',guideTitle:'Vor dem Start die richtige Antwort finden',faqTitle:'Über die Werkzeuge',
  faq:[
   ['Sind alle neun Werkzeuge kostenlos?','Ja. Bildverarbeitung, JSON, Terminplanung, Dateiprüfung, Übergabedokumentation und alle PDF-Werkzeuge sind kostenlos, ohne Konto.'],
   ['Werden meine Dateien hochgeladen oder gespeichert?','Die Verarbeitung läuft im Browser. Dateien und Dokumenttext werden nicht hochgeladen. Ein freiwillig geteilter Prüflink enthält SHA-256 und Bytezahl; vollständige Exporte können Dateinamen und Ihre Notizen enthalten.'],
   ['Welches Werkzeug prüft eine unveränderte Datei?','Die Dateiverifizierung vergleicht SHA-256 und Bytezahl mit einer Referenz des Absenders. Der Textvergleich prüft extrahierten Wortlaut. Beide belegen weder Identität noch Zustellung, Abnahme oder Freiheit von Schadsoftware.'],
  ]
 },
 zh:{
  title:'免费在线工具：图片处理、JSON、时区与 PDF',
  heading:['处理眼前的任务，','找到顺手的工具。'],
  intro:'处理图片、校验数据、安排跨时区会议、核验文件，或处理 PDF。九个免费工具，按任务分类，直接开始使用。',
  shareBody:'把这套工具分享给同事，让他们按任务选择合适的入口。',
  embed:'在你的网站引用这套工具',embedHelp:'把这段 HTML 复制到相关资源页或 README。链接指向公开工具总览，不会分享文件或处理结果。',
  nav:'全部工具',browse:'选择你的任务',groupNav:'按任务查找',tools:'五个分类，九个实用工具',open:'打开工具',
  groups:[['图片处理','调整尺寸与格式，让图片适合发布。'],['文本与数据','读懂结构化数据，找出字段变化。'],['时间与协作','把不同城市的时间对齐。'],['文件核验与交付','核对文件副本，记录交付内容。'],['PDF 工具','检查文档，提取文字，比较两个版本。']],
  entries:{
   image:[utilityCopy.zh.tools.image.name,'批量调整 JPEG、PNG、WebP 尺寸与格式，查看实际输出大小。','图片处理'],
   json:[utilityCopy.zh.tools.json.name,'校验与格式化数据，按字段比较版本，保留长数字精度。','结构化数据'],
   meeting:[utilityCopy.zh.tools.meeting.name,'对照多地时间，识别夏令时变化，导出日历文件。','时区与 .ics'],
   audit:['PDF 无障碍检查','检查标题、语言声明、标签结构，并按页定位问题线索。','PDF 发布前预检'],
   batch:['PDF 批量审查','一次检查最多 10 份 PDF，导出一张合并的问题清单。','最多 10 份 PDF'],
   text:['PDF 转文字','按页提取 PDF 中已有文字，保存为 TXT 文件。','提取已有文本'],
   compare:['PDF 文本对比','比较两个版本，定位修改、新增和删除的文字页面。','比较两个 PDF 版本'],
   verify:['文件核验','创建校验链接，或核对收到的文件是否与参考版本一致。','SHA-256 与文件大小'],
   delivery:['文件交付记录','列出交付文件，填写备注，导出可携带的记录。','文件清单与备注'],
  },
  workflows:'从你正在做的事情开始',
  journeys:[['图片太大，网页或附件不好发。','先调整尺寸并检查导出效果，再把最终文件整理成交付记录。',['image','delivery']],['接口返回或配置文件改了。','按字段比较 JSON，下载变更报告，避免把键顺序变化当成内容变化。',['json']],['团队分布在不同国家。','先确认各地对应时间，再导出一份日历文件，按需导入自己的日历。',['meeting']]],
  trust:'工具免费，文件留在你的设备上。',
  trustBody:'无需注册，也无需上传文件。原文件保持不变，结果可按需下载。每个工具都会明确说明适用范围与限制。',
  methodLink:'了解各项检查能说明什么',guideTitle:'开始之前，先找到实用答案',faqTitle:'关于这套工具',
  faq:[
   ['九个工具都能免费使用吗？','可以。图片处理、JSON、跨时区会议、文件核验、交付记录和 PDF 工具均可免费使用，无需注册。'],
   ['我的文件会被上传或保存吗？','文件处理在浏览器内完成，不上传文件或文档正文。若你主动分享核验链接，链接包含 SHA-256 指纹和字节数；完整导出文件可能含文件名和你填写的备注。'],
   ['用哪个工具确认文件没有变化？','文件核验会把 SHA-256 和字节数与发送者提供的参考值比较；文本对比则检查提取后的文字。这些工具都不证明身份、送达、验收或文件安全。'],
  ]
 }
};

const groups=[['image'],['json'],['meeting'],['verify','delivery'],['audit','batch','text','compare']];
const groupIds=['images','text-data','time-collaboration','files-delivery','pdf-tools'];
const icons={image:'<path d="M3 4h18v16H3zM4 17l5-6 5 5 3-3 3 4"/><circle cx="16" cy="8" r="1.5"/>',json:'<path d="M8 3H6v7l-3 2 3 2v7h2M16 3h2v7l3 2-3 2v7h-2"/>',meeting:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',audit:'<path d="m7 12 3 3 7-7"/>',batch:'<path d="M7 7h12v13H7zM4 16V4h12"/>',text:'<path d="M6 6h12M12 6v13M8 19h8"/>',compare:'<path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4"/>',verify:'<path d="m7 4-2 16M16 4l-2 16M3 9h16M2 15h16"/>',delivery:'<path d="M4 5h11v15H4zM8 9h4M8 13h4m4-3 4 4-4 4M12 14h8"/>'};
export function hubLink(lang,task,route,esc,full=false) {
 const c=hubCopy[lang],entry=c.entries[task];
 const url=route(lang,HUB_TASKS[task]);
 if(!full)return `<a data-hub-task="${task}" href="${url}">${esc(entry[0])}</a>`;
 return `<a class="hub-tool" data-hub-task="${task}" href="${url}"><span class="hub-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icons[task]}</svg></span><div><h3>${esc(entry[0])}</h3><p>${esc(entry[1])}</p><span class="hub-tool-meta"><span class="hub-tool-type">${esc(entry[2])}</span><span class="hub-tool-open">${esc(c.open)} <span aria-hidden="true">→</span></span></span></div></a>`;
}
export function homeHub(lang,copy,route,esc,guideLinks) {
 const c=hubCopy[lang];
 return `<section class="hub-hero"><h1>${c.heading.map(s=>`<span>${esc(s)}</span>`).join(' ')}</h1><div class="hub-intro"><p>${esc(c.intro)}</p><ul class="benefits">${copy.benefits.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div></section><section class="hub-directory" id="tools" aria-labelledby="hub-tools-heading"><div class="hub-directory-heading"><h2 id="hub-tools-heading">${esc(c.tools)}</h2><nav class="hub-category-nav" aria-label="${esc(c.groupNav)}">${c.groups.map(([label],i)=>`<a href="#${groupIds[i]}">${esc(label)}</a>`).join('')}</nav></div><div class="hub-groups">${groups.map((tasks,i)=>`<section class="hub-group${i===4?' hub-group-wide':''}" id="${groupIds[i]}" aria-labelledby="${groupIds[i]}-title"><header><h2 id="${groupIds[i]}-title">${esc(c.groups[i][0])}</h2><p>${esc(c.groups[i][1])}</p></header><div class="hub-task-list">${tasks.map(task=>hubLink(lang,task,route,esc,true)).join('')}</div></section>`).join('')}</div></section><section class="section hub-workflows"><h2>${esc(c.workflows)}</h2><div class="hub-journeys">${c.journeys.map(([title,body,tasks],i)=>`<article><h3>${esc(title)}</h3><p>${esc(body)}</p><ol>${tasks.map(task=>`<li>${hubLink(lang,task,route,esc)}</li>`).join('')}</ol></article>`).join('')}</div></section><section class="free-band hub-trust"><div><h2>${esc(c.trust)}</h2><p>${esc(c.trustBody)}</p></div><a href="${route(lang,'methodology')}">${esc(c.methodLink)}</a></section><section class="section" id="guides"><h2>${esc(c.guideTitle)}</h2><ul class="guide-list">${['image','json','meeting'].map(task=>`<li><a href="${route(lang,HUB_TASKS[task])}#worked-example">${esc(c.entries[task][0])} · ${esc(utilityCopy[lang].ui.exampleTitle)}</a></li>`).join('')}</ul>${guideLinks(lang)}</section><section class="section faq"><h2>${esc(c.faqTitle)}</h2>${c.faq.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`;
}
export function hubText(lang,route) {
 const c=hubCopy[lang];
 return [c.intro,...Object.entries(c.entries).flatMap(([task,entry])=>[...entry,'https://thedollscout.com'+route(lang,HUB_TASKS[task])]),...c.journeys.flatMap(([title,body])=>[title,body]),c.trust,c.trustBody,...c.faq.flat()];
}
