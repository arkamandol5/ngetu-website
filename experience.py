from html import escape as e
from urllib.parse import quote
import json
PATHS={
 'training':'M2 8l10-5 10 5-10 5zM6 11v6c4 3 8 3 12 0v-6M22 8v8',
 'service':'M14 6a5 5 0 0 0-6 6L3 17a3 3 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-4 3-3-3z',
 'refinish':'M7 3h8v6H7zM6 9h10v5H6zM10 14v7h4v-7M16 10h5M3 11h3M19 6l2-1M19 15l2 1',
 'connect':'M5 3h10l4 4v14H5zM14 3v5h5M8 14l3 3 5-6',
 'data':'M4 20V9M10 20V4M16 20v-7M22 20H2',
 'finance':'M5 3h14v18l-3-2-4 2-4-2-3 2zM8 8h8M8 12h5',
 'digital':'M3 4h18v13H3zM7 21h10M12 17v4M6 8h4M6 11h8',
 'cloud':'M7 19h11a4 4 0 0 0 0-8 6 6 0 0 0-11-3 5 5 0 0 0 0 11',
 'security':'M12 3l9 4v5c0 5-9 9-9 9s-9-4-9-9V7zM8 12l3 3 5-6',
 'robot':'M5 21h14M12 21v-5l6-5-7-7-6 5 7 7M18 11l3-3M3 7l4 4',
 'operate':'M3 3h18v18H3zM3 9h18M9 9v12M13 13h5M13 17h3',
 'arrow':'M4 12h16M14 6l6 6-6 6'}
def svg(kind):return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+PATHS.get(kind,PATHS['operate'])+'"/></svg>'
SERVICE_ICONS={'training':'training','servicing':'service','refinish':'refinish','manufacturer-connectivity':'connect','business-intelligence':'data','yooz':'finance','digital':'digital','microsoft':'cloud','cloud':'cloud','cybersecurity':'security','sagola':'refinish'}
BRANDS={'autosoft':'AutoSoft','sagola':'Sagola','yooz':'Yooz','microsoft':'Microsoft 365','manufacturer-connectivity':'AutoMX'}
INTERESTS={'sagola-spray-guns':'Sagola equipment','sagola-painter-protection':'Sagola equipment','sagola-vr-training':'Training & development','autosoft':'AutoSoft','manufacturer-connectivity':'Manufacturer connectivity','refinish':'Paint & refinish','sagola':'Sagola equipment','training':'Training & development','servicing':'Equipment servicing','microsoft':'Microsoft 365 & managed IT','cloud':'Cloud infrastructure','cybersecurity':'Cybersecurity','business-intelligence':'Business intelligence','yooz':'Yooz finance automation','digital':'Websites, design & video'}
def review(label='Book a free review',interest='',cls='btn',action='review'):
    value=INTERESTS.get(interest,interest)
    if value not in list(INTERESTS.values())+['Whole-business review']:value='Whole-business review'
    return f'<a class="{cls}" data-conversion="{action}" href="/review/?interest={quote(value)}&amp;action={quote(action)}">{e(label)} {svg("arrow")}</a>'
def brandmark(slug):
    if slug in BRANDS:return '<span class="brand-label" data-brand="'+slug+'">'+e(BRANDS[slug])+'</span>'
    return '<span class="card-icon">'+svg(SERVICE_ICONS.get(slug,'operate'))+'</span>'
def cards(slugs,pages):
    return '<div class="solution-grid">'+''.join('<a class="solution-card" href="/'+s+'/">'+brandmark(s)+'<span class="eyebrow">'+e(pages[s]['eyebrow'].split('/')[0])+'</span><h3>'+e(pages[s]['title'])+'</h3><p>'+e(pages[s]['description'])+'</p><span class="card-end">Explore '+svg('arrow')+'</span></a>' for s in slugs)+'</div>'
