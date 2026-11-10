from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import json
root=Path(__file__).parent/'.generated/site'
class Check(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.ids=set();self.h1=0;self.meta=False
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='h1':self.h1+=1
  if 'id' in d:
   assert d['id'] not in self.ids, 'duplicate id '+d['id']
   self.ids.add(d['id'])
  if t=='meta' and d.get('name')=='robots':self.meta=d.get('content')=='noindex,nofollow'
  if t in ('a','link','img','script'):
   u=d.get('href',d.get('src',''))
   if u:self.links.append(u)
errors=[]
for file in root.rglob('*.html'):
 p=Check();p.feed(file.read_text())
 if p.h1!=1:errors.append(f'{file}: {p.h1} h1s')
 if not p.meta:errors.append(f'{file}: staging indexable')
 for u in p.links:
  x=urlsplit(u)
  if x.scheme or x.netloc:continue
  if not x.path and x.fragment:
   if x.fragment not in p.ids:errors.append(f'{file}: missing #{x.fragment}')
  elif x.path:
   dest=root/x.path.lstrip('/') if x.path.startswith('/') else file.parent/x.path
   if not dest.exists() and x.path not in ('/admin/',):errors.append(f'{file}: missing {u}')
for entry in json.loads((root/'search-index.json').read_text()):
 if not (root/entry['url'].lstrip('/')/'index.html').exists():errors.append('Missing search route '+entry['url'])
assert not errors,'\n'.join(errors)
print(f'PASS: {len(list(root.rglob("*.html")))} HTML documents; local links, assets, anchor IDs, one H1, noindex and search routes.')
