const apikey = '4bD5rcAWt8fQRWL89A3uPlc5FWqRqMXQ';
const instanceName = 'Ndj1tMK5uDjT';
const baseUrl = 'https://evolution-go.onixagence.com';

async function test() {
  console.log('--- TEST /instance/status ---');
  let res = await fetch(`${baseUrl}/instance/status`, { headers: { apikey } });
  console.log(JSON.stringify(await res.json(), null, 2));

  console.log('\n--- TEST /instance/connectionState/${instanceName} ---');
  res = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { headers: { apikey } });
  console.log(JSON.stringify(await res.json(), null, 2));
}

test();
