const apikey = '4bD5rcAWt8fQRWL89A3uPlc5FWqRqMXQ';
const url = 'https://evolution-go.onixagence.com/instance/status';

fetch(url, {
  method: 'GET',
  headers: { apikey }
})
.then(async res => {
   const data = await res.json();
   console.log('--- RESPONSE path: /instance/status ---');
   console.log('Status Code:', res.status);
   console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error(err));
