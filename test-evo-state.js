const instanceKey = 'WbPdJJnh9h72GHLNoPtizeoqSpd9eXgi';
const baseUrl = 'https://evolution-go.onixagence.com';

fetch(`${baseUrl}/connection/state`, {
    headers: { apikey: instanceKey }
})
.then(async res => {
  const text = await res.text();
  console.log('STATUS /connection/state:', res.status);
  console.log('BODY:', text);
})
.catch(err => console.error(err));
