import { createHash } from 'node:crypto';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fixture } from './fixtures.mjs';
import { readPdf } from '../../document-assets/pdf-reader.mjs';
import { compareDocuments, VERSION } from '../../document-assets/core.mjs';

// Published examples use the production reader and deterministic, fictional PDFs.
// Never read user files or invent a result for an illustration.
export async function buildExamples() {
  const documents = [];
  for (const kind of ['before', 'after', 'image']) {
    const bytes = await fixture(kind);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const report = await readPdf(new Uint8Array(bytes), { library:pdfjs, name:`sample-${kind}.pdf` });
    documents.push({ kind, url:`https://thedollscout.com/document-assets/samples/sample-${kind}.pdf`, sha256, ...report });
  }
  return { schema:'tds-public-examples/v1', toolVersion:VERSION, pdfjs:pdfjs.version, reviewed:'2026-09-27',
    scope:'Fictional reproducible examples, not customer documents, certification or an accuracy benchmark.',
    documents, comparison:compareDocuments(documents[0],documents[1]) };
}

export const exampleCopy = {
 en: {
  title:'A result you can reproduce', intro:'Download these fictional PDFs and run them in the tool above. The results below are generated from the same PDF reader used by the tool, so you can check the example yourself.',
  cite:'Link to this example', data:'Download all sample results (JSON)', files:'Sample PDFs', after:'Revised handout', before:'Original handout', image:'Image-only sample', pages:'Pages', finding:'Check', result:'Observed result', action:'What to do next', present:'Detected', missing:'Not detected', yes:'Yes', no:'No', document:'Document', complete:'All pages processed', text:'Extracted text', compare:'Text changes', unknown:'Text comparison is inconclusive for pages without extractable text.', sources:'Method references', questions:'Questions about this tool',
  actions:['Check that the title describes the document; the tool does not test the viewer title setting.', 'Check that the declared language matches the content.', 'Inspect structure and reading order in an authoring or remediation tool.'],
  batch:'The batch includes a text PDF with missing metadata, a revised text PDF and a page with only a drawn shape. Processing all pages does not mean that every accessibility requirement passes.',
  extraction:'The original handout produces the page text below. The image-only sample produces zero text characters; OCR is outside this tool. Check the text against the source before reusing it.',
  comparison:'The revision changes the workshop time, inserts a page and changes the materials list. Suggested text pairings do not compare visual layout, images or PDF tags.',
  changeKinds:{changed:'Changed',added:'Added',removed:'Removed',unknown:'Unknown'}, beforePage:'Original page', afterPage:'Revised page',
  faq:[
   [['What does a detected PDF tag tell me?', 'It reports a tagged declaration or structure exposed by the PDF reader. A detected tag does not prove correct reading order, useful image descriptions or accessible tables. Review those separately.'], ['Can this checker certify WCAG or PDF/UA compliance?', 'No. It is an automated preflight plus a record of your manual review. It does not certify compliance, repair tags or produce a percentage accessibility score.']],
   [['How many PDFs can I audit together?', 'Up to 10 PDFs, 20 MB each and 100 MB in total. Inspection is limited to 200 pages per PDF and 600 pages per batch. Partial or unreadable results must stay visible in the handover.'], ['What happens if one PDF cannot be read?', 'Readable files keep their findings. The failed file is reported separately and the batch is partial. Obtain a readable copy and check it before treating the batch as finished.']],
   [['Why does my scanned PDF produce no text?', 'A scan may contain page images without a text layer. This tool extracts existing text only. Use OCR separately, check its accuracy, then extract the resulting text again.'], ['Will PDF to text preserve tables and reading order?', 'It returns text separated by page. It does not reconstruct table cells or guarantee visual or assistive-technology reading order. Inspect columns, tables and special characters in the original.']],
   [['Can I compare PDF versions after a page is inserted?', 'The tool aligns pages using normalized text and proposes pairings around insertions. Review added, removed and changed pages; pairings are suggestions and can be ambiguous for repeated content.'], ['Does identical extracted text mean two PDF files are identical?', 'No. Images, tags, layout and other bytes can differ. Use file verification for a SHA-256 and byte-count comparison, and review visual changes in the original PDFs.']]
  ]
 },
 de: {
  title:'Ein Ergebnis zum Nachprüfen', intro:'Laden Sie die fiktiven PDFs herunter und prüfen Sie diese mit dem Werkzeug oben. Die folgenden Ergebnisse stammen aus demselben PDF-Parser wie das Werkzeug.', cite:'Dieses Beispiel verlinken', data:'Alle Beispielergebnisse als JSON', files:'Beispiel-PDFs', after:'Überarbeitete Unterlage', before:'Ursprüngliche Unterlage', image:'Beispiel ohne Textebene', pages:'Seiten', finding:'Prüfung', result:'Beobachtung', action:'Nächster Schritt', present:'Erkannt', missing:'Nicht erkannt', yes:'Ja', no:'Nein', document:'Dokument', complete:'Alle Seiten verarbeitet', text:'Extrahierter Text', compare:'Textänderungen', unknown:'Ohne extrahierbaren Text bleibt der Textvergleich unklar.', sources:'Methodenquellen', questions:'Fragen zu diesem Werkzeug',
  actions:['Prüfen Sie, ob der Titel das Dokument beschreibt. Die Titelleisten-Einstellung wird nicht geprüft.', 'Prüfen Sie, ob die Sprachangabe zum Inhalt passt.', 'Struktur und Lesereihenfolge in einem Autoren- oder Reparaturwerkzeug prüfen.'],
  batch:'Der Stapel enthält ein Text-PDF mit fehlenden Metadaten, eine überarbeitete Textfassung und eine Seite nur mit einer gezeichneten Form. Vollständig verarbeitet bedeutet nicht barrierefrei.', extraction:'Die ursprüngliche Unterlage ergibt den folgenden Seitentext. Das Beispiel ohne Textebene ergibt null Textzeichen. Dieses Werkzeug führt keine OCR aus; prüfen Sie den Text am Original.', comparison:'Die neue Fassung ändert die Uhrzeit, fügt eine Seite ein und ändert die Materialliste. Die Textzuordnung vergleicht keine Bilder, Tags oder Layouts.', changeKinds:{changed:'Geändert',added:'Ergänzt',removed:'Entfernt',unknown:'Unklar'}, beforePage:'Alte Seite', afterPage:'Neue Seite',
  faq:[
   [['Was bedeutet ein erkanntes PDF-Tag?', 'Erkannt wird eine Tag-Deklaration oder eine vom Parser zugängliche Struktur. Das beweist keine korrekte Lesereihenfolge, Bildbeschreibungen oder barrierefreien Tabellen. Diese Punkte brauchen eine eigene Prüfung.'], ['Zertifiziert dieses Werkzeug WCAG oder PDF/UA?', 'Nein. Es bietet eine automatisierte Vorprüfung und dokumentiert Ihre manuelle Prüfung. Es zertifiziert keine Konformität, repariert keine Tags und berechnet keinen prozentualen Barrierefreiheitswert.']],
   [['Wie viele PDFs kann ich gemeinsam prüfen?', 'Bis zu 10 PDFs, höchstens 20 MB je Datei und 100 MB insgesamt. Die Prüfung erfasst maximal 200 Seiten je PDF und 600 je Stapel. Teilprüfungen und unlesbare Dateien bleiben im Übergabebericht sichtbar.'], ['Was passiert bei einer unlesbaren Datei?', 'Die Befunde lesbarer Dateien bleiben erhalten. Die fehlerhafte Datei wird getrennt ausgewiesen; der Stapel gilt als teilweise geprüft. Fordern Sie eine lesbare Kopie an und prüfen Sie diese nach.']],
   [['Warum liefert ein gescanntes PDF keinen Text?', 'Ein Scan kann nur Seitenbilder ohne Textebene enthalten. Das Werkzeug extrahiert vorhandenen Text. Führen Sie OCR separat aus, prüfen Sie die Erkennung und extrahieren Sie danach erneut.'], ['Bleiben Tabellen und Lesereihenfolge erhalten?', 'Die Ausgabe trennt Text nach Seiten. Tabellenzellen werden nicht rekonstruiert, und die visuelle oder assistive Lesereihenfolge wird nicht garantiert. Spalten, Tabellen und Sonderzeichen am Original prüfen.']],
   [['Funktioniert der Vergleich nach eingefügten Seiten?', 'Das Werkzeug ordnet Seiten anhand normalisierten Texts zu und schlägt Paare um Einfügungen herum vor. Prüfen Sie Ergänzungen, Löschungen und Änderungen. Wiederholter Inhalt kann die Zuordnung mehrdeutig machen.'], ['Bedeutet gleicher Text identische Dateien?', 'Nein. Bilder, Tags, Layout und andere Bytes können abweichen. Für SHA-256 und Bytezahl nutzen Sie die Dateiprüfung; visuelle Änderungen prüfen Sie in den Original-PDFs.']]
  ]
 },
 zh: {
  title:'你可以复现的检查结果', intro:'下载这些虚构示例 PDF，在上方工具中运行。下面的结果由工具所用的同一个 PDF 解析器生成，你可以自行核对。', cite:'引用这个示例', data:'下载全部示例结果（JSON）', files:'示例 PDF', after:'修订版讲义', before:'原版讲义', image:'无文本层示例', pages:'页数', finding:'检查项', result:'实际结果', action:'下一步', present:'已检测到', missing:'未检测到', yes:'是', no:'否', document:'文档', complete:'全部页面已处理', text:'提取的文本', compare:'文字变更', unknown:'没有可提取文本的页面，无法据此判定文字是否相同。', sources:'方法来源', questions:'这个工具的常见问题',
  actions:['核对标题是否准确描述文档；本工具不检查阅读器标题栏设置。', '核对语言声明是否与正文一致。', '在编辑或修复工具中检查标签结构和阅读顺序。'],
  batch:'这批样本包含缺少元数据的文本 PDF、修订后的文本 PDF，以及只有绘制图形的页面。全部页面已处理，不代表所有无障碍要求均已通过。', extraction:'原版讲义会产生下面按页分开的文本。无文本层示例的文本字符数为零；这个工具不做 OCR，复用前请对照原件核对。', comparison:'修订版更改了活动时间，插入一页，并修改了材料清单。文本配对不比较版式、图片或 PDF 标签。', changeKinds:{changed:'修改',added:'新增',removed:'删除',unknown:'未知'}, beforePage:'原版页码', afterPage:'修订版页码',
  faq:[
   [['检测到 PDF 标签，说明了什么？','它表示解析器发现了已标记声明或可访问的结构，并不证明阅读顺序、图片说明或表格正确。这些项目仍需单独检查。'],['这个工具能认证 WCAG 或 PDF/UA 合规吗？','不能。它提供自动预检并记录你的人工复核，不提供合规认证，不修复标签，也不计算百分比无障碍评分。']],
   [['一次能检查多少份 PDF？','最多 10 份，每份不超过 20 MB，总计不超过 100 MB。每份最多检查 200 页，每批最多 600 页。部分结果和无法读取的文件会在交接中保留。'],['某一份 PDF 无法读取时会怎样？','可读取文件的结果会保留，失败文件单独显示，整批视为部分完成。取得可读副本并重新检查后，再完成交接。']],
   [['扫描 PDF 为什么提取不出文字？','扫描件可能只有页面图片，没有文本层。此工具只提取已有文字。请另行进行 OCR，检查识别准确性后，再提取新文件的文本。'],['提取文本能保留表格和阅读顺序吗？','输出按页分隔的文字，不重建表格单元格，也不保证视觉或辅助技术的阅读顺序。分栏、表格和特殊字符需要对照原件检查。']],
   [['插入新页面后，还能比较 PDF 版本吗？','工具用规范化文本对齐页面，并在新增页面前后建议配对。请复核新增、删除和修改项；重复内容可能让配对存在歧义。'],['提取文字相同，就代表 PDF 文件相同吗？','不代表。图片、标签、版式及其他字节仍可能不同。检查完整文件请使用 SHA-256 和字节数核验；视觉变化仍需查看原 PDF。']]
  ]
 }
};

