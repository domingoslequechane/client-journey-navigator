const globalKey = 'BXWlDFI5S3VubVswSHlgijVoCi0TQNYo';
const baseUrl = 'https://evolution-go.onixagence.com';

fetch(`${baseUrl}/instance/all`, {
  headers: { apikey: globalKey }
})
.then(async res => {
  const text = await res.text();
  console.log('STATUS /instance/all:', res.status);
  console.log('BODY START:', text.substring(0, 500));
})
.catch(err => console.error(err));
