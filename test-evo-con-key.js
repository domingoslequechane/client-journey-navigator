const instanceKey = '4bD5rcAWt8fQRWL89A3uPlc5FWqRqMXQ';
const instanceName = 'Ndj1tMK5uDjT';
const baseUrl = 'https://evolution-go.onixagence.com';

fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
    headers: { apikey: instanceKey }
})
.then(async res => {
  const text = await res.text();
  console.log('STATUS /instance/connectionState:', res.status);
  console.log('BODY:', text.substring(0, 1000));
})
.catch(err => console.error(err));
