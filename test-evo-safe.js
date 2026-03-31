const apikey = 'BXWlDFI5S3VubVswSHlgijVoCi0TQNYo';
const baseUrl = 'https://evolution-go.onixagence.com';

fetch(`${baseUrl}/instance/fetchInstances`, {
  headers: { apikey }
})
.then(async res => {
  const text = await res.text();
  console.log('--- FETCH INSTANCES (TEXT) ---');
  console.log('Status:', res.status);
  console.log(text.substring(0, 2000));
})
.catch(err => console.error(err));
