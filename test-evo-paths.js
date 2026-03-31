const instanceKey = 'WbPdJJnh9h72GHLNoPtizeoqSpd9eXgi';
const instanceName = 'lll';
const baseUrl = 'https://evolution-go.onixagence.com';

const paths = [
  `/instance/status/${instanceName}`,
  `/instance/fetch/${instanceName}`,
  `/instance/fetchInstance/${instanceName}`,
  `/instance/connectionState/${instanceName}`,
  `/instance/settings/${instanceName}`
];

async function run() {
  for (const path of paths) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { apikey: instanceKey }
      });
      const text = await res.text();
      console.log(`PATH: ${path} -> STATUS: ${res.status}`);
      if (res.status === 200) {
          console.log(`BODY: ${text}`);
      }
    } catch (err) {
      console.error(`ERROR on ${path}:`, err);
    }
  }
}

run();