def screen_art(kind='autosoft'):
    if kind=='autosoft':
        return '<div class="visual-frame software-visual"><div class="visual-top"><span>WORKSHOP / WORKFLOW</span><span class="status-dot"></span></div><div class="screen-head"><b>A clearer view of the job.</b><small>Illustrative workflow · not an AutoSoft screen</small></div><div class="kanban">'+''.join('<div><span>'+name+'</span>'+''.join('<i><b>'+job+'</b><small>'+desc+'</small></i>' for job,desc in items)+'</div>' for name,items in [('INTAKE',[('Scope','Understand the repair'),('Estimate','Agree the work')]),('WORKSHOP',[('Plan','People, tasks, parts'),('Repair','Progress & updates')]),('COMPLETE',[('Quality','Record the checks'),('Insight','Learn from the job')])])+'</div><div class="visual-bottom">PEOPLE <span>→</span> PROCESS <span>→</span> VISIBILITY</div></div>'
    if kind=='tech':
        return '<div class="visual-frame tech-visual"><div class="visual-top"><span>THE BUSINESS BEHIND THE BUSINESS</span><span>CONNECTED THINKING</span></div><div class="tech-centre">Your<br><em>operation.</em></div><div class="tech-grid">'+''.join('<span>'+svg(k)+'<b>'+t+'</b></span>' for k,t in [('cloud','People & IT'),('security','Security'),('finance','Finance'),('data','Intelligence')])+'</div><p class="art-caption">A service map · connections are scoped for your project</p></div>'
    if kind=='people':
        return '<div class="visual-frame story-visual"><div class="visual-top"><span>JOHANNESBURG / SOUTH AFRICA</span><span>26.20° S</span></div><div class="story-lines" aria-hidden="true"><span>SOWETO</span><i></i><span>JOHANNESBURG</span><i></i><span>YOUR OPERATION</span></div><blockquote>“Customer trust.”<cite>Kenneth’s non-negotiable value</cite></blockquote><a href="/kenneth/" class="text-link">Meet Kenneth '+svg('arrow')+'</a><p class="art-caption">Soweto roots · a Johannesburg starting point</p></div>'
    if kind=='tech':
        return '<div class="visual-frame tech-visual"><div class="visual-top"><span>THE BUSINESS BEHIND THE BUSINESS</span><span>CONNECTED THINKING</span></div><div class="tech-centre">Your<br><em>operation.</em></div><div class="tech-grid">'+''.join('<span>'+svg(k)+'<b>'+t+'</b></span>' for k,t in [('cloud','People & IT'),('security','Security'),('finance','Finance'),('data','Intelligence')])+'</div><p class="art-caption">A service map · connections are scoped for your project</p></div>'
    return ''
EDITORIAL = {
    'training': ('Two trainees inspect a finished vehicle panel', 'Workshop training'),
    'johannesburg': ('Illustrated view of the Johannesburg skyline', 'Johannesburg'),
    'refinishing': ('A painter applies a fine spray to a green vehicle panel', 'Automotive refinishing'),
    'protection': ('Coveralls, gloves and a protective hood on a workbench', 'Painter protection equipment'),
    'accessories': ('Mixing cups, filters and masking tape on a paint preparation bench', 'Paint preparation accessories'),
    'operations': ('Two colleagues review a scheduling display overlooking a repair bay', 'Workshop planning'),
}

def editorial_photo(key):
    alt, caption = EDITORIAL[key]
    base = '/assets/editorial/' + key
    return (f'<figure class="editorial-photo"><img src="{base}-1200.webp" '
            f'srcset="{base}-600.webp 600w, {base}-1200.webp 1200w" '
            f'sizes="(max-width:760px) 94vw, 46vw" width="1200" height="800" alt="{e(alt)}">'
            f'<figcaption>{e(caption)} · Illustration</figcaption></figure>')

