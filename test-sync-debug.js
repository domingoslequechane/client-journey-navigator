const fs = require('fs');
const globalKey = 'BXWlDFI5S3VubVswSHlgijVoCi0TQNYo';
const baseUrl = 'https://evolution-go.onixagence.com';

const instanceKeys = {
  'KZo93uQqE99i': 'vr5Q2u5eKgw5d04ND1TxvJhRmO3E9cIm',
  'rCIbsSZ97yKn': 'fnSCm9OpNgJWC28Gigpob2ZRRkBztNzP',
};

const out = [];
function log(msg) { out.push(msg); }

async function tryEndpoint(label, url, key) {
  try {
    const res = await fetch(url, { headers: { apikey: key } });
    const text = await res.text();
    log(`[${label}] HTTP ${res.status}: ${text.substring(0, 1500)}`);
    return { status: res.status, text };
  } catch (e) {
    log(`[${label}] ERROR: ${e.message}`);
    return null;
  }
}

async function main() {
  log('=== 1) /instance/all with GLOBAL key ===');
  await tryEndpoint('GLOBAL-all', `${baseUrl}/instance/all`, globalKey);

  log('\n=== 2) /instance/fetchInstances with GLOBAL key ===');
  await tryEndpoint('GLOBAL-fetch', `${baseUrl}/instance/fetchInstances`, globalKey);

  for (const [instName, instKey] of Object.entries(instanceKeys)) {
    log(`\n=== Instance: ${instName} ===`);
    await tryEndpoint(`${instName}-status`, `${baseUrl}/instance/status`, instKey);
    await tryEndpoint(`${instName}-connState`, `${baseUrl}/instance/connectionState`, instKey);
    await tryEndpoint(`${instName}-me`, `${baseUrl}/instance/me`, instKey);
  }

  log('\n=== 3) /instance/all with INSTANCE keys ===');
  for (const [instName, instKey] of Object.entries(instanceKeys)) {
    await tryEndpoint(`${instName}-all`, `${baseUrl}/instance/all`, instKey);
  }
  
  fs.writeFileSync('sync-debug-output.txt', out.join('\n'), 'utf-8');
  console.log('Done. Output written to sync-debug-output.txt');
}

main().catch(console.error);
