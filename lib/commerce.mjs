import {commerceDefaults,validateCommerceSettings,checkoutSnapshot,guid} from './commerce-domain.mjs';
import {payfastReady,paymentFields,paymentBase,parseNotification,verifyNotification,payfastIP} from './payfast.mjs';
import {bcReady,checkBCStock,deliverBC} from './business-central.mjs';
import {escapeHTML as esc,cleanText} from './domain.mjs';
const now=()=>new Date().toISOString();
const hash=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const response=(x,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
export async function commerceConfig(db){const row=await db.prepare('SELECT value FROM settings WHERE key=?').bind('commerce').first();return {...commerceDefaults,...(row?JSON.parse(row.value):{})};}
export function checkoutReady(e,c,site){return c.enabled&&c.termsApproved&&c.connectionVerified&&c.allocationApproved&&c.termsVersion&&c.shippingDescription&&c.shippingProvinces.length>0&&c.shippingCents!==null&&site.intakeEnabled&&site.privacyApproved&&site.legalName&&payfastReady(e)&&e.PAYFAST_MODE==='live'&&bcReady(e)&&/^https:\/\/[a-z0-9.-]+$/.test(e.COMMERCE_ORIGIN||'')&&(!c.shippingCents||guid.test(e.BC_SHIPPING_ITEM_ID||''));}
export async function availableAllocations(db){const r=await db.prepare("SELECT i.product_id, SUM(i.quantity) AS allocated FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.status IN ('paid','paid_review','fulfilled') OR (o.status='awaiting_payment' AND o.expires_at>?) GROUP BY i.product_id").bind(now()).all();return Object.fromEntries(r.results.map(x=>[x.product_id,x.allocated]));}
export async function queueBC(db,id,kind,reference,payload){await db.prepare('INSERT OR IGNORE INTO commerce_jobs (id,kind,reference,payload,created_at) VALUES (?,?,?,?,?)').bind(id,kind,reference,JSON.stringify(payload),now()).run();}
export async function syncBCJob(db,e,id,fetcher=fetch){
 const row=await db.prepare('SELECT * FROM commerce_jobs WHERE id=?').bind(id).first();if(!row||row.status==='delivered')return;
 const lock=await db.prepare("UPDATE commerce_jobs SET status='sending',last_attempt=? WHERE id=? AND (status IN ('pending','failed','uncertain') OR (status='sending' AND last_attempt<?)) RETURNING id").bind(now(),id,new Date(Date.now()-120000).toISOString()).first();if(!lock)return;
 try{const result=await deliverBC(e,{kind:row.kind,reference:row.reference,documentId:row.document_id,uncertain:Boolean(row.uncertain),uncertainSequence:row.uncertain_sequence},JSON.parse(row.payload),async state=>{await db.prepare('UPDATE commerce_jobs SET document_id=COALESCE(?,document_id),uncertain=?,uncertain_sequence=?,last_attempt=? WHERE id=?').bind(state.documentId||null,state.uncertain?1:0,state.sequence||0,now(),id).run();},fetcher);await db.prepare("UPDATE commerce_jobs SET status='delivered',document_id=?,document_number=?,uncertain=0,error=NULL WHERE id=?").bind(result.id,result.number||'',id).run();if(row.kind==='quote')await db.prepare("UPDATE enquiries SET crm_status='delivered',crm_error=NULL WHERE id=?").bind(id).run();}
 catch(error){const current=await db.prepare('SELECT uncertain FROM commerce_jobs WHERE id=?').bind(id).first();await db.prepare('UPDATE commerce_jobs SET status=?,error=? WHERE id=?').bind(current?.uncertain?'uncertain':'failed',cleanText(error.message,300),id).run();}
}
function publicOrder(o){return {id:o.id,reference:o.reference,status:o.status,totalCents:o.amount_cents,currency:'ZAR',fulfilment:o.fulfilment,expiresAt:o.expires_at,paidAt:o.paid_at};}
export async function createOrder(db,e,input,c,products,rawCatalogue,fetcher=fetch){
 const snapshot=checkoutSnapshot(input,products,c),fingerprint=await hash(JSON.stringify(snapshot)),tokenHash=await hash(input.accessToken);
 const existing=await db.prepare('SELECT * FROM orders WHERE request_id=?').bind(input.requestId).first();if(existing){if(existing.token_hash!==tokenHash||existing.fingerprint!==fingerprint)throw new Error('This checkout has changed. Start a new checkout.');return existing;}
 await checkBCStock(e,snapshot,fetcher);
 const id=crypto.randomUUID(),reference='NW-'+id.replaceAll('-',''),created=now(),expires=new Date(Date.now()+30*60000).toISOString();
 // Bind the complete basket once so the reservation stays atomic at the 30-item limit.
 const insert=db.prepare(`
  INSERT INTO orders (id,request_id,fingerprint,token_hash,reference,snapshot,amount_cents,provider_mode,created_at,expires_at)
  SELECT ?,?,?,?,?,?,?,?,?,?
  WHERE NOT EXISTS (
   SELECT 1 FROM json_each(?) AS line
   WHERE json_extract(line.value,'$.quantity') + (
    SELECT COALESCE(SUM(i.quantity),0) FROM order_items i JOIN orders o ON o.id=i.order_id
    WHERE i.product_id=json_extract(line.value,'$.id') AND (
     o.status IN ('paid','paid_review','fulfilled') OR (o.status='awaiting_payment' AND o.expires_at>?)
    )
   ) > json_extract(line.value,'$.onlineAllocation')
  ) AND COALESCE((SELECT value FROM settings WHERE key='catalogue'),'')=?
 `).bind(id,input.requestId,fingerprint,tokenHash,reference,JSON.stringify(snapshot),snapshot.totalCents,e.PAYFAST_MODE,created,expires,JSON.stringify(snapshot.items),created,rawCatalogue);
 await db.batch([insert,...snapshot.items.map(p=>db.prepare('INSERT INTO order_items (id,order_id,product_id,quantity) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM orders WHERE id=?)').bind(id+':'+p.id,id,p.id,p.quantity,id))]);
 const order=await db.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();if(!order)throw new Error('Stock or catalogue details changed. Refresh your basket and try again.');return order;
}
export async function commerceAPI(request,ctx){
 const {db,e,readJSON,readBytes,rate,siteConfig,catalogue,role,audit,fetcher=fetch}=ctx;const url=new URL(request.url),path=url.pathname.replace(/\/$/,'');
 if(!path.startsWith('/api/commerce')&&!path.startsWith('/api/admin/commerce')&&path!=='/api/payments/payfast')return null;
 try{
  if(path==='/api/payments/payfast'&&request.method==='POST'){
   if(!payfastIP(request.headers.get('cf-connecting-ip')))return response({message:'Unrecognised payment source.'},403);
   if(!payfastReady(e))return response({message:'Payments not configured.'},503);
   if(!request.headers.get('content-type')?.includes('application/x-www-form-urlencoded'))return response({message:'Invalid notification.'},400);
   const fields=parseNotification(new TextDecoder().decode(await readBytes(request,16000)));if(!guid.test(fields.m_payment_id||''))return response({message:'Invalid order.'},400);
   const order=await db.prepare('SELECT * FROM orders WHERE id=?').bind(fields.m_payment_id).first();if(!order)return response({message:'Order not found.'},404);
   let verified;try{verified=await verifyNotification(e,fields,order,fetcher);}catch{return response({message:'Payment could not be verified.'},400);}
   if(!verified.complete)return response({ok:true});
   const recorded=await db.prepare('SELECT order_id FROM payment_events WHERE transaction_id=?').bind(verified.transactionId).first();if(recorded&&recorded.order_id!==order.id)return response({message:'Payment reference conflict.'},409);
   await db.prepare('INSERT OR IGNORE INTO payment_events (transaction_id,order_id,amount_cents,received_at) VALUES (?,?,?,?)').bind(verified.transactionId,order.id,order.amount_cents,now()).run();
   const owner=await db.prepare('SELECT order_id FROM payment_events WHERE transaction_id=?').bind(verified.transactionId).first();if(owner?.order_id!==order.id)return response({message:'Payment reference conflict.'},409);
   if(order.payment_id&&order.payment_id!==verified.transactionId){await db.prepare("UPDATE orders SET status='paid_review' WHERE id=?").bind(order.id).run();return response({ok:true,review:true});}
   const status=order.status==='awaiting_payment'&&order.expires_at>now()?'paid':'paid_review';
   await db.prepare("UPDATE orders SET status=?,payment_id=?,paid_at=? WHERE id=? AND payment_id IS NULL").bind(status,verified.transactionId,now(),order.id).run();
   const paid=await db.prepare('SELECT * FROM orders WHERE id=?').bind(order.id).first();
   if(paid.payment_id!==verified.transactionId){await db.prepare("UPDATE orders SET status='paid_review' WHERE id=?").bind(order.id).run();return response({ok:true,review:true});}
   if(paid.status==='paid'&&paid.provider_mode==='live'){await queueBC(db,paid.id,'order',paid.reference,JSON.parse(paid.snapshot));if(ctx.background)ctx.background(()=>syncBCJob(db,e,paid.id,fetcher));}
   // Acknowledge only after the durable payment and outbox records exist. Staff
   // can retry BC independently without retrying or recapturing a payment.
   return response({ok:true});
  }
  if(request.method!=='GET'&&(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site'))return response({message:'Same-origin request required.'},403);
  const c=await commerceConfig(db),site=await siteConfig(),enabled=checkoutReady(e,c,site);
  if(path==='/api/commerce/config'&&request.method==='GET')return response({enabled,shippingCents:c.shippingCents,shippingProvinces:c.shippingProvinces,shippingDescription:c.shippingDescription,termsVersion:c.termsVersion,provider:'Payfast'});
  if(path==='/api/commerce/checkout'&&request.method==='POST'){
   if(!enabled||url.origin!==e.COMMERCE_ORIGIN)return response({message:'Online payment is not open yet. Please request a quote.'},503);
   if(!await rate(request,'checkout',5))return response({message:'Too many checkout attempts. Please try later.'},429);
   const input=await readJSON(request),catalogueRow=await db.prepare('SELECT value FROM settings WHERE key=?').bind('catalogue').first();
   const order=await createOrder(db,e,input,c,(await catalogue()).products,catalogueRow?.value||'',fetcher);return response({...publicOrder(order),paymentReady:order.status==='awaiting_payment'&&order.expires_at>now()},201);
  }
  if(path==='/api/commerce/order'&&request.method==='POST'){
   const input=await readJSON(request);if(!guid.test(input.id||'')||!/^[a-f0-9]{64}$/.test(input.accessToken||''))return response({message:'Order not found.'},404);
   const order=await db.prepare('SELECT * FROM orders WHERE id=? AND token_hash=?').bind(input.id,await hash(input.accessToken)).first();if(!order)return response({message:'Order not found.'},404);
   // A browser return can only read status; it cannot mark a payment successful.
   return response({...publicOrder(order),items:JSON.parse(order.snapshot).items.map(p=>({name:p.name,quantity:p.quantity,totalCents:p.totalCents})),shippingCents:JSON.parse(order.snapshot).shippingCents,paymentReady:enabled&&order.status==='awaiting_payment'&&order.expires_at>now()});
  }
  if(path==='/api/commerce/payment'&&request.method==='POST'){
   if(!enabled||url.origin!==e.COMMERCE_ORIGIN)return response({message:'Payment unavailable.'},503);const input=await readJSON(request);
   if(!guid.test(input.id||'')||!/^[a-f0-9]{64}$/.test(input.accessToken||''))return response({message:'Order not found.'},404);
   const order=await db.prepare('SELECT * FROM orders WHERE id=? AND token_hash=?').bind(input.id,await hash(input.accessToken)).first();if(!order||order.status!=='awaiting_payment'||order.expires_at<=now()||order.provider_mode!==e.PAYFAST_MODE)return response({message:'This payment session has ended. Check your order status before starting another.'},409);
   return response({action:paymentBase(e.PAYFAST_MODE)+'/eng/process',fields:paymentFields(e,order,e.COMMERCE_ORIGIN,input.accessToken)});
  }
  if(!path.startsWith('/api/admin/commerce'))return response({message:'Not found.'},404);const user=await role(request);if(!user||!['admin','leads'].includes(user.role))return response({message:'Authorised commerce account required.'},401);
  if(path==='/api/admin/commerce'&&request.method==='GET'){const rows=(await db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200').all()).results;const jobs=(await db.prepare('SELECT id,kind,reference,status,document_id,document_number,error,uncertain FROM commerce_jobs ORDER BY created_at DESC LIMIT 200').all()).results;const payments=(await db.prepare('SELECT * FROM payment_events ORDER BY received_at DESC LIMIT 300').all()).results;return response({payments,orders:rows.map(({token_hash,fingerprint,...r})=>({...r,snapshot:JSON.parse(r.snapshot)})),jobs,settings:user.role==='admin'?c:null,paymentConfigured:payfastReady(e),paymentMode:e.PAYFAST_MODE||'not configured',businessCentralConfigured:bcReady(e),enabled});}
  if(path==='/api/admin/commerce/settings'&&request.method==='POST'&&user.role==='admin'){const next=validateCommerceSettings(await readJSON(request));if(next.enabled&&!checkoutReady(e,next,site))return response({message:'Checkout needs live payment credentials, verified Business Central, an approved stock allocation, delivery, sales terms and enabled privacy-approved intake.'},400);await db.prepare('INSERT INTO settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').bind('commerce',JSON.stringify(next),now()).run();await audit('commerce-settings',next,'settings',user.id);return response({ok:true});}
  if(path==='/api/admin/commerce/retry'&&request.method==='POST'){const input=await readJSON(request);await syncBCJob(db,e,input.id,fetcher);return response({ok:true});}
  if(path==='/api/admin/commerce/fulfilment'&&request.method==='POST'){const input=await readJSON(request);if(!['Unfulfilled','Processing','Dispatched','Completed'].includes(input.fulfilment))return response({message:'Invalid fulfilment stage.'},400);const r=await db.prepare("UPDATE orders SET fulfilment=? WHERE id=? AND status='paid' AND EXISTS (SELECT 1 FROM commerce_jobs j WHERE j.id=orders.id AND j.status='delivered')").bind(input.fulfilment,input.id).run();if(r.meta.changes!==1)return response({message:'Only verified paid orders with completed BC delivery can progress.'},409);await audit('order:'+input.id,{fulfilment:input.fulfilment},'fulfilment',user.id);return response({ok:true});}
  return response({message:'Not found or permission denied.'},403);
 }catch(error){console.error('Commerce request failed:',error.name);const safe=['Reload checkout','Accept the privacy','Complete all','Check your','Please request','Choose between','Check product','One or more','For customised','Request a quote','This checkout','Stock or catalogue','Product availability','Enter a valid'];return response({message:safe.some(p=>error.message.startsWith(p))?error.message:'Unable to complete this request. No payment has been confirmed. Please try again or contact NGETU.'},safe.some(p=>error.message.startsWith(p))?400:503);}
}