def hero_visual(slug):
    photos = {'sagola': 'refinishing', 'sagola-spray-guns': 'refinishing',
              'sagola-painter-protection': 'protection', 'refinish': 'accessories',
              'business-technology': 'operations', 'autosoft': 'operations'}
    if slug in photos:
        return editorial_photo(photos[slug])
    if slug.startswith('sagola'):return '<div class="visual-frame equipment-visual"><div class="visual-top"><span>SAGOLA / THE PAINTSHOP</span><span>SELECT · SPECIFY · SUPPORT</span></div><h3>Precision.<br>Protection.<br>Progression.</h3><p>Equipment, people and process.<br>One practical conversation.</p><div class="process-chips"><span>4600 HEX</span><span>3600 XPT</span><span>Painter PPE</span><span>VR training</span></div><p class="art-caption">Explore the range · confirm your configuration</p></div>'
    if slug in ('automotive','bodyshops','dealerships','refinish','training','servicing','sagola'):
        return '<figure class="workshop-visual"><img src="/assets/workshop.webp" width="1672" height="941" alt="Illustrative workshop concept, not a NGETU customer installation"><div><span class="eyebrow">THE CONNECTED REPAIR</span><strong>People.<br>Process.<br>Performance.</strong></div><figcaption>Illustrative workshop concept</figcaption></figure>'
    if slug in ('about','kenneth'):return screen_art('people')
    if slug=='autosoft':return screen_art('autosoft')
    if slug=='commercial-fleet':
        return '<div class="visual-frame fleet-visual"><div class="visual-top"><span>BUILT FOR BIG JOBS</span><span>COMMERCIAL / FLEET</span></div><svg viewBox="0 0 560 240" role="img" aria-label="Conceptual commercial truck and van outlines"><g fill="none" stroke="#8cc6ac" stroke-width="3"><path d="M40 150V50h285v110H40zM325 89h91l55 57v14H325M343 105h63l32 34h-95z"/><circle cx="99" cy="166" r="25"/><circle cx="278" cy="166" r="25"/><circle cx="421" cy="166" r="25"/><path d="M22 198h500"/></g></svg><h3>Scale needs a plan.</h3><p>Vehicles, booth, materials and workflow.</p><small>Concept illustration · actual suitability requires assessment</small></div>'
    return screen_art('tech')
def hero(slug,p):
    dark=slug in ('about','kenneth','business-technology','commercial-fleet')
    h=e(p['headline'])
    for a,b in [('From first estimate. To final finish.','From first estimate.<br>To final finish.'),('Built in South Africa. Built around people.','Built in South Africa.<br>Built around people.')]:h=h.replace(a,b)
    action='demo' if slug in ('autosoft','yooz','sagola','sagola-spray-guns','sagola-vr-training') else 'review'
    label='Book a demonstration' if action=='demo' else 'Request a site assessment' if action=='assessment' else 'Request a security review' if slug=='cybersecurity' else 'Start a conversation'
    visual=hero_visual(slug) if p['kind'] not in ('legal','insight') and slug not in ('privacy','cookies','terms','security-terms','accessibility','insights') else ''
    return '<section class="page-hero hero-v2 '+('dark-page' if dark else '')+'"><div class="wrap"><div class="breadcrumb"><a href="/">Home</a><span>/</span>'+e(p['title'])+'</div><div class="page-heading '+('text-only' if not visual else '')+'"><div class="hero-copy"><span class="eyebrow">'+e(p['eyebrow'])+'</span><h1><!--cms:headline-->'+h+'<!--/cms:headline--></h1><p><!--cms:description-->'+e(p['description'])+'<!--/cms:description--></p><div class="actions">'+review(label,slug,action=action)+'</div></div><div class="hero-media"><!--cms:media-->'+visual+'<!--/cms:media--></div></div></div></section>'
