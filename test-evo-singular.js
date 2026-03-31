const globalKey = 'BXWlDFI5S3VubVswSHlgijVoCi0TQNYo';
const instanceName = 'Ndj1tMK5uDjT';
const baseUrl = 'https://evolution-go.onixagence.com';

fetch(`${baseUrl}/instance/fetchInstance/${instanceName}`, {
  headers: { apikey: globalKey }
})
.then(async res => {
  const text = await res.text();
  console.log('STATUS /instance/fetchInstance:', res.status);
  console.log('BODY:', text.substring(0, 500));
})
.catch(err => console.error(err));
