import { writeFileSync } from 'node:fs';

const baseUrl = 'https://evolution-go.onixagence.com';

// Test getting phone number / owner info
const instanceKeys = {
  'KZo93uQqE99i': 'vr5Q2u5eKgw5d04ND1TxvJhRmO3E9cIm',
  'rCIbsSZ97yKn': 'fnSCm9OpNgJWC28Gigpob2ZRRkBztNzP',
};

const out = [];
function log(msg) { out.push(msg); }

async function tryEndpoint(label, url, key, method = 'GET') {
  try {
    const res = await fetch(url, { method, headers: { apikey: key, 'Content-Type': 'application/json' } });
    const text = await res.text();
    log(`[${label}] HTTP ${res.status}: ${text.substring(0, 2000)}`);
    return { status: res.status, text };
  } catch (e) {
    log(`[${label}] ERROR: ${e.message}`);
    return null;
  }
}

async function main() {
  for (const [instName, instKey] of Object.entries(instanceKeys)) {
    log(`\n=== Instance: ${instName} ===`);
    await tryEndpoint(`${instName} GET /instance/status`, `${baseUrl}/instance/status`, instKey);
    await tryEndpoint(`${instName} GET /instance/settings`, `${baseUrl}/instance/settings`, instKey);
    await tryEndpoint(`${instName} GET /instance/info`, `${baseUrl}/instance/info`, instKey);
    await tryEndpoint(`${instName} GET /instance/profile`, `${baseUrl}/instance/profile`, instKey);
    await tryEndpoint(`${instName} GET /instance/qr`, `${baseUrl}/instance/qr`, instKey);
    await tryEndpoint(`${instName} GET /chat/presence`, `${baseUrl}/chat/presence`, instKey);
  }
  
  writeFileSync('sync-debug-output2.txt', out.join('\n'), 'utf-8');
  console.log('Done. Check sync-debug-output2.txt');
}

main().catch(console.error);
