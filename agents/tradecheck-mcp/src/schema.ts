import * as z from 'zod/v4';
const text = z.string().trim().min(1).max(120).regex(/^[^\x00-\x1f\x7f]+$/, 'Use one line of plain text.');
const reference = text.describe('Actual document name and page/row. A locator supplied by the caller, not proof that the document was read. Never invent it.');
const decimal = (places: number) => z.string().regex(new RegExp(`^(0|[1-9][0-9]{0,8})(\\.[0-9]{1,${places}})?$`), `Non-negative decimal string; up to ${places} decimal places, no commas, scientific notation, signs or currency symbols.`);
const quantity = decimal(3).refine(v => Number(v) > 0, 'Quantity must be positive.');
const money = decimal(2);
const currency = z.enum(['USD','EUR','GBP','CAD','AUD','CNY','SGD','CHF','JPY']);
const poLine = z.strictObject({line_id:text,sku:text,uom:text,quantity,unit_price:decimal(4),source_ref:reference});
const invoiceLine = poLine.extend({po_line_id:text,line_total:money});
const priorLine = z.strictObject({po_line_id:text,sku:text,uom:text,quantity,source_ref:reference});
export const auditSchema = z.strictObject({
  po:z.strictObject({id:text,supplier_id:text,currency,source_ref:reference,lines:z.array(poLine).min(1).max(100)}),
  invoice:z.strictObject({id:text,po_id:text,supplier_id:text,currency,source_ref:reference,lines:z.array(invoiceLine).min(1).max(100),subtotal:money,charges:money,tax:money,total:money}),
  prior_invoices:z.array(z.strictObject({id:text,po_id:text,supplier_id:text,currency,source_ref:reference,lines:z.array(priorLine).min(1).max(100)})).max(20),
  history_status:z.enum(['complete','unknown']).describe('Complete means the caller has checked the full earlier non-cancelled invoice history for this PO. Empty with unknown does not mean no prior invoices.'),
  extraction_reviewed:z.boolean().describe('True only after a person checked extracted fields against the originals. This server does not perform OCR or verify source files.'),
}).refine(d=>d.prior_invoices.reduce((n,x)=>n+x.lines.length,0)<=1000,{message:'At most 1,000 prior invoice lines per check.'});
export type AuditInput = z.infer<typeof auditSchema>;
export const findingSchema = z.strictObject({code:z.string(),severity:z.enum(['exception','gap','info']),message:z.string(),refs:z.array(z.string()),refs_omitted:z.number().int().min(0).optional()});
export const reportSchema = z.strictObject({
  version:z.literal('0.1.0'),scope:z.literal('two-way document review'),status:z.enum(['exceptions_found','incomplete','no_exceptions_in_scope']),currency,
  invoice_id:z.string(),po_id:z.string(),findings:z.array(findingSchema),
  summary:z.strictObject({exceptions:z.number().int(),gaps:z.number().int(),invoice_lines:z.number().int(),matched_lines:z.number().int(),price_variance:z.string(),computed_subtotal:z.string(),computed_total:z.string()}),
  limits:z.array(z.string()),payment_authorized:z.literal(false)
});
export type Report = z.infer<typeof reportSchema>;
