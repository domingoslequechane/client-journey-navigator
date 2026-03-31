const instanceKey = '4bD5rcAWt8fQRWL89A3uPlc5FWqRqMXQ';
const instanceName = 'Ndj1tMK5uDjT';
const baseUrl = 'https://evolution-go.onixagence.com';

fetch(`${baseUrl}/instance/fetchInstance/${instanceName}`, {
    headers: { apikey: instanceKey }
})
.then(async res => {
  const text = await res.text();
  console.log('STATUS /instance/fetchInstance:', res.status);
  console.log('BODY:', text.substring(0, 500));
})
.catch(err => console.error(err));
