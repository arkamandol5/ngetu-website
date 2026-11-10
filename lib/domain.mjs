export const interests=['Whole-business review','AutoSoft','Manufacturer connectivity','Paint & refinish','Sagola equipment','Training & development','Equipment servicing','Microsoft 365 & managed IT','Cloud infrastructure','Cybersecurity','Business intelligence','Yooz finance automation','Websites, design & video'];
export function cleanText(value,max=200){return typeof value==='string'?value.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').slice(0,max):'';}
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validPhone(s){return /^[+\d\s().-]+$/.test(s)&&s.replace(/\D/g,'').length>=7&&s.replace(/\D/g,'').length<=15;}
export function validateEnquiry(input){
 const errors={};
 /** @type {Record<string, any>} */
 const out={};for(const [k,n] of Object.entries({name:100,company:150,email:254,phone:35,province:80,industry:100,interest:100,contactMethod:20,goal:2000,environment:200,authorisationContact:150,testType:100,timing:100,accountingSystem:200,sourcePage:200,action:30,deviceClass:20,requestId:60}))out[k]=cleanText(input[k],n);
 for(const k of ['name','company','email','province','industry','goal'])if(!out[k])errors[k]='This field is required.';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))errors.email='Enter a valid email address.';
 if(!['Email','Phone','WhatsApp'].includes(out.contactMethod))errors.contactMethod='Choose a contact method.';
 if((out.phone&&!validPhone(out.phone))||(out.contactMethod!=='Email'&&!out.phone))errors.phone='Enter a phone number with 7–15 digits.';
 if(!interests.includes(out.interest))errors.interest='Choose a supported area of interest.';
 if(!['review','demo','assessment','quote'].includes(out.action))errors.action='Choose a supported enquiry action.';
 if(!/^[0-9a-f-]{36}$/i.test(out.requestId))errors.requestId='Reload the form and try again.';
 if(out.action==='quote'&&out.interest!=='Sagola equipment')errors.interest='Choose Sagola equipment for a shop quote.';
 if(!input.privacyAcknowledged)errors.privacyAcknowledged='Please acknowledge the privacy notice.';
 if(out.interest==='Cybersecurity'){for(const k of ['environment','authorisationContact'])if(!out[k])errors[k]='This field is required.';if(!input.scopeAcknowledged)errors.scopeAcknowledged='Please acknowledge the testing scope notice.';}
 else for(const k of ['environment','authorisationContact','testType','timing'])delete out[k];
 if(out.interest!=='Yooz finance automation')delete out.accountingSystem;
 if(input.website)errors.website='Unable to accept this enquiry.';
 out.sourcePage=/^\/[a-z0-9/-]*$/i.test(out.sourcePage)?out.sourcePage:'/review/';out.deviceClass=['mobile','desktop'].includes(out.deviceClass)?out.deviceClass:'unknown';
 out.campaign={};for(const k of ['utm_source','utm_medium','utm_campaign']){const v=cleanText(input.campaign?.[k],150);if(v)out.campaign[k]=v;}
 out.privacyAcknowledged=true;out.scopeAcknowledged=out.interest==='Cybersecurity';return {data:out,errors};
}
export function safeAsset(value){return typeof value==='string'&&/^\/media\/[a-zA-Z0-9-]+\.(png|jpg|webp|svg)$/.test(value)?value:'';}
export function validateDocument(input){
 const doc={title:cleanText(input.title,150),headline:cleanText(input.headline,250),description:cleanText(input.description,500),eyebrow:cleanText(input.eyebrow,120),blocks:[],media:safeAsset(input.media),mediaAlt:cleanText(input.mediaAlt,300),mediaCaption:cleanText(input.mediaCaption,300)};
 if(!doc.title||!doc.headline||!doc.description)throw new Error('Title, headline and description are required.');
 if(doc.media&&!doc.mediaAlt)throw new Error('An approved image needs descriptive alternative text.');
 if(!Array.isArray(input.blocks)||input.blocks.length>20)throw new Error('Use no more than 20 content sections.');
 for(const b of input.blocks){if(!Array.isArray(b)||b.length!==3||!Array.isArray(b[2]))throw new Error('A section requires a heading, introduction and bullet list.');doc.blocks.push([cleanText(b[0],180),cleanText(b[1],3000),b[2].slice(0,30).map(x=>cleanText(x,1000))]);}
 return doc;
}
export function renderDocument(html,doc){
 const replace=(key,value)=>{const a='<!--cms:'+key+'-->',b='<!--/cms:'+key+'-->';const start=html.indexOf(a),end=html.indexOf(b);if(start>=0&&end>start)html=html.slice(0,start+a.length)+value+html.slice(end);};
 replace('headline','<span class="cms-lines">'+escapeHTML(doc.headline)+'</span>');replace('description',escapeHTML(doc.description));
 replace('blocks',doc.blocks.map(([title,description,items],i)=>'<article id="detail-'+i+'"><span class="section-index">'+String(i+1).padStart(2,'0')+'</span><h2>'+escapeHTML(title)+'</h2><p>'+escapeHTML(description)+'</p><ul class="check-list">'+items.map(x=>'<li><span>'+escapeHTML(x)+'</span></li>').join('')+'</ul></article>').join(''));
 if(doc.media)replace('home-image','<img class="hero-image" src="'+safeAsset(doc.media)+'" alt="'+escapeHTML(doc.mediaAlt)+'" width="1672" height="941" fetchpriority="high">');
 if(doc.media)replace('media','<figure class="approved-hero"><img src="'+safeAsset(doc.media)+'" alt="'+escapeHTML(doc.mediaAlt)+'" width="1200" height="900"><figcaption>'+escapeHTML(doc.mediaCaption)+'</figcaption></figure>');
 html=html.replace(/<title>[\s\S]*?<\/title>/,()=>'<title>'+escapeHTML(doc.title)+' | NGETU</title>').replace(/<meta name="description" content="[^"]*">/,()=>'<meta name="description" content="'+escapeHTML(doc.description)+'">');
 html=html.replace(/(<div class="hero-copy"><span class="eyebrow">)[\s\S]*?<\/span>/,(_,start)=>start+escapeHTML(doc.eyebrow)+'</span>');
 // Rebuild the table of contents when editors add or remove content blocks.
 html=html.replace(/(<aside><span class="eyebrow">In this section<\/span>)[\s\S]*?(<a class="text-link")/,'$1'+doc.blocks.map((b,i)=>'<a href="#detail-'+i+'">'+escapeHTML(b[0])+'</a>').join('')+'$2');return html;
}
export function dataversePayload(data,id,fieldMap={}){
 const parts=data.name.split(/\s+/);const body={leadid:id,subject:('NGETU '+data.action+' — '+data.interest).slice(0,200),firstname:parts.length>1?parts.slice(0,-1).join(' '):'',lastname:parts.at(-1),companyname:data.company,emailaddress1:data.email,telephone1:data.phone,address1_stateorprovince:data.province,description:JSON.stringify(data,null,2)};
 const values={industry:data.industry,interest:data.interest,goal:data.goal,contactMethod:data.contactMethod,sourcePage:data.sourcePage,utm_source:data.campaign.utm_source||'',utm_medium:data.campaign.utm_medium||'',utm_campaign:data.campaign.utm_campaign||'',action:data.action,deviceClass:data.deviceClass};
 for(const [source,target] of Object.entries(fieldMap))if(source in values&&/^[a-z][a-z0-9_]{1,80}$/.test(target))body[target]=values[source];return body;
}
