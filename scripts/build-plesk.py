"""Generate the IIS document root from the maintained website."""
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / '.generated/site'
OUTPUT = ROOT / '.generated/plesk'

def run(script):
    subprocess.run([sys.executable, str(ROOT / script)], check=True)

run('build.py')
run('check.py')
if OUTPUT.exists():
    shutil.rmtree(OUTPUT)
shutil.copytree(PAGES, OUTPUT)
for page in OUTPUT.rglob('*.html'):
    html = page.read_text().replace('<html lang="en-ZA">', '<html lang="en-ZA" data-plesk>')
    html = re.sub(r'<button\b[^>]*\bdata-consent-open\b[^>]*>.*?</button>', '', html)
    html = html.replace('<a href="/admin/">Site management</a>', '')
    if page == OUTPUT / 'review/index.html':
        html = html.replace('<button class="btn" id="download-draft"', '<a class="btn" href="mailto:kenneth@ngetu.co.za?subject=Business%20review%20enquiry">Email Kenneth</a><button class="btn" id="download-draft"')
        html = html.replace('Download a copy for your records.', 'Download your draft and attach it to your email to Kenneth.')
    page.write_text(html)

subprocess.run(['node', str(ROOT / 'scripts/build-plesk-shop.mjs'), str(OUTPUT)], check=True)

# Replace the old staff redirect even when a ZIP is extracted over existing files.
admin = OUTPUT / 'admin'
admin.mkdir(exist_ok=True)
(admin / 'index.html').write_text((OUTPUT / '404.html').read_text())
for asset in ('admin.js', 'admin.css'):
    (OUTPUT / asset).unlink()
shutil.copyfile(ROOT / 'hosting/web.config', OUTPUT / 'web.config')
print('Plesk document root:', OUTPUT)
