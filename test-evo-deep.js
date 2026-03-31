const globalKey = 'BXWlDFI5S3VubVswSHlgijVoCi0TQNYo';
const baseUrl = 'https://evolution-go.onixagence.com';

fetch(`${baseUrl}/instance/fetchInstances`, {
  headers: { apikey: globalKey }
})
.then(async res => {
  const text = await res.text();
  console.log('STATUS:', res.status);
  console.log('BODY START:', text.substring(0, 500));
  try {
     const data = JSON.parse(text);
     const joana = data.find(i => i.instanceName === 'Ndj1tMK5uDjT' || i.name === 'Joana' || i.instanceId === '3bad495e-51a8-4f14-b155-d36b18f6a7d8');
     console.log('JOANA DATA FOUND:', JSON.stringify(joana, null, 2));
  } catch(e) {
     console.log('NOT JSON');
  }
})
.catch(err => console.error(err));
