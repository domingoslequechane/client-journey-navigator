const apikey = 'BXWlDFI5S3VubVswSHlgijVoCi0TQNYo';
const url = 'https://evolution-go.onixagence.com/instance/status';

fetch(url, {
  method: 'GET',
  headers: { apikey }
})
.then(res => res.json())
.then(data => {
  console.log('--- RESPONSE ---');
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error(err));
