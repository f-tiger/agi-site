import {auditSchema,type AuditInput,type Report} from './schema.js';
// All arithmetic uses integer decimal scales. Round each invoice line half up.
function scaled(value:string,places:number):bigint {const [whole='0',fraction='']=value.split('.');if(fraction.length>places&&/[1-9]/.test(fraction.slice(places)))throw Error(`Currency supports ${places} decimal places for totals.`);return BigInt(whole)*10n**BigInt(places)+BigInt(fraction.slice(0,places).padEnd(places,'0')||'0');}
function format(value:bigint,places:number):string {const sign=value<0n?'-':'';const v=(value<0n?-value:value).toString().padStart(places+1,'0');return sign+(places?v.slice(0,-places)+'.'+v.slice(-places):v);}
function extension(q:string,p:string,places:number):bigint {const product=scaled(q,3)*scaled(p,4), divisor=10n**BigInt(7-places);return (product+divisor/2n)/divisor;}
export function audit(raw:unknown):Report {
 const d:AuditInput=auditSchema.parse(raw), decimals=d.invoice.currency==='JPY'?0:2;
 const findings:Report['findings']=[];
 const add=(code:string,severity:'exception'|'gap'|'info',message:string,refs:string[])=>findings.push({code,severity,message,refs});
 const {po,invoice:inv}=d;
 if(!d.extraction_reviewed)add('EXTRACTION_UNREVIEWED','gap','Extracted values have not been checked against the original documents.',[po.source_ref,inv.source_ref]);
 if(d.history_status==='unknown')add('HISTORY_UNKNOWN','gap','Prior invoice history is incomplete. Cumulative quantity and duplicate detection are limited to the supplied records.',[po.source_ref]);
 const identityOK=po.id===inv.po_id&&po.supplier_id===inv.supplier_id;
 if(po.id!==inv.po_id)add('PO_REFERENCE_MISMATCH','exception','Invoice references a different purchase order.',[po.source_ref,inv.source_ref]);
 if(po.supplier_id!==inv.supplier_id)add('SUPPLIER_MISMATCH','exception','Supplier identifiers differ; line comparisons are not authorized by identity.',[po.source_ref,inv.source_ref]);
 const sameCurrency=po.currency===inv.currency;
 if(!sameCurrency)add('CURRENCY_MISMATCH','exception','Currencies differ. No conversion or cross-currency price variance is calculated.',[po.source_ref,inv.source_ref]);
 const poMap=new Map<string,AuditInput['po']['lines'][number]>(), duplicatePo=new Set<string>();
 for(const line of po.lines){if(poMap.has(line.line_id)){duplicatePo.add(line.line_id);add('DUPLICATE_PO_LINE','exception',`PO line identifier ${line.line_id} is repeated. Matching for this identifier is blocked.`,[poMap.get(line.line_id)!.source_ref,line.source_ref]);}else poMap.set(line.line_id,line);}
 const priorTotals=new Map<string,bigint>(),priorRefs=new Map<string,string[]>();const historyIDs=new Set<string>();
 let usableHistory=true;
 for(const prior of d.prior_invoices){
  if(prior.id===inv.id&&prior.supplier_id===inv.supplier_id)add('DUPLICATE_INVOICE','exception','This invoice ID already appears for this supplier in the supplied history.',[prior.source_ref,inv.source_ref]);
  const key=JSON.stringify([prior.supplier_id,prior.id]);
  if(historyIDs.has(key)){add('DUPLICATE_HISTORY','gap','The history contains the same invoice twice; repeated history is excluded from the cumulative check.',[prior.source_ref]);usableHistory=false;continue;}historyIDs.add(key);
  if(prior.po_id!==po.id||prior.supplier_id!==po.supplier_id||prior.currency!==po.currency){add('HISTORY_SCOPE_MISMATCH','gap','A prior invoice does not belong to this PO, supplier and currency; it is excluded.',[prior.source_ref]);usableHistory=false;continue;}
  if(prior.id===inv.id)continue;
  for(const line of prior.lines){const match=poMap.get(line.po_line_id);if(!match||duplicatePo.has(line.po_line_id)||match.sku!==line.sku||match.uom!==line.uom){add('HISTORY_LINE_UNMATCHED','gap','A prior line cannot be matched exactly; cumulative checks are incomplete.',[line.source_ref]);usableHistory=false;continue;}priorTotals.set(line.po_line_id,(priorTotals.get(line.po_line_id)||0n)+scaled(line.quantity,3));priorRefs.set(line.po_line_id,[...(priorRefs.get(line.po_line_id)||[]),line.source_ref]);}
 }
 const currentTotals=new Map<string,bigint>(),currentRefs=new Map<string,string[]>(),seenLines=new Set<string>();
 let computedSubtotal=0n,priceVariance=0n,matched=0;
 for(const line of inv.lines){
  const duplicate=seenLines.has(line.line_id);if(duplicate)add('DUPLICATE_INVOICE_LINE','exception',`Invoice line identifier ${line.line_id} repeats; duplicate data must be reviewed.`,[line.source_ref]);seenLines.add(line.line_id);
  const computed=extension(line.quantity,line.unit_price,decimals);computedSubtotal+=computed;
  if(scaled(line.line_total,decimals)!==computed)add('LINE_ARITHMETIC','exception',`Line ${line.line_id}: quantity × unit price rounds to ${format(computed,decimals)} ${inv.currency}, not the stated ${line.line_total}.`,[line.source_ref]);
  const match=poMap.get(line.po_line_id);
  if(!match){add('UNKNOWN_PO_LINE','exception',`Invoice line ${line.line_id} has no matching PO line ID.`,[line.source_ref]);continue;}
  if(duplicatePo.has(line.po_line_id)||!identityOK)continue;
  if(match.sku!==line.sku||match.uom!==line.uom){add('ITEM_OR_UNIT_MISMATCH','exception',`Line ${line.line_id}: SKU or unit differs. No fuzzy matching or unit conversion applied.`,[match.source_ref,line.source_ref]);continue;}
  matched++;currentTotals.set(line.po_line_id,(currentTotals.get(line.po_line_id)||0n)+scaled(line.quantity,3));currentRefs.set(line.po_line_id,[...(currentRefs.get(line.po_line_id)||[]),line.source_ref]);
  if(sameCurrency){const variance=computed-extension(line.quantity,match.unit_price,decimals);priceVariance+=variance;if(scaled(line.unit_price,4)!==scaled(match.unit_price,4))add('UNIT_PRICE_CHANGED','exception',`Line ${line.line_id}: unit price ${line.unit_price} differs from PO ${match.unit_price}; extended variance ${format(variance,decimals)} ${inv.currency}.`,[match.source_ref,line.source_ref]);}
 }
 if(identityOK)for(const [id,line] of poMap){if(duplicatePo.has(id))continue;const current=currentTotals.get(id)||0n,prior=priorTotals.get(id)||0n,ordered=scaled(line.quantity,3);if(current+prior>ordered)add('QUANTITY_OVER_ORDER','exception',`PO line ${id}: supplied current plus prior quantity ${format(current+prior,3)} exceeds ordered ${line.quantity} ${line.uom}.`,[line.source_ref,...(currentRefs.get(id)||[]),...(priorRefs.get(id)||[])]);else if(current>0n&&current+prior<ordered)add('PARTIAL_INVOICE','info',`PO line ${id}: supplied cumulative quantity ${format(current+prior,3)} is below ordered ${line.quantity}; this may be legitimate partial invoicing.`,[line.source_ref]);}
 const subtotal=scaled(inv.subtotal,decimals),charges=scaled(inv.charges,decimals),tax=scaled(inv.tax,decimals),total=scaled(inv.total,decimals);
 if(computedSubtotal!==subtotal)add('SUBTOTAL_MISMATCH','exception',`Computed lines sum to ${format(computedSubtotal,decimals)} ${inv.currency}, not stated subtotal ${inv.subtotal}.`,[inv.source_ref]);
 if(subtotal+charges+tax!==total)add('TOTAL_MISMATCH','exception',`Stated subtotal + charges + tax equals ${format(subtotal+charges+tax,decimals)} ${inv.currency}, not stated total ${inv.total}.`,[inv.source_ref]);
 if(charges>0n||tax>0n)add('CHARGES_TAX_UNVERIFIED','gap','Charges and tax enter the arithmetic only. Their contractual or tax correctness has not been checked.',[inv.source_ref]);
 if(!usableHistory&&!findings.some(x=>x.code==='HISTORY_UNKNOWN'))add('CUMULATIVE_CHECK_INCOMPLETE','gap','Resolve the excluded history records before relying on cumulative quantity.',[po.source_ref]);
 const exceptions=findings.filter(x=>x.severity==='exception').length,gaps=findings.filter(x=>x.severity==='gap').length;
 return {version:'0.1.0',scope:'two-way document review',status:exceptions?'exceptions_found':gaps?'incomplete':'no_exceptions_in_scope',currency:inv.currency,invoice_id:inv.id,po_id:po.id,findings,summary:{exceptions,gaps,invoice_lines:inv.lines.length,matched_lines:matched,price_variance:sameCurrency&&identityOK?format(priceVariance,decimals):'not_comparable',computed_subtotal:format(computedSubtotal,decimals),computed_total:format(computedSubtotal+charges+tax,decimals)},limits:['No receipt, delivery or quality verification; this is not three-way matching.','Source references and history completeness are caller assertions, not independently verified.','No tax, customs, sanctions, bank account or payment verification.','Totals use per-line half-up rounding; discounts, credits, deposits and other rounding rules require manual review.','Never authorizes payment. Review originals and resolve exceptions.'],payment_authorized:false};
}
export function supplierDraft(raw:unknown,language:'en'|'zh'='en'):{subject:string;body:string;report:Report} {
 const report=audit(raw), items=report.findings.filter(x=>x.severity!=='info');
 const heading=language==='zh'?`请核对发票 ${report.invoice_id} 与采购单 ${report.po_id}`:`Please clarify invoice ${report.invoice_id} against PO ${report.po_id}`;
 const intro=language==='zh'?'以下差异来自所提供单据的数据核对，尚需人工确认，请协助澄清：':'Our review of the supplied document data found the following items for human verification. Please clarify:';
 const noItems=language==='zh'?'当前检查范围内未发现异常。请人工确认收货、合同及付款条件。':'No exception was found within the checked scope. Receipt, contract and payment terms still require human review.';
 return {subject:heading,body:`${heading}\n\n${items.length?intro:noItems}\n${items.slice(0,20).map((x,i)=>`${i+1}. [${x.code}] ${x.message}\n   Source: ${x.refs.slice(0,6).join('; ')}`).join('\n')}${items.length>20?'\nMore findings exist. Retrieve the full paginated report.':''}\n\n${language==='zh'?'这是未发送的核对草稿，不构成付款批准。':'Unsent review draft. This is not payment approval.'}`,report};
}
