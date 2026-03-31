const instanceKey = '4bD5rcAWt8fQRWL89A3uPlc5FWqRqMXQ';
const baseUrl = 'https://evolution-go.onixagence.com';

fetch(`${baseUrl}/chat/profile`, {
    headers: { apikey: instanceKey }
})
.then(async res => {
  const text = await res.text();
  console.log('STATUS /chat/profile:', res.status);
  console.log('BODY:', text.substring(0, 1000));
})
.catch(err => console.error(err));
