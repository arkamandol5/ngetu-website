import {guid} from './commerce-domain.mjs';
import {cleanText, escapeHTML as e, safeAsset} from './domain.mjs';
export const categories=['Spray guns','Painter protection','Spares & accessories'];
export const availability=['Confirm availability','Available to order','Out of stock'];
export function validateCatalogue(input){
 if(!Array.isArray(input)||input.length>100)throw new Error('Use up to 100 catalogue items.');
 const ids=new Set();
 return input.map(p=>{
  if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('Invalid catalogue item.');
  if(typeof p.id!=='string'||!/^sagola-[a-z0-9-]{1,65}$/.test(p.id)||ids.has(p.id))throw new Error('Use a unique sagola- URL identifier for every item.');ids.add(p.id);
  const out={id:p.id,name:cleanText(p.name,150),sku:cleanText(p.sku,80),category:cleanText(p.category,80),description:cleanText(p.description,1500),specification:cleanText(p.specification,2000),image:safeAsset(p.image),imageAlt:cleanText(p.imageAlt,250),priceCents:p.priceCents===null||p.priceCents===''||p.priceCents===undefined?null:p.priceCents,tax:cleanText(p.tax,30),availability:cleanText(p.availability,80),published:p.published===true,kind:p.kind==='product'?'product':'range',source:''};
  if(!out.name||!out.description||!categories.includes(out.category)||!availability.includes(out.availability))throw new Error('Name, description, category and availability are required.');
  if(out.image&&!out.imageAlt)throw new Error('Describe the approved product image.');
  if(out.priceCents!==null&&(!Number.isSafeInteger(out.priceCents)||out.priceCents<=0||out.priceCents>100000000||!['incl','excl'].includes(out.tax)||!out.sku||out.kind!=='product'))throw new Error('A price requires an exact product, SKU, VAT basis and a positive integer amount in cents.');
  if(out.kind==='range'&&(out.priceCents!==null||out.availability!=='Confirm availability'))throw new Error('A range cannot claim a price or stock availability.');
  if(p.source){let u;try{u=new URL(p.source);}catch{throw new Error('Use an official Sagola product URL.');}if(u.protocol!=='https:'||u.hostname!=='sagola.com'||u.username||u.password)throw new Error('Use an official Sagola product URL.');out.source=u.href;}
  if(p.buyEnabled!==undefined||p.bcItemId!==undefined||p.onlineAllocation!==undefined){out.buyEnabled=p.buyEnabled===true;out.bcItemId=cleanText(p.bcItemId,36);out.onlineAllocation=Number(p.onlineAllocation)||0;if(out.bcItemId&&!guid.test(out.bcItemId))throw new Error('Use a valid Business Central item GUID.');if(!Number.isSafeInteger(out.onlineAllocation)||out.onlineAllocation<0||out.onlineAllocation>1000000)throw new Error('Use a whole number for the online stock allocation.');if(out.buyEnabled&&(out.kind!=='product'||out.priceCents===null||out.tax!=='incl'||!out.bcItemId||!out.sku||out.availability!=='Available to order'))throw new Error('Online purchase requires an exact priced SKU, inclusive VAT, BC item ID and availability.');}
  return out;
 });
}
export function quoteSnapshot(items,products){
 if(!Array.isArray(items)||items.length>30)throw new Error('Use up to 30 quote items.');
 const seen=new Set();return items.map(line=>{
  if(!line||typeof line.id!=='string'||seen.has(line.id)||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>99)throw new Error('Use unique items and quantities from 1 to 99.');seen.add(line.id);
  const p=products.find(p=>p.id===line.id&&p.published);if(!p)throw new Error('An item is no longer available in the catalogue. Refresh your basket.');
  return {id:p.id,name:p.name,sku:p.sku,kind:p.kind,quantity:line.quantity,configuration:cleanText(line.configuration,300),unitPriceCents:p.priceCents,tax:p.tax,currency:'ZAR',availability:p.availability,lineTotalCents:p.priceCents===null?null:p.priceCents*line.quantity};
 });
}
export const money=c=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(c/100);
const price=p=>p.priceCents===null?'Price on request':money(p.priceCents)+' '+(p.tax==='incl'?'incl. VAT':'excl. VAT');
// Contextual range illustrations are used only for the original enquiry ranges.
// Exact SKU listings use the product photograph selected by the catalogue editor.
const rangeIllustrations = {
  'sagola-4600-hex': ['hex-atomisation', 'Conceptual illustration of a widening spray pattern', 'Spray pattern illustration'],
  'sagola-3600-xpt': ['refinishing', 'A painter applies coating to a green car panel', 'Application illustration'],
  'sagola-3300-gto': ['workshop', 'An illustrative automotive refinishing workshop', 'Workshop illustration'],
  'sagola-painter-protection': ['protection', 'Illustrative protective hood, gloves and coveralls', 'Equipment category illustration'],
  'sagola-spares-accessories': ['accessories', 'Mixing cups and paint filters on a workbench', 'Accessories illustration'],
};
function art(product) {
  if (product.image) {
    return `<img src="${e(product.image)}" alt="${e(product.imageAlt)}" width="600" height="450" loading="lazy">`;
  }
  const illustration = product.kind === 'range' && rangeIllustrations[product.id];
  if (illustration) {
    const [key, alt, caption] = illustration;
    const root = '/assets/editorial/' + key;
    const responsive = !['workshop', 'hex-atomisation'].includes(key);
    const src = responsive ? root + '-600.webp' : key === 'workshop' ? '/assets/workshop.webp' : root + '.webp';
    const sizes = responsive ? ` srcset="${root}-600.webp 600w, ${root}-1200.webp 1200w" sizes="(max-width: 760px) 92vw, 42vw"` : '';
    return `<figure class="range-photo"><img src="${src}"${sizes} alt="${alt}" width="600" height="450" loading="lazy"><figcaption>${caption}</figcaption></figure>`;
  }
  return `<div class="range-art"><span>SAGOLA</span><strong>${e(product.name.replace(/^Sagola /, ''))}</strong></div>`;
}
const hexFigure = '<figure class="hex-explainer"><img src="/assets/editorial/hex-fan.webp" alt="Conceptual diagram showing spray widening from a nozzle" loading="lazy" width="912" height="200"><figcaption>HEX spray fan concept from the NGETU Sagola guide. Actual spray patterns depend on configuration and setup.</figcaption></figure>';
export function catalogueHTML(products,selected){
 const link='/sagola-shop/';
 if(selected){const p=selected;return '<div class="shop-detail"><a class="text-link" href="'+link+'">← All Sagola equipment</a><div class="product-detail-grid"><div class="product-art">'+art(p)+'</div><div><span class="eyebrow">'+e(p.category)+'</span><h1>'+e(p.name)+'</h1><p>'+e(p.description)+'</p><p class="product-price">'+e(price(p))+'</p><p>'+e(p.availability)+(p.kind==='range'?' · Range enquiry, exact model configuration to confirm':'')+'</p>'+(p.sku?'<p>SKU: '+e(p.sku)+'</p>':'')+'<label>Quantity<input id="detail-quantity" required type="number" min="1" max="99" value="1"></label><button class="btn" data-add-product="'+e(p.id)+'">Add to basket →</button><p class="caption">Buy approved products online, or request a bespoke quote for your setup. Payment availability is shown in your basket.</p></div></div><div class="product-spec"><h2>Choose the right configuration.</h2><p>'+e(p.specification)+'</p>'+(p.id==='sagola-4600-hex'&&p.kind==='range'?hexFigure:'')+(p.source?'<a class="text-link" href="'+e(p.source)+'" target="_blank" rel="noopener noreferrer">Manufacturer information ↗</a>':'')+'</div></div>';}
 return '<div class="shop-toolbar"><label>Search the range<input id="shop-search" type="search" placeholder="Product, model or SKU…"></label><label>Category<select id="shop-category"><option value="">All categories</option>'+categories.map(c=>'<option>'+e(c)+'</option>').join('')+'</select></label><label>Sort by<select id="shop-sort"><option value="name">Name A–Z</option><option value="price">Price: low to high</option></select></label></div><p id="catalogue-count" role="status">'+products.length+' items / ranges</p><div class="shop-grid">'+products.map(p=>'<article class="shop-card" data-product="'+e(p.id)+'" data-category="'+e(p.category)+'" data-search="'+e((p.name+' '+p.sku+' '+p.description).toLowerCase())+'" data-price="'+(p.priceCents??Number.MAX_SAFE_INTEGER)+'"><a href="'+link+e(p.id)+'/" class="product-art" aria-label="View '+e(p.name)+'">'+art(p)+'</a><div class="shop-card-copy"><span class="eyebrow">'+e(p.category)+'</span><h2><a href="'+link+e(p.id)+'/">'+e(p.name)+'</a></h2><p>'+e(p.description)+'</p><p class="product-price">'+e(price(p))+'</p><small>'+e(p.availability)+'</small><button class="btn" data-add-product="'+e(p.id)+'">Add to basket +</button></div></article>').join('')+'</div><p id="shop-empty" hidden>No matching items. Tell us what you need below and NGETU will help identify it.</p>';
}

export function renderShopPage(template, products, selected) {
  const output = template.replace('<!--shop:catalogue-->', catalogueHTML(products, selected));
  if (!selected) return output;
  return output
    .replace(/<div class="shop-section-heading"><div>[\s\S]*?<\/div>/, '<div class="shop-section-heading">')
    .replace(/<p class="shop-intro">[\s\S]*?<\/p>/, '')
    .replace(/<section class="shop-hero">[\s\S]*?<\/section>/, '')
    .replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + e(selected.name) + ' | NGETU Sagola shop</title>')
    .replace(/<meta name="description" content="[^"]*">/, () => '<meta name="description" content="' + e(selected.description) + '">');
}