ZONES=[('Reception','Customer intake and visibility','AutoSoft','autosoft'),('Office','Email, collaboration and managed IT','Microsoft 365','microsoft'),('Accounts','Invoice capture, approvals and finance','Yooz','yooz'),('Workshop','Jobs, technicians, loading and tasks','AutoSoft','autosoft'),('OEM processes','Authorised programme evidence and connectivity','AutoSoft / AutoMX','manufacturer-connectivity'),('Paint mixing','Suitable refinish systems and materials','Paint preparation','refinish'),('Painter','Manual application and process discipline','Sagola','sagola'),('Paint booth','Manual application setup','Sagola','sagola'),('Training','People, equipment and process development','NGETU Technical','training'),('Management','Profitability and useful reporting','AutoSoft / NGETU BI','business-intelligence'),('Digital presence','Website, brand and commercial content','NGETU Digital','digital')]
def bodyshop():
    return '<section class="section workshop-map"><div class="wrap"><div class="section-head"><div><span class="eyebrow">Explore your operation</span><h2>Every area has<br>a part to play.</h2></div><p>Select a zone to see the need and the expertise around it. This is a process map, not a floor plan.</p></div><div class="zone-layout"><div class="zone-grid" role="group" aria-label="Bodyshop zones">'+''.join('<button type="button" class="zone" data-zone="'+str(i)+'" aria-pressed="'+str(i==0).lower()+'" aria-controls="zone-panel"><span>'+str(i+1).zfill(2)+'</span>'+svg(SERVICE_ICONS.get(s,'operate'))+'<b>'+e(a)+'</b></button>' for i,(a,b,c,s) in enumerate(ZONES))+'</div><div id="zone-panel" class="zone-panel" aria-live="polite"><span class="eyebrow">01 / Reception</span><h3>Customer intake and visibility</h3><p>AutoSoft</p><a class="text-link" href="/autosoft/">Explore the solution '+svg('arrow')+'</a></div></div><details class="text-map"><summary>Read all eleven areas and solutions</summary><dl>'+''.join('<dt>'+e(a)+'</dt><dd>'+e(b)+' — <a href="/'+s+'/">'+e(c)+'</a></dd>' for a,b,c,s in ZONES)+'</dl></details></div></section>'
def dashboard():
    return '<section class="section dashboard-section"><div class="wrap"><div class="section-head"><div><span class="eyebrow">Illustrative demonstration data</span><h2>From information<br>to a better question.</h2></div><p>This example uses fictional data. It is not a customer result or a live product integration.</p></div><div class="dashboard"><div class="dash-header"><b>Operation overview</b><label>View <select id="dashboard-period"><option value="month">Example month</option><option value="quarter">Example quarter</option></select></label></div><div class="metrics"><div><small>Completed jobs</small><strong data-metric="jobs">84</strong></div><div><small>On-time completion</small><strong data-metric="ontime">86%</strong></div><div><small>Rework rate</small><strong data-metric="rework">4.8%</strong></div></div><div class="dash-chart"><div><h3>Where work is waiting</h3><p>Fictional job counts by handover</p></div><div class="bar-chart">'+''.join('<div><span>'+n+'</span><i style="--bar:'+str(v*8)+'%"></i><b data-bar="'+str(i)+'">'+str(v)+'</b></div>' for i,(n,v) in enumerate([('Parts',8),('Approval',5),('Preparation',3),('Quality',2)]))+'</div></div><p class="dash-insight" id="dash-insight">The first question: what is holding up the eight jobs waiting for parts?</p></div><div class="data-flow"><span>Authorised sources</span><b>→</b><span>Shared definitions</span><b>→</b><span>Useful measures</span><b>→</b><span>A decision</span></div></div></section>'
def insights(pages):
    cats=['All','Automotive','Paint','Equipment','Technology','Cybersecurity','Data','Finance','Business']
    entries=[(s,p) for s,p in pages.items() if p['kind']=='insight']
    return '<section class="section"><div class="wrap"><div class="filter-row" role="group" aria-label="Filter insights">'+''.join('<button type="button" data-category="'+c+'" aria-pressed="'+str(c=='All').lower()+'">'+c+'</button>' for c in cats)+'</div><p id="insight-count" role="status">'+str(len(entries))+' guides</p><div class="insight-grid">'+''.join('<a class="insight-card" data-insight-category="'+e(p['eyebrow'].split('/')[-1].strip())+'" href="/'+s+'/"><span class="eyebrow">'+e(p['eyebrow'])+'</span><h3>'+e(p['title'])+'</h3><p>'+e(p['description'])+'</p><span class="text-link">Read the guide '+svg('arrow')+'</span></a>' for s,p in entries)+'</div></div></section>'
