import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { renderShopPage, validateCatalogue } from '../lib/catalogue.mjs';

const shop = path.join(process.argv[2], 'sagola-shop');
const seed = JSON.parse(await readFile(new URL('../lib/catalogue-seed.json', import.meta.url), 'utf8'));
const products = validateCatalogue(seed).filter(product => product.published);
const template = await readFile(path.join(shop, 'index.html'), 'utf8');

await writeFile(path.join(shop, 'index.html'), renderShopPage(template, products));
for (const product of products) {
  const directory = path.join(shop, product.id);
  await mkdir(directory, {recursive: true});
  await writeFile(path.join(directory, 'index.html'), renderShopPage(template, products, product));
}

const catalogue = products.map(({bcItemId, onlineAllocation, ...product}) => ({...product, buyEnabled: false}));
await writeFile(path.join(shop, 'catalogue.json'), JSON.stringify({products: catalogue}));
