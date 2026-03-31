const globalKey = 'BXWlDFI5S3VubVswSHlgijVoCi0TQNYo';
const baseUrl = 'https://evolution-go.onixagence.com';

const endpoints = [
  '/instance/fetchInstances',
  '/instance/fetchInstances?all=true',
  '/instance/all',
  '/instance/list',
  '/instance/fetchInstances?owner=true'
];

async function run() {
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        headers: { apikey: globalKey }
      });
      const text = await res.text();
      console.log(`ENDPOINT: ${endpoint} -> STATUS: ${res.status}`);
      if (res.status === 200) {
          console.log(`BODY: ${text.substring(0, 1000)}`);
      }
    } catch (err) {
      console.error(`ERROR on ${endpoint}:`, err);
    }
  }
}

run();