def journey():
    stages=[('Intake','Start with the customer and vehicle.','autosoft'),('Estimate','Define the work and its commercial basis.','autosoft'),('Manufacturer processes','Organise the relevant programme evidence.','manufacturer-connectivity'),('Workshop','Coordinate people, tasks and loading.','autosoft'),('Parts','Align availability, cost and job requirements.','autosoft'),('Refinish','Choose suitable materials and process support.','refinish'),('Manual application','Match equipment, settings and skill.','sagola'),('Quality','Check, record and learn from the finish.','training'),('Invoice & finance','Bring the financial workflow into view.','yooz'),('Management','Use the job to inform the next decision.','business-intelligence')]
    return '<section class="section repair-journey"><div class="wrap"><div class="section-head"><div><span class="eyebrow">The complete repair journey</span><h2>Follow a repair.</h2></div><p>Follow the job through the operation. Explore the systems and expertise that can support each stage.</p></div><ol class="journey-grid">'+''.join('<li><a href="/'+slug+'/"><span>'+str(i+1).zfill(2)+'</span><h3>'+e(title)+'</h3><p>'+e(desc)+'</p>'+svg('arrow')+'</a></li>' for i,(title,desc,slug) in enumerate(stages))+'</ol></div></section>'
def partner_grid():
    brands=[('autosoft','AutoSoft','Automotive workflow','autosoft'),('sagola','Sagola','Application equipment','sagola'),('yooz','Yooz','Invoice workflow','yooz'),('microsoft','Microsoft','Managed technology','microsoft'),('manufacturer-connectivity','AutoMX','Manufacturer processes','manufacturer-connectivity')]
    return '<section class="section"><div class="wrap"><div class="section-head"><div><span class="eyebrow">The proposed portfolio</span><h2>Expertise around<br>the whole operation.</h2></div><p>Relationship terms and approved artwork are being confirmed. Names identify the proposed portfolio; they do not imply an unconfirmed appointment.</p></div><div class="partner-grid">'+''.join('<a href="/'+slug+'/"><span class="brand-label" data-brand="'+key+'">'+e(name)+'</span><p>'+e(desc)+'</p></a>' for key,name,desc,slug in brands)+'</div></div></section>'
def extras(slug,pages):
    if slug.startswith('sagola'):
        sources=[('4600 HEX manufacturer details','https://sagola.com/en/products/bodyshop/automotive-refinishing/sprayguns/sagola-4600-hex'),('3600 XPT manufacturer details','https://sagola.com/en/products/bodyshop/automotive-refinishing/sprayguns/sagola-3600-xpt'),('SagolaSPRAY platform','https://sagolaspray.com/')] if slug!='sagola-painter-protection' else [('4240 manufacturer manual','https://sagola.com/uploads/manuales/careta-4240-manual.pdf'),('HSE isocyanate guidance','https://www.hse.gov.uk/mvr/bodyshop/respiratory-protective-equipment.htm')]
        return '<section class="section"><div class="wrap"><a class="btn" href="/sagola-shop/">Shop Sagola & request a quote →</a><span class="eyebrow">Explore the Sagola ecosystem</span><h2>Find your next step.</h2>'+cards([s for s in ['sagola-spray-guns','sagola-painter-protection','sagola-vr-training'] if s!=slug],pages)+'<div class="brand-source-links">'+''.join('<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+' ↗</a>' for t,u in sources)+'</div></div></section>'
    if slug=='automotive':return journey()
    if slug=='partners':return partner_grid()
    if slug=='bodyshops':return bodyshop()
    if slug=='business-intelligence':return dashboard()
    if slug=='insights':return insights(pages)
    if slug=='digital':return '<section class="section"><div class="wrap"><div class="section-head"><div><span class="eyebrow">Design exploration / not a client case study</span><h2>Make the next step obvious.</h2></div><p>A simple example of how hierarchy and a useful action can improve a page’s clarity.</p></div><div class="concept-pair"><div class="before-concept"><small>BEFORE / CONCEPT</small><h3>Everything at once.</h3><div></div><div></div><div></div><p>Competing messages. No clear next step.</p></div><div class="after-concept"><small>AFTER / CONCEPT</small><h3>One useful promise.<br>One clear next step.</h3><p>A focused offer, a relevant visual and an action your customer understands.</p><a href="/review/?interest=Websites%2C%20design%20%26%20video">Discuss your website →</a></div></div></div></section>'
    return ''
