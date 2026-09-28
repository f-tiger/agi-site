import { PDFDocument, StandardFonts, PDFName, PDFString } from 'pdf-lib';
export async function fixture(kind = 'before') {
  const pdf = await PDFDocument.create();
  pdf.setProducer('TDS fictional test fixture');
  pdf.setCreationDate(new Date('2026-09-25T00:00:00Z'));
  pdf.setModificationDate(new Date('2026-09-25T00:00:00Z'));
  if (kind === 'after' || kind === 'tagged') { pdf.setTitle('Fictional workshop handout'); pdf.catalog.set(PDFName.of('Lang'), PDFString.of('en-US')); }
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const texts = kind === 'after' ? ['Fictional workshop handout\nSession starts at 10:30.\nBring a notebook.', 'Added page\nThis is a fictional revision for testing.', 'Materials checklist\nNotebook, pencil and water.'] : ['Fictional workshop handout\nSession starts at 09:30.\nBring a notebook.', 'Materials checklist\nNotebook and pencil.'];
  if (kind === 'image') {
    const page = pdf.addPage([400, 400]); page.drawRectangle({ x: 40, y: 100, width: 300, height: 180 });
  } else for (const text of texts) { const page = pdf.addPage([595, 842]); page.drawText(text, { x: 55, y: 740, size: 16, lineHeight: 26, font }); }
  if (kind === 'long') for (let i = pdf.getPageCount(); i < 203; i++) pdf.addPage([200, 200]).drawText(`Fixture page ${i + 1}`, { x: 15, y: 140, size: 12, font });
  if (kind === 'tagged') {
    pdf.catalog.set(PDFName.of('MarkInfo'), pdf.context.obj({ Marked: true }));
    const page = pdf.getPages()[0];
    const tree = pdf.context.obj({ Type: 'StructTreeRoot' }); const treeRef = pdf.context.register(tree);
    const figure = pdf.context.obj({ Type: 'StructElem', S: 'Figure', P: treeRef, Pg: page.ref, K: 0 });
    const figureRef = pdf.context.register(figure);
    const parentTree = pdf.context.register(pdf.context.obj({ Nums: [0, [figureRef]] }));
    tree.set(PDFName.of('K'), pdf.context.obj([figureRef])); tree.set(PDFName.of('ParentTree'), parentTree);
    page.node.set(PDFName.of('StructParents'), pdf.context.obj(0)); pdf.catalog.set(PDFName.of('StructTreeRoot'), treeRef);
  }
  return pdf.save({ useObjectStreams: true });
}
