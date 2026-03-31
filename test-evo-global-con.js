const globalKey = 'BXWlDFI5S3VubVswSHlgijVoCi0TQNYo';
const instanceName = 'Ndj1tMK5uDjT';
const baseUrl = 'https://evolution-go.onixagence.com';

async function test() {
  console.log('--- TEST /instance/connectionState/${instanceName} (Global Key) ---');
  let res = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { headers: { apikey: globalKey } });
  console.log(JSON.stringify(await res.json(), null, 2));
}

test();
