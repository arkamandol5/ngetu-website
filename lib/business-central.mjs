import {guid} from './commerce-domain.mjs';
export function bcReady(e){return ['BC_TENANT_ID','BC_CLIENT_ID','BC_COMPANY_ID','BC_WEB_CUSTOMER_ID'].every(k=>guid.test(e[k]||''))&&Boolean(e.BC_CLIENT_SECRET)&&/^[A-Za-z0-9_-]{1,80}$/.test(e.BC_ENVIRONMENT||'');}
export async function bcClient(e,fetcher=fetch){
 if(!bcReady(e))throw new Error('Business Central configuration is incomplete.');
 const auth=await fetcher('https://login.microsoftonline.com/'+e.BC_TENANT_ID+'/oauth2/v2.0/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:e.BC_CLIENT_ID,client_secret:e.BC_CLIENT_SECRET,grant_type:'client_credentials',scope:'https://api.businesscentral.dynamics.com/.default'}),redirect:'error',signal:AbortSignal.timeout(10000)});if(!auth.ok)throw new Error('Business Central authentication failed.');const token=await auth.json();if(!token.access_token)throw new Error('Missing Business Central access token.');
 const base='https://api.businesscentral.dynamics.com/v2.0/'+e.BC_TENANT_ID+'/'+e.BC_ENVIRONMENT+'/api/v2.0/companies('+e.BC_COMPANY_ID+')/';
 return async(path,body)=>{const response=await fetcher(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json','Accept-Language':'en-US'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Business Central HTTP '+response.status);return response.json();};
}
export async function checkBCStock(e,snapshot,fetcher=fetch){const api=await bcClient(e,fetcher);for(const line of snapshot.items){const item=await api('items('+line.bcItemId+')');if(item.blocked||item.number!==line.sku||item.type!=='Inventory'||!Number.isFinite(item.inventory)||item.inventory<line.quantity)throw new Error('Product availability needs confirmation. Please request a quote.');}return true;}
export function bcDocumentHeader(e,reference,buyer){return {externalDocumentNumber:reference,customerId:e.BC_WEB_CUSTOMER_ID,currencyCode:'ZAR',shipToName:buyer.company||buyer.name,shipToContact:buyer.name,shipToAddressLine1:buyer.address||'',shipToAddressLine2:buyer.address2||'',shipToCity:buyer.city||'',shipToState:buyer.province||'',shipToPostCode:buyer.postcode||'',shipToCountry:'ZA',phoneNumber:buyer.phone||'',email:buyer.email};}
export function bcLines(e,snapshot,kind){
 if(kind==='quote'){const text=['WEBSITE QUOTE REQUEST — confirm scope and price',snapshot.name+' / '+snapshot.company,snapshot.goal,...(snapshot.quoteItems||[]).map(x=>x.quantity+' x '+x.name+'; '+(x.sku||'SKU to confirm')+'; '+x.configuration)].join('\n');return (text.match(/[\s\S]{1,95}/g)||[]).map((description,i)=>({sequence:(i+1)*10000,lineType:'Comment',description}));}
 const lines=snapshot.items.map((p,i)=>({sequence:(i+1)*10000,lineType:'Item',itemId:p.bcItemId,quantity:p.quantity,unitPrice:p.unitPriceCents/100,discountPercent:0}));if(snapshot.shippingCents){if(!guid.test(e.BC_SHIPPING_ITEM_ID||''))throw new Error('Configure the Business Central delivery service item.');lines.push({sequence:(lines.length+1)*10000,lineType:'Item',itemId:e.BC_SHIPPING_ITEM_ID,quantity:1,unitPrice:snapshot.shippingCents/100,discountPercent:0});}return lines;
}
// A durable checkpoint is written before each outbound mutation. An uncertain
// mutation is reconciled through GET only; it is never blindly submitted again.
export async function deliverBC(e,job,snapshot,checkpoint,fetcher=fetch){
 const api=await bcClient(e,fetcher),collection=job.kind==='quote'?'salesQuotes':'salesOrders',lineCollection=job.kind==='quote'?'salesQuoteLines':'salesOrderLines';
 const found=await api(collection+'?$filter='+encodeURIComponent("externalDocumentNumber eq '"+job.reference+"'")+'&$expand='+lineCollection);if(!Array.isArray(found.value)||found.value.length>1)throw new Error('Business Central reconciliation needs manual review.');
 let doc=found.value[0];
 if(doc){
  if(!guid.test(doc.id)||doc.customerId?.toLowerCase()!==e.BC_WEB_CUSTOMER_ID.toLowerCase()||doc.currencyCode!=='ZAR')
   throw new Error('Business Central document customer, currency or identity needs review.');
  if(job.documentId ? job.documentId!==doc.id : !(job.uncertain&&job.uncertainSequence===0))
   throw new Error('Business Central document identity needs manual reconciliation.');
  if(job.uncertain&&job.uncertainSequence===0){
   job.uncertain=false;
   await checkpoint({documentId:doc.id,uncertain:false});
  }
 }else{
  if(job.documentId||job.uncertain)throw new Error('Previously attempted Business Central document was not found. Reconcile it before retrying.');
  await checkpoint({uncertain:true,sequence:0});
  doc=await api(collection,bcDocumentHeader(e,job.reference,job.kind==='quote'?snapshot:snapshot.buyer));
  if(!guid.test(doc.id))throw new Error('Business Central returned an invalid document ID.');
  await checkpoint({documentId:doc.id,uncertain:false});
 }
 if(job.kind==='order'&&doc.pricesIncludeTax!==true)throw new Error('Business Central web customer must use VAT-inclusive document prices.');
 const expected=bcLines(e,snapshot,job.kind),existing=doc[lineCollection]||(await api(collection+'('+doc.id+')/'+lineCollection)).value;
 for(const line of expected){const match=existing.find(p=>p.sequence===line.sequence);if(match){if(match.lineType!==line.lineType||(line.lineType==='Item'&&(match.itemId!==line.itemId||match.quantity!==line.quantity||Math.round(match.unitPrice*100)!==Math.round(line.unitPrice*100)))||(line.lineType==='Comment'&&match.description!==line.description))throw new Error('Business Central line differs from the website snapshot.');if(job.uncertain&&job.uncertainSequence===line.sequence){job.uncertain=false;await checkpoint({documentId:doc.id,uncertain:false});}continue;}
  if(job.uncertain)throw new Error('A previous line write needs reconciliation before retry.');await checkpoint({documentId:doc.id,uncertain:true,sequence:line.sequence});await api(collection+'('+doc.id+')/'+lineCollection,line);await checkpoint({documentId:doc.id,uncertain:false});
 }
 const final=await api(collection+'('+doc.id+')');if(job.kind==='order'&&Math.round(final.totalAmountIncludingTax*100)!==snapshot.totalCents)throw new Error('Business Central total does not match the captured payment. Review tax or pricing setup.');return {id:doc.id,number:final.number};
}
