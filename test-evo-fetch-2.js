const instanceKey = '4bD5rcAWt8fQRWL89A3uPlc5FWqRqMXQ';
const baseUrl = 'https://evolution-go.onixagence.com';

fetch(`${baseUrl}/instance/fetchInstance`, {
    headers: { apikey: instanceKey }
})
.then(async res => {
  const text = await res.text();
  console.log('STATUS /instance/fetchInstance (No Path):', res.status);
  console.log('BODY:', text.substring(0, 500));
})
.catch(err => console.error(err));
