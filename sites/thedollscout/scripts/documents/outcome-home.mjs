import { fitImage } from '../../document-assets/utility-core.mjs';

export const outcomeCopy = {
 en: {
  title:'Free image, PDF & file tools for everyday work',
  heading:['Get your files ready.','Get on with your work.'],
  intro:'For creators and small teams: prepare images for publishing, check document changes and keep a clear record of the files you hand over. Free, in your browser, without an account.',
  eyebrow:'TDS · Your next finished task', sample:'Try the image example', own:'Use my own images', browse:'Browse all 12 tools',
  preview:'A built-in example you can run', before:'Original', after:'Resized export', previewNote:'Actual resize dimensions. Run the example to see the output format and file size on your device.',
  tasks:'What do you need to finish?', output:'You get', start:'Start this task', demo:'Try a PDF example',
  journeys:[
   ['image','Prepare images for a website','Resize JPEG, PNG or WebP, inspect the result and download the files.','Resized images with their actual output sizes.'],
   ['compare','Check what changed in a PDF','Compare the text in two versions before sending the final document. Scanned pages need OCR elsewhere.','Page-level text changes and an exportable report.'],
   ['delivery','Record a file handover','List the final files and add your notes. Create a checksum link if the recipient needs to check a copy.','A downloadable file inventory. It does not prove delivery or acceptance.']
  ], next:'Ready to hand these files over?', nextBody:'Download your final images, then select them in the delivery tool to create a file inventory. Files are not transferred between tools.', nextLink:'Create a delivery record', useOwn:'Try your own file',
 },
 de: {
  title:'Kostenlose Bild-, PDF- und Dateiwerkzeuge für den Alltag',
  heading:['Dateien fertig machen.','Arbeit weiterbringen.'],
  intro:'Für Kreative und kleine Teams: Bilder für die Veröffentlichung vorbereiten, Dokumentänderungen prüfen und übergebene Dateien dokumentieren. Kostenlos im Browser, ohne Konto.',
  eyebrow:'TDS · Eine Aufgabe abschließen',sample:'Bildbeispiel ausprobieren',own:'Eigene Bilder bearbeiten',browse:'Alle 12 Werkzeuge ansehen',
  preview:'Ein eingebautes Beispiel zum Ausprobieren',before:'Original',after:'Verkleinerter Export',previewNote:'Tatsächliche Zielmaße. Das Beispiel zeigt Ausgabeformat und Dateigröße auf Ihrem Gerät.',
  tasks:'Was möchten Sie erledigen?',output:'Ihr Ergebnis',start:'Aufgabe starten',demo:'PDF-Beispiel ausprobieren',
  journeys:[
   ['image','Bilder für eine Website vorbereiten','JPEG, PNG oder WebP verkleinern, das Ergebnis prüfen und Dateien herunterladen.','Verkleinerte Bilder mit den tatsächlichen Ausgabegrößen.'],
   ['compare','Änderungen in einem PDF prüfen','Vor dem Versand den Text zweier Fassungen vergleichen. Gescannte Seiten benötigen eine externe OCR.','Textänderungen nach Seiten und einen exportierbaren Bericht.'],
   ['delivery','Eine Dateiübergabe dokumentieren','Finale Dateien auflisten und Notizen ergänzen. Bei Bedarf einen Prüfsummen-Link für den Empfänger erstellen.','Eine herunterladbare Dateiliste. Sie belegt weder Zustellung noch Abnahme.']
  ],next:'Diese Dateien übergeben?',nextBody:'Die fertigen Bilder herunterladen und anschließend im Übergabewerkzeug für eine Dateiliste auswählen. Zwischen Werkzeugen werden keine Dateien übertragen.',nextLink:'Übergabe dokumentieren',useOwn:'Eigene Datei ausprobieren',
 },
 zh: {
  title:'免费图片、PDF 与文件工具：从处理到交付',
  heading:['把文件准备好，','让手头的工作往前走。'],
  intro:'为内容创作者和小团队准备：处理要发布的图片，检查文档改动，记录最后交付了哪些文件。免费在浏览器内完成，无需注册。',
  eyebrow:'TDS · 从完成一件事开始',sample:'跑一次图片样例',own:'处理自己的图片',browse:'查看全部 12 个工具',
  preview:'可以亲手运行的内置样例',before:'原图',after:'调整后的导出',previewNote:'这里显示实际缩放尺寸。运行样例后，可查看你的设备生成的格式与文件大小。',
  tasks:'你现在要完成什么？',output:'得到的结果',start:'开始处理',demo:'试试 PDF 样例',
  journeys:[
   ['image','把图片准备好再发布','调整 JPEG、PNG、WebP 的尺寸与格式，查看结果后下载。','可下载的图片，以及实际输出文件大小。'],
   ['compare','发出 PDF 前，确认改了哪里','比较两个版本中已有的文字，定位改动。扫描件需要先在其他工具中做 OCR。','按页定位的文字差异，以及可导出的报告。'],
   ['delivery','记录这次交付了哪些文件','列出最终文件、补充备注；需要核对副本时，再创建校验链接。','可下载的文件清单；它不证明送达或验收。']
  ],next:'准备把这些文件交给别人？',nextBody:'先下载最终图片，再到交付工具选择这些文件，生成清单。工具之间不会自动传递文件。',nextLink:'创建交付记录',useOwn:'换成自己的文件',
 }
};

export function outcomeHero(lang, route, esc, tasks) {
 const c=outcomeCopy[lang],dimensions=fitImage(1500,1000,1000,1000);
 const image=route(lang,tasks.image),sample=image+'?example=1#utility-result';
 return `<section class="hub-hero outcome-hero"><div><p class="outcome-eyebrow">${esc(c.eyebrow)}</p><h1>${c.heading.map(s=>`<span>${esc(s)}</span>`).join('')}</h1><p class="outcome-intro">${esc(c.intro)}</p><div class="actions"><a class="button primary" data-hub-task="image" href="${sample}">${esc(c.sample)} →</a><a class="button" data-hub-task="image" href="${image}">${esc(c.own)}</a></div><a class="outcome-browse" href="#tools">${esc(c.browse)} ↓</a></div><figure class="outcome-preview"><figcaption>${esc(c.preview)}</figcaption><div class="outcome-images">${[[c.before,'1500 × 1000','original'],[c.after,`${dimensions.width} × ${dimensions.height}`,'resized']].map(([label,size,kind])=>`<div><span>${esc(label)}</span><div class="outcome-image ${kind}" aria-hidden="true"><b>TDS</b></div><strong>${size}</strong></div>`).join('')}</div><p>${esc(c.previewNote)}</p></figure></section><section class="outcome-tasks" aria-labelledby="outcome-tasks-title"><h2 id="outcome-tasks-title">${esc(c.tasks)}</h2><div class="outcome-task-grid">${c.journeys.map(([task,title,body,output],i)=>`<article><span class="outcome-step" aria-hidden="true">0${i+1}</span><h3>${esc(title)}</h3><p>${esc(body)}</p><p class="outcome-output"><strong>${esc(c.output)}</strong> ${esc(output)}</p><a data-hub-task="${task}" href="${route(lang,tasks[task])}">${esc(c.start)} →</a>${task==='compare'?`<a class="outcome-demo" data-hub-task="compare" href="${route(lang,tasks.compare)}?example=1#results">${esc(c.demo)}</a>`:''}</article>`).join('')}</div></section>`;
}
