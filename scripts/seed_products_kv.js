// Utility script to upload products JSON into a Cloudflare KV namespace.
// Reads data/products.json and stores it under the PRODUCTS key.
// Requires CF_API_TOKEN, CF_ACCOUNT_ID and KV_NAMESPACE_ID env vars.

if (typeof fetch !== 'function') {
  try {
    global.fetch = (...args) =>
      import('node-fetch').then(({ default: fetch }) => fetch(...args));
  } catch (err) {
    console.error('Fetch API not available. Use Node 18+ or install node-fetch.');
    process.exit(1);
  }
}

const { CF_API_TOKEN, CF_ACCOUNT_ID, KV_NAMESPACE_ID } = process.env;

if (!CF_API_TOKEN || !CF_ACCOUNT_ID || !KV_NAMESPACE_ID) {
  console.error('Missing CF_API_TOKEN, CF_ACCOUNT_ID or KV_NAMESPACE_ID');
  process.exit(1);
}

import { readFileSync } from 'fs';

const productsPath = new URL('../data/products.json', import.meta.url);
let products;
try {
  products = readFileSync(productsPath, 'utf8');
} catch (err) {
  console.error('Unable to read products.json:', err);
  process.exit(1);
}

async function put(key, value) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` },
    body: value,
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Failed to set ${key}: ${JSON.stringify(data.errors)}`);
  console.log(`Set ${key}`);
}

put('PRODUCTS', products).catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
