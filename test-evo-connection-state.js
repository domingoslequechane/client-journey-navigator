const apikey = '4bD5rcAWt8fQRWL89A3uPlc5FWqRqMXQ';
const instanceName = 'Ndj1tMK5uDjT';
const baseUrl = 'https://evolution-go.onixagence.com';

fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
    headers: { apikey }
})
.then(res => res.json())
.then(data => {
  console.log('--- CONNECTION STATE ---');
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error(err));
