"""Generate the IIS document root from the maintained website."""
from html import escape
from pathlib import Path
import json
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
HOST = 'https://ngetu-original-v5-client-review.arkamandol.chatgpt.site'
PAGES = ROOT / '.generated/site'
OUTPUT = ROOT / '.generated/plesk'

def run(script):
    subprocess.run([sys.executable, str(ROOT / script)], check=True)

def hosted_page(route):
    target = escape(HOST + '/' + route + '/', quote=True)
    return f'''<!doctype html><html lang="en-ZA"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Continue to NGETU</title>
<script src="/continue.js" defer></script></head>
<body><p><a id="destination" href="{target}">Continue to NGETU</a></p></body></html>'''

run('build.py')
run('check.py')
if OUTPUT.exists():
    shutil.rmtree(OUTPUT)
shutil.copytree(PAGES, OUTPUT)
for page in OUTPUT.rglob('*.html'):
    html = page.read_text().replace('<html lang="en-ZA">', '<html lang="en-ZA" data-plesk>')
    html = re.sub(r'<button\b[^>]*\bdata-consent-open\b[^>]*>.*?</button>', '', html)
    page.write_text(html)

# Keep forms, identity, cookies, payment status and cart storage on one origin.
routes = ['review', 'admin', 'sagola-shop', 'checkout']
for product in json.loads((ROOT / 'lib/catalogue-seed.json').read_text()):
    routes.append('sagola-shop/' + product['id'])
for route in routes:
    path = OUTPUT / route / 'index.html'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(hosted_page(route))

(OUTPUT / 'continue.js').write_text("""const link = document.getElementById('destination');
const target = new URL(link.href);
target.search = location.search;
target.hash = location.hash;
link.href = target.href;
location.replace(target.href);
""")
for asset in ('admin.js', 'admin.css', 'shop.js', 'shop.css', 'checkout.js'):
    (OUTPUT / asset).unlink()
shutil.copyfile(ROOT / 'hosting/web.config', OUTPUT / 'web.config')
print('Plesk document root:', OUTPUT)
