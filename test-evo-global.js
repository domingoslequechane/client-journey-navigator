const apikey = 'BXWlDFI5S3VubVswSHlgijVoCi0TQNYo'; // Global API Key
const baseUrl = 'https://evolution-go.onixagence.com';

fetch(`${baseUrl}/instance/fetchInstances`, {
  headers: { apikey }
})
.then(res => res.json())
.then(data => {
  console.log('--- FETCH INSTANCES ---');
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error(err));