export const methodSources = [
 ['W3C PDF18 — document title','https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF18'],
 ['W3C PDF16 — document language','https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF16'],
 ['W3C PDF3 — reading and tab order','https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF3']
];

export function exampleView(lang, index, data, copy) {
 const c=exampleCopy[lang], names=[c.before,c.after,c.image], docs=data.documents;
 let headers, rows, lead;
 if(index===0) {
  const d=docs[1]; lead=c.intro;
  headers=[c.finding,c.result,c.action];
  rows=[['title', d.title,c.actions[0]],['language',d.language,c.actions[1]],['marked',d.marked?c.present:c.missing,c.actions[2]]].map(([key,result,action])=>[copy.checkCopy[key][0],result,action]);
 } else if(index===1) {
  lead=c.batch;headers=[c.document,c.pages,c.complete,c.finding];
  rows=docs.map((d,i)=>[names[i],String(d.pageCount),d.complete?c.yes:c.no,d.findings.filter(f=>f.status==='attention').map(f=>copy.checkCopy[f.code][0]+(f.page?' ('+f.page+')':'')).join('; ')]);
 } else if(index===2) {
  lead=c.extraction;headers=[c.pages,c.text];rows=docs[0].pages.map(p=>[String(p.number),p.text]);
 } else {
  lead=c.comparison;headers=[c.compare,c.beforePage,c.afterPage];rows=data.comparison.changes.map(r=>[c.changeKinds[r.kind],r.before===null?'—':String(r.before),r.after===null?'—':String(r.after)]);
 }
 return { c, lead, headers, rows, names };
}
export function workedHTML(lang,index,data,copy,url,esc) {
 const {c,lead,headers,rows,names}=exampleView(lang,index,data,copy);
 const used=index===0?[1]:index===1?[0,1,2]:index===2?[0,2]:[0,1];
 return `<section class="section worked-example" id="worked-example" aria-labelledby="example-heading"><h2 id="example-heading">${esc(c.title)}</h2><p>${esc(c.intro)}</p>${lead!==c.intro?`<p>${esc(lead)}</p>`:''}<div class="table-scroll" tabindex="0" role="region" aria-label="${esc(c.title)}"><table><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((cell,i)=>i===0?`<th scope="row">${esc(cell)}</th>`:`<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><h3>${esc(c.files)}</h3><ul>${used.map(i=>`<li><a href="${data.documents[i].url}" download>${esc(names[i])}</a></li>`).join('')}</ul><p><a href="${url}#worked-example">${esc(c.cite)}</a> · <a href="/document-assets/sample-results.json">${esc(c.data)}</a></p>${index===0?`<h3>${esc(c.sources)}</h3><ul>${methodSources.map(([label,href])=>`<li><a href="${href}">${esc(label)}</a></li>`).join('')}</ul>`:''}</section>`;
}
export function workedText(lang,index,data,copy,url) {
 const {c,lead,headers,rows,names}=exampleView(lang,index,data,copy);
 return [c.title,c.intro,lead,headers.join(' | '),...rows.map(row=>row.join(' | ')),...data.documents.map((d,i)=>`${names[i]}: ${d.url}`),`${c.cite}: ${url}#worked-example`,`${c.data}: https://thedollscout.com/document-assets/sample-results.json`,...(index===0?methodSources.map(([label,href])=>`${label}: ${href}`):[])];
}
