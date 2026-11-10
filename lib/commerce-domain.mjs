import {cleanText,validPhone} from './domain.mjs';
export const guid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const provinces=['Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape','Free State','Limpopo','Mpumalanga','North West','Northern Cape'];
export const commerceDefaults={enabled:false,termsApproved:false,connectionVerified:false,provider:'payfast',shippingCents:null,shippingProvinces:[],shippingDescription:'',termsVersion:'',allocationApproved:false};
export function validateCommerceSettings(input){
 const out={...commerceDefaults,enabled:input.enabled===true,termsApproved:input.termsApproved===true,connectionVerified:input.connectionVerified===true,allocationApproved:input.allocationApproved===true,provider:'payfast',shippingCents:input.shippingCents===null||input.shippingCents===''?null:Number(input.shippingCents),shippingProvinces:Array.isArray(input.shippingProvinces)?[...new Set(input.shippingProvinces.filter(p=>provinces.includes(p)))]:[],shippingDescription:cleanText(input.shippingDescription,400),termsVersion:cleanText(input.termsVersion,80)};
 if(out.shippingCents!==null&&(!Number.isSafeInteger(out.shippingCents)||out.shippingCents<0||out.shippingCents>1000000))throw new Error('Enter a valid delivery charge in cents.');
 return out;
}
export function checkoutSnapshot(input,products,settings){
 if(!input||typeof input!=='object')throw new Error('Invalid checkout request.');
 if(!guid.test(input.requestId)||typeof input.accessToken!=='string'||!/^[a-f0-9]{64}$/.test(input.accessToken))throw new Error('Reload checkout and try again.');
 if(input.privacyAcknowledged!==true||input.termsAccepted!==true||input.website)throw new Error('Accept the privacy notice and sales terms.');
 const buyer={};for(const [key,size] of Object.entries({name:100,company:100,email:100,phone:35,address:100,address2:100,city:50,province:50,postcode:10}))buyer[key]=cleanText(input[key],size);
 for(const key of ['name','email','phone','address','city','province','postcode'])if(!buyer[key])throw new Error('Complete all required contact and delivery fields.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email)||!validPhone(buyer.phone)||!/^\d{4}$/.test(buyer.postcode))throw new Error('Check your email, phone number and four-digit postal code.');
 if(!settings.shippingProvinces.includes(buyer.province)||settings.shippingCents===null)throw new Error('Please request a quote for delivery to this area.');
 if(!Array.isArray(input.items)||!input.items.length||input.items.length>30)throw new Error('Choose between 1 and 30 products.');
 const ids=new Set(),items=input.items.map(line=>{if(!line||ids.has(line.id)||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>99)throw new Error('Check product quantities.');ids.add(line.id);const p=products.find(p=>p.id===line.id&&p.published);
  if(!p||!p.buyEnabled||p.kind!=='product'||!p.sku||!Number.isSafeInteger(p.priceCents)||p.priceCents<1||p.tax!=='incl'||p.availability!=='Available to order'||!guid.test(p.bcItemId)||!Number.isInteger(p.onlineAllocation)||p.onlineAllocation<line.quantity)throw new Error('One or more items require a bespoke quote instead of online payment.');
  if(cleanText(line.configuration,300))throw new Error('For customised configurations, request a bespoke quote. Online checkout uses the exact listed SKU.');
  return {id:p.id,name:p.name,sku:p.sku,quantity:line.quantity,unitPriceCents:p.priceCents,totalCents:p.priceCents*line.quantity,bcItemId:p.bcItemId,onlineAllocation:p.onlineAllocation};
 });
 const subtotalCents=items.reduce((n,p)=>n+p.totalCents,0),totalCents=subtotalCents+settings.shippingCents;
 if(!Number.isSafeInteger(totalCents)||totalCents<500||totalCents>100000000)throw new Error('Request a quote for this order value.');
 return {buyer,items,subtotalCents,shippingCents:settings.shippingCents,totalCents,currency:'ZAR',tax:'inclusive',termsVersion:settings.termsVersion,shippingDescription:settings.shippingDescription};
}
export function cents(value){if(typeof value!=='string'||!/^\d{1,9}\.\d{2}$/.test(value))throw new Error('Invalid payment amount.');return Number(value.replace('.',''));}
