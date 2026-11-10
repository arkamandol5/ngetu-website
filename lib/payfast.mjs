import {createHash,timingSafeEqual} from 'node:crypto';
import {cents} from './commerce-domain.mjs';
const encode=v=>encodeURIComponent(String(v)).replace(/[!'()*~]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase()).replace(/%20/g,'+');
export const paymentBase=mode=>mode==='live'?'https://www.payfast.co.za':'https://sandbox.payfast.co.za';
export function payfastReady(e){return ['sandbox','live'].includes(e.PAYFAST_MODE)&&/^\d{8}$/.test(e.PAYFAST_MERCHANT_ID||'')&&Boolean(e.PAYFAST_MERCHANT_KEY)&&String(e.PAYFAST_PASSPHRASE||'').length>=16;}
export function parameterString(fields){return Object.entries(fields).filter(([key,v])=>key!=='signature'&&v!==''&&v!==undefined&&v!==null).map(([k,v])=>k+'='+encode(v)).join('&');}
export function notificationString(fields){return Object.entries(fields).filter(([k])=>k!=='signature').map(([k,v])=>k+'='+encode(v)).join('&');}
export function signature(fields,passphrase,notification=false){return createHash('md5').update((notification?notificationString(fields):parameterString(fields))+'&passphrase='+encode(passphrase)).digest('hex');}
export function paymentFields(e,order,origin,token){
 const b=JSON.parse(order.snapshot).buyer;const fields={merchant_id:e.PAYFAST_MERCHANT_ID,merchant_key:e.PAYFAST_MERCHANT_KEY,return_url:origin+'/checkout/?order='+order.id+'#'+token,cancel_url:origin+'/checkout/?order='+order.id+'&cancelled=1#'+token,notify_url:origin+'/api/payments/payfast',name_first:b.name.slice(0,100),email_address:b.email,m_payment_id:order.id,amount:(order.amount_cents/100).toFixed(2),item_name:'NGETU '+order.reference};return {...fields,signature:signature(fields,e.PAYFAST_PASSPHRASE)};
}
export function parseNotification(raw){const pairs=new URLSearchParams(raw),fields={};for(const [k,v] of pairs){if(Object.hasOwn(fields,k)||!/^[a-z0-9_]+$/.test(k))throw new Error('Invalid notification fields.');fields[k]=v;}return fields;}
export async function verifyNotification(e,fields,order,fetcher=fetch){
 if(!payfastReady(e)||order.provider_mode!==e.PAYFAST_MODE||fields.merchant_id!==e.PAYFAST_MERCHANT_ID||fields.m_payment_id!==order.id||!/^\d{1,30}$/.test(fields.pf_payment_id||''))throw new Error('Payment identity does not match.');
 const expected=signature(fields,e.PAYFAST_PASSPHRASE,true);if(!/^[a-f0-9]{32}$/i.test(fields.signature||'')||!timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(fields.signature,'hex')))throw new Error('Invalid payment signature.');
 if(cents(fields.amount_gross)!==order.amount_cents)throw new Error('Payment amount does not match.');
 const response=await fetcher(paymentBase(e.PAYFAST_MODE)+'/eng/query/validate',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:notificationString(fields),redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok||(await response.text()).trim()!=='VALID')throw new Error('Payment verification unavailable or invalid.');
 return {complete:fields.payment_status==='COMPLETE',transactionId:fields.pf_payment_id};
}

// Payfast's published ITN ranges, checked 6 November 2026. Fail closed.
export function payfastIP(ip){if(typeof ip!=='string'||!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip))return false;const a=ip.split('.').map(Number);if(a.some(n=>n>255))return false;const n=a.reduce((v,x)=>(v*256+x)>>>0,0);return [['197.97.145.144',28],['41.74.179.192',27],['102.216.36.0',28],['102.216.36.128',28],['144.126.193.139',32]].some(([base,bits])=>{const b=base.split('.').map(Number).reduce((v,x)=>(v*256+x)>>>0,0),mask=(0xffffffff<<(32-bits))>>>0;return (n&mask)===(b&mask);});}
