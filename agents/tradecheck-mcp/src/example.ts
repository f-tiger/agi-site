import type {AuditInput} from './schema.js';
export const example:AuditInput={
 po:{id:'PO-1042',supplier_id:'SUP-DEMO',currency:'EUR',source_ref:'fictional-po.csv row 1',lines:[
  {line_id:'10',sku:'BOTTLE-750',uom:'EA',quantity:'300',unit_price:'2.50',source_ref:'fictional-po.csv row 2'},
  {line_id:'20',sku:'LID-BLACK',uom:'EA',quantity:'100',unit_price:'0.40',source_ref:'fictional-po.csv row 3'}]},
 invoice:{id:'INV-0088',po_id:'PO-1042',supplier_id:'SUP-DEMO',currency:'EUR',source_ref:'fictional-invoice.csv row 1',lines:[
  {line_id:'1',po_line_id:'10',sku:'BOTTLE-750',uom:'EA',quantity:'220',unit_price:'2.70',line_total:'594.00',source_ref:'fictional-invoice.csv row 2'},
  {line_id:'2',po_line_id:'20',sku:'LID-BLACK',uom:'EA',quantity:'100',unit_price:'0.40',line_total:'40.00',source_ref:'fictional-invoice.csv row 3'}],subtotal:'634.00',charges:'0.00',tax:'0.00',total:'634.00'},
 prior_invoices:[{id:'INV-0070',po_id:'PO-1042',supplier_id:'SUP-DEMO',currency:'EUR',source_ref:'fictional-prior.csv row 1',lines:[{po_line_id:'10',sku:'BOTTLE-750',uom:'EA',quantity:'100',source_ref:'fictional-prior.csv row 2'}]}],
 history_status:'complete',extraction_reviewed:true
};
